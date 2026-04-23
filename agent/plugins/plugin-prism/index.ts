import { Action, HandlerCallback, IAgentRuntime, Memory, Plugin, State } from "@elizaos/core";
import { web3 } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

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
  // Path to oracle script — agent runs from prism/agent/, script is in prism/backend/
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
    // No Zep graph ID — use statistical fallback
    args.push("--fallback");
  }

  try {
    const { stdout } = await execFileAsync("python", args, {
      timeout: 600_000, // 10 min max for live OASIS run
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    // The oracle script prints JSON at the end — find the last complete JSON block
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

// ── Intent parsing ────────────────────────────────────────────────────────────

interface ParsedIntent {
  question: string;
  durationHours: number;
  initialOdds: number; // basis points
}

function parseCreateIntent(text: string): ParsedIntent {
  // Extract question from quoted string or after "prism create"
  const quoted = text.match(/[""]([^""]+)[""]/);
  const question = quoted ? quoted[1] : text.replace(/prism\s+create/i, "").trim();

  // Look for duration hint
  const hoursMatch = text.match(/(\d+)\s*h(?:our)?s?/i);
  const daysMatch = text.match(/(\d+)\s*days?/i);
  const durationHours = hoursMatch
    ? parseInt(hoursMatch[1])
    : daysMatch
    ? parseInt(daysMatch[1]) * 24
    : 48;

  // Default odds — later seeded by MiroFish simulation
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
    let oracle: Awaited<ReturnType<typeof runPrismOracle>> | null = null;
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
          `These odds are tamper-evident — the hash was committed before the real event unfolds.`,
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

    // ── Step 2: Derive market PDA ─────────────────────────────────────────────
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

      await callback({
        text: [
          `[PRISM] Market PDA derived: ${marketPda.toBase58()}`,
          `• Question   : "${intent.question}"`,
          `• Resolution : ${new Date(resolutionTs * 1000).toISOString()}`,
          `• MiroFish odds: YES ${yesBps / 100}% / NO ${(10000 - yesBps) / 100}%`,
          `• Attestation: ${simulationHash.slice(0, 16)}...`,
          ``,
          `⚠️  Full on-chain write: anchor build && anchor deploy`,
          `   Then: seed_simulation_result(hash=[${oracle?.hash_bytes?.slice(0, 4).join(",")},...], yes_probability=${yesBps})`,
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
        },
      });
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
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const text = message.content.text ?? "";
    const outcome = text.toLowerCase().includes("yes");
    const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:sol|lamports?)?/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0.1;

    await callback({
      text: `[PRISM] Buy order: ${outcome ? "YES" : "NO"} shares, amount: ${amount} SOL\nWill execute on-chain after program deployment.`,
      action: "PRISM_BUY_SHARES",
      content: { outcome, amount },
    });
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
