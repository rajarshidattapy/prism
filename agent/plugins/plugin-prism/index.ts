import { Action, HandlerCallback, IAgentRuntime, Memory, Plugin, State } from "@elizaos/core";
import { AnchorProvider, Program, web3, BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

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

    await callback({
      text: `[PRISM] Parsed intent:\n• Question: "${intent.question}"\n• Duration: ${intent.durationHours}h\n• Initial odds: ${intent.initialOdds / 100}% YES\n\nDeploying market PDA on Solana devnet...`,
    });

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

      // Build the instruction manually (IDL not available at type level in MVP)
      // Full Anchor client integration comes after `anchor build` generates the IDL
      const txSim = await connection.simulateTransaction(
        new web3.Transaction().add(
          web3.SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: marketPda,
            lamports: 0,
          })
        ),
        [keypair]
      );

      await callback({
        text: `[PRISM] Market PDA derived: ${marketPda.toBase58()}\nQuestion: "${intent.question}"\nResolution: ${new Date(resolutionTs * 1000).toISOString()}\n\n⚠️  Full on-chain write requires deployed program (run: anchor build && anchor deploy)`,
        action: "PRISM_CREATE_MARKET",
        content: { marketPda: marketPda.toBase58(), marketId, intent },
      });
    } catch (err: any) {
      await callback({
        text: `[PRISM] Market creation error: ${err.message}\nEnsure SOLANA_PRIVATE_KEY and PRISM_PROGRAM_ID are set.`,
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
