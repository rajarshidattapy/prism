import { Action, HandlerCallback, IAgentRuntime, Memory, Plugin, State } from "@elizaos/core";
import { web3, AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

// ── Inline IDL (mirrors anchor/programs/prism_markets/lib.rs) ─────────────────

const PRISM_IDL: Idl = {
  version: "0.1.0",
  name: "prism_markets",
  instructions: [
    {
      name: "initializeMarket",
      accounts: [
        { name: "market", isMut: true, isSigner: false },
        { name: "creator", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "marketId", type: "string" },
        { name: "question", type: "string" },
        { name: "resolutionTimestamp", type: "i64" },
        { name: "initialYesOdds", type: "u64" },
      ],
    },
    {
      name: "seedSimulationResult",
      accounts: [
        { name: "market", isMut: true, isSigner: false },
        { name: "creator", isMut: false, isSigner: true },
      ],
      args: [
        { name: "simulationHash", type: { array: ["u8", 32] } },
        { name: "yesProbability", type: "u64" },
      ],
    },
    {
      name: "buyShares",
      accounts: [
        { name: "market", isMut: true, isSigner: false },
        { name: "position", isMut: true, isSigner: false },
        { name: "buyer", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "outcome", type: "bool" },
        { name: "amount", type: "u64" },
      ],
    },
  ],
} as unknown as Idl;

// ── MiroFish oracle caller ────────────────────────────────────────────────────

interface OracleResult {
  question: string;
  yes_probability: number;
  yes_basis_points: number;
  no_basis_points: number;
  simulation_hash: string;
  hash_bytes: number[];
  simulation_id: string;
  platform: string;
  timestamp: number;
}

async function runPrismOracle(
  question: string,
  context: string,
  graphId?: string,
): Promise<OracleResult> {
  const oracleScript = path.resolve("../backend/simulation/scripts/prism_oracle.py");

  const args = [
    oracleScript,
    "--question", question,
    "--context", context || "",
    "--platform", "reddit",
    "--rounds", "5",
  ];

  if (graphId) {
    args.push("--graph-id", graphId);
  } else {
    args.push("--fallback");
  }

  try {
    const { stdout } = await execFileAsync("python", args, {
      timeout: 600_000,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    const jsonMatch = stdout.match(/\{[\s\S]*\}(?![\s\S]*\{)/);
    if (!jsonMatch) throw new Error("Oracle script did not return valid JSON");
    return JSON.parse(jsonMatch[0]) as OracleResult;
  } catch (err: any) {
    throw new Error(`MiroFish oracle failed: ${err.message}`);
  }
}

// ── Solana helpers ────────────────────────────────────────────────────────────

function getConnection(runtime: IAgentRuntime) {
  const rpc = runtime.getSetting("SOLANA_RPC_URL") ?? "https://api.devnet.solana.com";
  return new Connection(rpc, "confirmed");
}

function getKeypair(runtime: IAgentRuntime): Keypair {
  const pk = runtime.getSetting("SOLANA_PRIVATE_KEY");
  if (!pk) throw new Error("SOLANA_PRIVATE_KEY not configured");
  return Keypair.fromSecretKey(bs58.decode(pk));
}

function getProgramId(runtime: IAgentRuntime): PublicKey {
  const id = runtime.getSetting("PRISM_PROGRAM_ID") ?? "PRiSMVzV9vV1GqSsGaijT9tCGANWGFCj9yXv5x8vFJ3";
  return new PublicKey(id);
}

function makeWallet(keypair: Keypair) {
  return {
    publicKey: keypair.publicKey,
    signTransaction: async <T extends web3.Transaction | web3.VersionedTransaction>(tx: T): Promise<T> => {
      if (tx instanceof web3.Transaction) tx.sign(keypair);
      return tx;
    },
    signAllTransactions: async <T extends web3.Transaction | web3.VersionedTransaction>(txs: T[]): Promise<T[]> => {
      return txs.map((tx) => {
        if (tx instanceof web3.Transaction) tx.sign(keypair);
        return tx;
      });
    },
  };
}

async function isProgramDeployed(connection: Connection, programId: PublicKey): Promise<boolean> {
  const info = await connection.getAccountInfo(programId);
  return info !== null && info.executable;
}

// ── Intent parsing ────────────────────────────────────────────────────────────

interface ParsedIntent {
  question: string;
  durationHours: number;
  initialOdds: number;
}

function parseCreateIntent(text: string): ParsedIntent {
  const quoted = text.match(/[""]([^""]+)[""]/);
  const question = quoted ? quoted[1] : text.replace(/prism\s+create/i, "").trim();

  const hoursMatch = text.match(/(\d+)\s*h(?:our)?s?/i);
  const daysMatch = text.match(/(\d+)\s*days?/i);
  const durationHours = hoursMatch
    ? parseInt(hoursMatch[1])
    : daysMatch
    ? parseInt(daysMatch[1]) * 24
    : 48;

  const oddsMatch = text.match(/(\d+)%/);
  const initialOdds = oddsMatch ? parseInt(oddsMatch[1]) * 100 : 5000;

  return { question, durationHours, initialOdds };
}

// ── Actions ───────────────────────────────────────────────────────────────────

const createMarketAction: Action = {
  name: "PRISM_CREATE_MARKET",
  description: 'Parse a "prism create" natural language command and deploy an Anchor market PDA on Solana',
  similes: ["prism create", "create market", "launch market", "new market", "deploy market"],
  examples: [
    [
      {
        user: "operator",
        content: { text: 'prism create "Will ETH sentiment match OASIS 62% bullish within 48h?"' },
      },
      {
        user: "PRISM",
        content: {
          text: "Parsed intent. Deploying market PDA on Solana devnet. Dispatching MiroFish simulation to Nosana...",
        },
      },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() ?? "";
    return text.includes("prism create") || text.includes("create market") || text.includes("launch market");
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const text = message.content.text ?? "";
    const intent = parseCreateIntent(text);
    const graphId = runtime.getSetting("MIROFISH_GRAPH_ID") ?? "";

    await callback({
      text: [
        `[PRISM] Parsed intent:`,
        `• Question: "${intent.question}"`,
        `• Duration: ${intent.durationHours}h`,
        ``,
        `[MiroFish] Dispatching OASIS simulation${graphId ? " (live LLM agents)" : " (statistical fallback)"}...`,
        `This may take 1–10 minutes depending on agent count and rounds.`,
      ].join("\n"),
    });

    // ── Step 1: Run MiroFish oracle ──────────────────────────────────────────
    let oracle: OracleResult | null = null;
    try {
      oracle = await runPrismOracle(intent.question, text, graphId || undefined);

      await callback({
        text: [
          `[MiroFish] Simulation complete:`,
          `• Simulation ID : ${oracle.simulation_id}`,
          `• Platform      : ${oracle.platform}`,
          `• YES probability: ${(oracle.yes_probability * 100).toFixed(1)}% (${oracle.yes_basis_points} bps)`,
          `• NO probability : ${(100 - oracle.yes_probability * 100).toFixed(1)}% (${oracle.no_basis_points} bps)`,
          `• SHA-256 hash   : ${oracle.simulation_hash.slice(0, 16)}...`,
          ``,
          `Seeding market with MiroFish attestation...`,
        ].join("\n"),
        content: { oracle },
      });
    } catch (err: any) {
      await callback({
        text: `[MiroFish] Oracle error: ${err.message}\nContinuing with default 50/50 odds.`,
      });
    }

    const yesBps = oracle?.yes_basis_points ?? 5000;
    const simulationHash = oracle?.simulation_hash ?? "0".repeat(64);

    // ── Step 2: Derive PDA + write to chain ───────────────────────────────────
    try {
      const connection = getConnection(runtime);
      const keypair = getKeypair(runtime);
      const programId = getProgramId(runtime);

      const marketId = `prism-${Date.now()}`;
      const resolutionTs = Math.floor(Date.now() / 1000) + intent.durationHours * 3600;

      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(marketId)],
        programId
      );

      const deployed = await isProgramDeployed(connection, programId);

      if (!deployed) {
        await callback({
          text: [
            `[PRISM] Market PDA derived (program not yet deployed):`,
            `• PDA        : ${marketPda.toBase58()}`,
            `• Question   : "${intent.question}"`,
            `• Resolution : ${new Date(resolutionTs * 1000).toISOString()}`,
            `• MiroFish odds: YES ${(yesBps / 100).toFixed(1)}% / NO ${((10000 - yesBps) / 100).toFixed(1)}%`,
            `• Attestation: ${simulationHash.slice(0, 16)}...`,
            ``,
            `To write on-chain:`,
            `  cd anchor && anchor build && anchor deploy`,
            `  Then retry: prism create "${intent.question}"`,
          ].join("\n"),
          action: "PRISM_CREATE_MARKET",
          content: {
            marketPda: marketPda.toBase58(),
            marketId,
            question: intent.question,
            resolutionTs,
            yesBps,
            simulationHash,
            oracle,
            onChain: false,
          },
        });
        return;
      }

      // Program is deployed — send initialize_market transaction
      const wallet = makeWallet(keypair);
      const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
      const program = new Program(PRISM_IDL, programId, provider);

      await callback({ text: `[PRISM] Program deployed. Sending initialize_market transaction...` });

      const txSig = await (program.methods as any)
        .initializeMarket(marketId, intent.question, new BN(resolutionTs), new BN(yesBps))
        .accounts({
          market: marketPda,
          creator: keypair.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([keypair])
        .rpc();

      await callback({
        text: [
          `[PRISM] Market deployed on-chain:`,
          `• Tx signature : ${txSig}`,
          `• PDA          : ${marketPda.toBase58()}`,
          `• Question     : "${intent.question}"`,
          `• Resolution   : ${new Date(resolutionTs * 1000).toISOString()}`,
          `• Initial odds : YES ${(yesBps / 100).toFixed(1)}% / NO ${((10000 - yesBps) / 100).toFixed(1)}%`,
        ].join("\n"),
      });

      // Seed simulation hash on-chain if we have oracle data
      if (oracle?.hash_bytes) {
        const hashArr = new Array(32).fill(0);
        oracle.hash_bytes.slice(0, 32).forEach((b, i) => { hashArr[i] = b; });

        const seedTx = await (program.methods as any)
          .seedSimulationResult(hashArr, new BN(yesBps))
          .accounts({ market: marketPda, creator: keypair.publicKey })
          .signers([keypair])
          .rpc();

        await callback({
          text: [
            `[PRISM] Simulation attestation seeded on-chain:`,
            `• Tx : ${seedTx}`,
            `• SHA-256: ${simulationHash}`,
          ].join("\n"),
          action: "PRISM_CREATE_MARKET",
          content: {
            marketPda: marketPda.toBase58(),
            marketId,
            question: intent.question,
            resolutionTs,
            yesBps,
            simulationHash,
            oracle,
            txSig,
            seedTx,
            onChain: true,
          },
        });
      }
    } catch (err: any) {
      await callback({
        text: `[PRISM] Solana error: ${err.message}\nEnsure SOLANA_PRIVATE_KEY and PRISM_PROGRAM_ID are set.`,
      });
    }
  },
};

const buySharesAction: Action = {
  name: "PRISM_BUY_SHARES",
  description: "Buy YES or NO shares on a PRISM market",
  similes: ["buy yes", "buy no", "place trade", "trade on market"],
  examples: [],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() ?? "";
    return text.includes("buy") && (text.includes("yes") || text.includes("no"));
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const text = message.content.text ?? "";
    const isYes = text.toLowerCase().includes("yes");
    const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:sol|lamports?)?/i);
    const amountSol = amountMatch ? parseFloat(amountMatch[1]) : 0.1;
    const amountLamports = Math.round(amountSol * 1e9);

    // Expect market PDA in message: "buy YES on <pda>"
    const pdaMatch = text.match(/on\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
    if (!pdaMatch) {
      await callback({
        text: `[PRISM] Specify market PDA: buy YES on <PDA> 0.1 SOL`,
      });
      return;
    }

    try {
      const connection = getConnection(runtime);
      const keypair = getKeypair(runtime);
      const programId = getProgramId(runtime);
      const marketPda = new PublicKey(pdaMatch[1]);

      const [positionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), keypair.publicKey.toBuffer(), marketPda.toBuffer()],
        programId
      );

      const deployed = await isProgramDeployed(connection, programId);
      if (!deployed) {
        await callback({
          text: [
            `[PRISM] Buy order staged (program not deployed):`,
            `• Market   : ${marketPda.toBase58()}`,
            `• Outcome  : ${isYes ? "YES" : "NO"}`,
            `• Amount   : ${amountSol} SOL (${amountLamports} lamports)`,
            ``,
            `Deploy anchor program first: cd anchor && anchor build && anchor deploy`,
          ].join("\n"),
          action: "PRISM_BUY_SHARES",
          content: { marketPda: marketPda.toBase58(), isYes, amountSol, onChain: false },
        });
        return;
      }

      const wallet = makeWallet(keypair);
      const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
      const program = new Program(PRISM_IDL, programId, provider);

      const txSig = await (program.methods as any)
        .buyShares(isYes, new BN(amountLamports))
        .accounts({
          market: marketPda,
          position: positionPda,
          buyer: keypair.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([keypair])
        .rpc();

      await callback({
        text: [
          `[PRISM] Shares purchased on-chain:`,
          `• Tx       : ${txSig}`,
          `• Market   : ${marketPda.toBase58()}`,
          `• Outcome  : ${isYes ? "YES" : "NO"}`,
          `• Amount   : ${amountSol} SOL`,
        ].join("\n"),
        action: "PRISM_BUY_SHARES",
        content: { marketPda: marketPda.toBase58(), isYes, amountSol, txSig, onChain: true },
      });
    } catch (err: any) {
      await callback({
        text: `[PRISM] Solana error: ${err.message}`,
      });
    }
  },
};

// ── Plugin Export ─────────────────────────────────────────────────────────────

export const pluginPrism: Plugin = {
  name: "plugin-prism",
  description: "Natural language parser for PRISM market creation and trading on Solana",
  actions: [createMarketAction, buySharesAction],
  evaluators: [],
  providers: [],
};
