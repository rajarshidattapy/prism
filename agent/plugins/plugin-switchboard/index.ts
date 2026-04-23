import { Action, HandlerCallback, IAgentRuntime, Memory, Plugin, State } from "@elizaos/core";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SentimentSample {
  source: "reddit" | "farcaster" | "twitter";
  score: number; // -1 to 1
  sampleSize: number;
  available: boolean;
}

interface OracleConsensus {
  aggregatedScore: number;
  basisPoints: number;
  samples: SentimentSample[];
  confidence: number;
}

// ── Keyword sentiment scorer ───────────────────────────────────────────────────

const POSITIVE = new Set(["bull", "bullish", "moon", "pump", "surge", "rally", "up", "gain", "win",
  "approve", "approved", "good", "great", "positive", "buy", "long", "boom", "high", "rise",
  "rising", "green", "profit", "ath", "breakout", "adoption", "mainstream", "etf", "launch"]);

const NEGATIVE = new Set(["bear", "bearish", "dump", "crash", "down", "loss", "lose", "fail",
  "ban", "banned", "bad", "negative", "sell", "short", "bust", "low", "fall", "falling",
  "red", "scam", "hack", "rug", "regulation", "crackdown", "tax", "fear", "panic", "dip"]);

function scoreText(text: string): number {
  const words = text.toLowerCase().split(/\W+/);
  let pos = 0, neg = 0;
  for (const w of words) {
    if (POSITIVE.has(w)) pos++;
    if (NEGATIVE.has(w)) neg++;
  }
  const total = pos + neg;
  return total === 0 ? 0 : (pos - neg) / total;
}

// ── Real Reddit scraper (public JSON API, no auth required) ───────────────────

async function scrapeRedditSentiment(topic: string): Promise<SentimentSample> {
  try {
    const query = encodeURIComponent(topic);
    const url = `https://www.reddit.com/search.json?q=${query}&sort=hot&limit=25&t=day`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PRISM-Oracle/1.0" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`Reddit HTTP ${res.status}`);
    const data = await res.json();

    const posts: any[] = data?.data?.children ?? [];
    if (posts.length === 0) return { source: "reddit", score: 0, sampleSize: 0, available: true };

    const scores = posts.map((p: any) => scoreText(
      `${p.data?.title ?? ""} ${p.data?.selftext ?? ""}`
    ));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { source: "reddit", score: avg, sampleSize: posts.length, available: true };
  } catch {
    return { source: "reddit", score: 0, sampleSize: 0, available: false };
  }
}

// ── Farcaster (Warpcast public search, no auth required) ──────────────────────

async function scrapeFarcasterSentiment(topic: string): Promise<SentimentSample> {
  try {
    const query = encodeURIComponent(topic);
    const url = `https://searchcaster.xyz/api/search?text=${query}&count=20`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });

    if (!res.ok) throw new Error(`Farcaster HTTP ${res.status}`);
    const data = await res.json();

    const casts: any[] = data?.casts ?? [];
    if (casts.length === 0) return { source: "farcaster", score: 0, sampleSize: 0, available: true };

    const scores = casts.map((c: any) => scoreText(c.body?.data?.text ?? ""));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { source: "farcaster", score: avg, sampleSize: casts.length, available: true };
  } catch {
    return { source: "farcaster", score: 0, sampleSize: 0, available: false };
  }
}

