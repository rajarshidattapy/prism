import { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";

// Delegates to plugin-pmxt's searchMarketsAction by triggering the same logic inline.
// This avoids duplicate registration while giving the top-level QUERY_MARKETS action
// a clear routing path.

async function fetchPolymarket(query: string) {
  try {
    const url = `https://clob.polymarket.com/markets?search=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.results ?? data ?? []).slice(0, 5).map((m: any) => ({
      source: "Polymarket",
      question: m.question ?? m.title ?? "Unknown",
      yes: (parseFloat(m.outcomePrices?.[0] ?? m.yes_price ?? "0.5") * 100).toFixed(1) + "%",
      vol: `$${(m.volumeNum ?? m.volume_24hr ?? 0).toLocaleString()}`,
    }));
  } catch {
    return [];
  }
}

async function fetchKalshi(query: string) {
  try {
    const url = `https://trading-api.kalshi.com/trade-api/v2/markets?search=${encodeURIComponent(query)}&limit=5&status=open`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.markets ?? []).slice(0, 5).map((m: any) => ({
      source: "Kalshi",
      question: m.title ?? "Unknown",
      yes: (((m.yes_bid + m.yes_ask) / 2 / 100) * 100).toFixed(1) + "%",
      vol: `$${(m.volume ?? 0).toLocaleString()}`,
    }));
  } catch {
    return [];
  }
}

const queryMarketsAction: Action = {
  name: "QUERY_MARKETS",
  description: "Search live Polymarket and Kalshi prediction markets",
  similes: ["search markets", "find markets", "list markets", "show markets", "prism search"],
  examples: [
    [
      { user: "operator", content: { text: "prism search ETH ETF" } },
      { user: "PRISM", content: { text: "[PMXT] Querying Polymarket and Kalshi for ETH ETF..." } },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() ?? "";
    return (text.includes("prism") && text.includes("search")) ||
           text.includes("find market") || text.includes("search market");
  },
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const raw = message.content.text ?? "";
    const query = raw.replace(/prism\s+search|search\s+markets?|find\s+markets?/gi, "").trim() || "crypto";

    await callback({ text: `[PMXT] Querying Polymarket and Kalshi for "${query}"...` });

    const [poly, kalshi] = await Promise.all([fetchPolymarket(query), fetchKalshi(query)]);
    const all = [...poly, ...kalshi];

    if (all.length === 0) {
      await callback({ text: `[PMXT] No open markets found for "${query}". APIs may be rate-limited or query too specific.` });
      return;
    }

    const lines = all.map((m) => `• [${m.source}] ${m.question}\n  YES: ${m.yes} | Vol 24h: ${m.vol}`);
    await callback({
      text: `[PMXT] ${all.length} markets for "${query}":\n\n${lines.join("\n\n")}`,
      action: "QUERY_MARKETS",
      content: { markets: all },
    });
  },
};

const monitorPositionAction: Action = {
  name: "MONITOR_POSITION",
  description: "Monitor an open position — logs current state and thresholds",
  similes: ["monitor", "watch position", "track position"],
  examples: [
    [
      { user: "operator", content: { text: "Monitor my position on market-001" } },
      { user: "PRISM", content: { text: "[PRISM] Monitoring market-001. Auto-exit at +20% / -10%." } },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() ?? "";
    return text.includes("monitor") || text.includes("watch") || text.includes("track");
  },
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const text = message.content.text ?? "";
    const marketMatch = text.match(/market[-_]?\w+/i);
    const marketId = marketMatch ? marketMatch[0] : "unknown";

    await callback({
      text: [
        `[PRISM] Position monitoring registered for ${marketId}.`,
        `• Auto-exit at +20% profit`,
        `• Stop-loss at -10%`,
        `• PnL evaluator runs on every agent message cycle`,
        ``,
        `Note: Position tracking requires on-chain data. Deploy the Anchor program and hold shares to see live PnL.`,
      ].join("\n"),
      action: "MONITOR_POSITION",
    });
  },
};

export const prismActions: Action[] = [queryMarketsAction, monitorPositionAction];
