import { Action, HandlerCallback, IAgentRuntime, Memory, Plugin, State } from "@elizaos/core";
import { Connection, PublicKey } from "@solana/web3.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SentimentSample {
  source: "twitter" | "reddit" | "farcaster";
  score: number; // -1 to 1
  sampleSize: number;
}

interface OracleConsensus {
  aggregatedScore: number;   // -1 to 1
  basisPoints: number;       // 0–10000 (YES probability)
  samples: SentimentSample[];
  confidence: number;        // 0–1
}

// ── Sentiment scrapers (stubbed for MVP, real in prod) ─────────────────────

async function scrapeTwitterSentiment(topic: string): Promise<SentimentSample> {
  // In production: use Twitter Bearer token to search recent tweets, run NLP
  // MVP: return a mock score that simulates real variance
  const mockScore = (Math.random() * 2 - 1) * 0.6; // -0.6 to +0.6
  return { source: "twitter", score: mockScore, sampleSize: 500 };
}

async function scrapeRedditSentiment(topic: string): Promise<SentimentSample> {
  const mockScore = (Math.random() * 2 - 1) * 0.4;
  return { source: "reddit", score: mockScore, sampleSize: 200 };
}

async function scrapeFarcasterSentiment(topic: string): Promise<SentimentSample> {
  const mockScore = (Math.random() * 2 - 1) * 0.3;
  return { source: "farcaster", score: mockScore, sampleSize: 80 };
}

// ── Consensus aggregation ─────────────────────────────────────────────────────

function aggregateConsensus(samples: SentimentSample[]): OracleConsensus {
  const weights = { twitter: 0.5, reddit: 0.3, farcaster: 0.2 };
  let weightedSum = 0;
  let totalWeight = 0;

  for (const s of samples) {
    const w = weights[s.source];
    weightedSum += s.score * w;
    totalWeight += w;
  }

  const aggregatedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  // Map score [-1, 1] → basis points [0, 10000]
  const basisPoints = Math.round(((aggregatedScore + 1) / 2) * 10000);

  const variance =
    samples.reduce((acc, s) => acc + Math.pow(s.score - aggregatedScore, 2), 0) / samples.length;
  const confidence = Math.max(0, 1 - Math.sqrt(variance));

  return { aggregatedScore, basisPoints, samples, confidence };
}

// ── Actions ───────────────────────────────────────────────────────────────────

const runOracleConsensusAction: Action = {
  name: "SWITCHBOARD_ORACLE_CONSENSUS",
  description: "Run multi-source NLP sentiment analysis to determine market resolution outcome",
  similes: ["oracle consensus", "sentiment oracle", "resolve market", "check sentiment", "run oracle"],
  examples: [
    [
      { user: "operator", content: { text: "Run oracle consensus on ETH sentiment market" } },
      {
        user: "PRISM",
        content: { text: "Scraping Twitter, Reddit, Farcaster for ETH sentiment..." },
      },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() ?? "";
    return text.includes("oracle") || text.includes("sentiment") || text.includes("resolve");
  },
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const topic = message.content.text?.replace(/oracle|consensus|sentiment|resolve|run/gi, "").trim() ?? "crypto";

    await callback({ text: `[Switchboard] Scraping sentiment for topic: "${topic}"...` });

    const [twitter, reddit, farcaster] = await Promise.all([
      scrapeTwitterSentiment(topic),
      scrapeRedditSentiment(topic),
      scrapeFarcasterSentiment(topic),
    ]);

    const consensus = aggregateConsensus([twitter, reddit, farcaster]);

    const outcome = consensus.basisPoints >= 5000 ? "YES" : "NO";
    const confidence = (consensus.confidence * 100).toFixed(1);

    await callback({
      text: [
        `[Switchboard] Oracle consensus complete for "${topic}":`,
        `• Twitter (n=${twitter.sampleSize}): ${(twitter.score * 100).toFixed(1)}% sentiment`,
        `• Reddit  (n=${reddit.sampleSize}): ${(reddit.score * 100).toFixed(1)}% sentiment`,
        `• Farcaster (n=${farcaster.sampleSize}): ${(farcaster.score * 100).toFixed(1)}% sentiment`,
        ``,
        `Aggregated YES probability: ${(consensus.basisPoints / 100).toFixed(1)}%`,
        `Confidence: ${confidence}%`,
        `Recommended resolution: ${outcome}`,
      ].join("\n"),
      action: "SWITCHBOARD_ORACLE_CONSENSUS",
      content: { consensus, outcome },
    });
  },
};

// ── Plugin Export ─────────────────────────────────────────────────────────────

export const pluginSwitchboard: Plugin = {
  name: "plugin-switchboard",
  description: "Multi-agent NLP consensus oracle for PRISM market resolution via Switchboard V3",
  actions: [runOracleConsensusAction],
  evaluators: [],
  providers: [],
};