// Twitter requires a Bearer token — check env and skip gracefully if absent
async function scrapeTwitterSentiment(topic: string, bearerToken?: string): Promise<SentimentSample> {
  if (!bearerToken) {
    return { source: "twitter", score: 0, sampleSize: 0, available: false };
  }
  try {
    const query = encodeURIComponent(`${topic} lang:en -is:retweet`);
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=25`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`Twitter HTTP ${res.status}`);
    const data = await res.json();

    const tweets: any[] = data?.data ?? [];
    if (tweets.length === 0) return { source: "twitter", score: 0, sampleSize: 0, available: true };

    const scores = tweets.map((t: any) => scoreText(t.text ?? ""));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { source: "twitter", score: avg, sampleSize: tweets.length, available: true };
  } catch {
    return { source: "twitter", score: 0, sampleSize: 0, available: false };
  }
}

// ── Weighted consensus aggregation ───────────────────────────────────────────

function aggregateConsensus(samples: SentimentSample[]): OracleConsensus {
  const weights: Record<string, number> = { twitter: 0.5, reddit: 0.35, farcaster: 0.15 };
  let weightedSum = 0;
  let totalWeight = 0;

  for (const s of samples) {
    if (!s.available || s.sampleSize === 0) continue;
    const w = weights[s.source] ?? 0.1;
    weightedSum += s.score * w;
    totalWeight += w;
  }

  const aggregatedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const basisPoints = Math.round(((aggregatedScore + 1) / 2) * 10000);

  const activeSamples = samples.filter((s) => s.available && s.sampleSize > 0);
  const variance = activeSamples.length > 0
    ? activeSamples.reduce((acc, s) => acc + Math.pow(s.score - aggregatedScore, 2), 0) / activeSamples.length
    : 1;
  const confidence = Math.max(0, 1 - Math.sqrt(variance));

  return { aggregatedScore, basisPoints, samples, confidence };
}

// ── Action ────────────────────────────────────────────────────────────────────

const runOracleConsensusAction: Action = {
  name: "SWITCHBOARD_ORACLE_CONSENSUS",
  description: "Run multi-source NLP sentiment analysis (Reddit + Farcaster + Twitter) to determine market resolution",
  similes: ["oracle consensus", "sentiment oracle", "resolve market", "check sentiment", "run oracle", "prism oracle"],
  examples: [
    [
      { user: "operator", content: { text: "prism oracle ETH sentiment market" } },
      { user: "PRISM", content: { text: "Scraping Reddit and Farcaster for ETH sentiment..." } },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() ?? "";
    return text.includes("oracle") || text.includes("sentiment") || text.includes("resolve") ||
           (text.includes("prism") && text.includes("oracle"));
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const topic = message.content.text
      ?.replace(/prism\s+oracle|oracle|consensus|sentiment|resolve|run/gi, "")
      .trim() || "crypto";

    const bearerToken = runtime.getSetting("TWITTER_BEARER_TOKEN") ?? undefined;

    await callback({
      text: `[Switchboard] Fetching real sentiment for "${topic}" from Reddit${bearerToken ? ", Twitter" : ""}, Farcaster...`,
    });

    const [reddit, farcaster, twitter] = await Promise.all([
      scrapeRedditSentiment(topic),
      scrapeFarcasterSentiment(topic),
      scrapeTwitterSentiment(topic, bearerToken),
    ]);

    const samples = [reddit, farcaster, twitter];
    const consensus = aggregateConsensus(samples);
    const outcome = consensus.basisPoints >= 5000 ? "YES" : "NO";

    const sourceLines = samples
      .map((s) => {
        if (!s.available) return `• ${s.source.padEnd(10)} UNAVAILABLE (no API key or timeout)`;
        if (s.sampleSize === 0) return `• ${s.source.padEnd(10)} no results for this query`;
        return `• ${s.source.padEnd(10)} n=${s.sampleSize}  score=${(s.score * 100).toFixed(1)}%`;
      });

    await callback({
      text: [
        `[Switchboard] Real sentiment oracle complete for "${topic}":`,
        ...sourceLines,
        ``,
        `Aggregated YES probability : ${(consensus.basisPoints / 100).toFixed(1)}%  (${consensus.basisPoints} bps)`,
        `Confidence                 : ${(consensus.confidence * 100).toFixed(1)}%`,
        `Recommended resolution     : ${outcome}`,
        ``,
        consensus.basisPoints === 5000 && samples.every((s) => !s.available || s.sampleSize === 0)
          ? `⚠ No data sources returned results — confidence is zero. Add TWITTER_BEARER_TOKEN for better coverage.`
          : `Data sources: ${samples.filter((s) => s.available && s.sampleSize > 0).map((s) => s.source).join(", ")}`,
      ].join("\n"),
      action: "SWITCHBOARD_ORACLE_CONSENSUS",
      content: { consensus, outcome, topic },
    });
  },
};

// ── Plugin Export ─────────────────────────────────────────────────────────────

export const pluginSwitchboard: Plugin = {
  name: "plugin-switchboard",
  description: "Real multi-source NLP sentiment oracle (Reddit + Farcaster + Twitter) for PRISM market resolution",
  actions: [runOracleConsensusAction],
  evaluators: [],
  providers: [],
};
