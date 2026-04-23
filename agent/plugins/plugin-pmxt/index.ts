import { Action, HandlerCallback, IAgentRuntime, Memory, Plugin, State } from "@elizaos/core";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PmxtMarket {
  id: string;
  source: "polymarket" | "kalshi";
  question: string;
  yesPrice: number; // 0–1
  noPrice: number;
  volume24h: number;
  endDate: string;
}

// ── Polymarket Client ─────────────────────────────────────────────────────────

async function searchPolymarket(query: string): Promise<PmxtMarket[]> {
  try {
    const url = `${process.env.POLYMARKET_CLOB_URL ?? "https://clob.polymarket.com"}/markets?search=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: any = await res.json();

    return (data.results ?? data ?? []).slice(0, 10).map((m: any) => ({
      id: m.condition_id ?? m.id,
      source: "polymarket" as const,
      question: m.question ?? m.title,
      yesPrice: parseFloat(m.outcomePrices?.[0] ?? m.yes_price ?? "0.5"),
      noPrice: parseFloat(m.outcomePrices?.[1] ?? m.no_price ?? "0.5"),
      volume24h: m.volumeNum ?? m.volume_24hr ?? 0,
      endDate: m.endDateIso ?? m.close_time ?? "unknown",
    }));
  } catch {
    return [];
  }
}

async function searchKalshi(query: string): Promise<PmxtMarket[]> {
  try {
    const url = `${process.env.KALSHI_API_URL ?? "https://trading-api.kalshi.com/trade-api/v2"}/markets?search=${encodeURIComponent(query)}&limit=10&status=open`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.KALSHI_API_KEY) headers["Authorization"] = `Bearer ${process.env.KALSHI_API_KEY}`;

    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const data: any = await res.json();

    return (data.markets ?? []).map((m: any) => ({
      id: m.ticker,
      source: "kalshi" as const,
      question: m.title,
      yesPrice: (m.yes_bid + m.yes_ask) / 2 / 100,
      noPrice: (m.no_bid + m.no_ask) / 2 / 100,
      volume24h: m.volume ?? 0,
      endDate: m.close_time ?? "unknown",
    }));
  } catch {
    return [];
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

const searchMarketsAction: Action = {
  name: "PMXT_SEARCH_MARKETS",
  description: "Search Polymarket and Kalshi for markets matching a keyword",
  similes: ["search prediction markets", "find polymarket", "kalshi search", "pmxt search"],
  examples: [
    [
      { user: "operator", content: { text: "Search PMXT for ETH ETF markets" } },
      { user: "PRISM", content: { text: "Querying Polymarket and Kalshi for ETH ETF..." } },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() ?? "";
    return text.includes("search") || text.includes("find") || text.includes("pmxt");
  },
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const query = message.content.text?.replace(/search|find|pmxt|markets?/gi, "").trim() ?? "";

    const [polyResults, kalshiResults] = await Promise.all([
      searchPolymarket(query),
      searchKalshi(query),
    ]);

    const all = [...polyResults, ...kalshiResults];

    if (all.length === 0) {
      await callback({ text: `[PMXT] No markets found for "${query}".` });
      return;
    }

    const lines = all.map(
      (m) =>
        `• [${m.source.toUpperCase()}] ${m.question}\n  YES: ${(m.yesPrice * 100).toFixed(1)}% | Vol 24h: $${m.volume24h.toLocaleString()}`
    );

    await callback({
      text: `[PMXT] Found ${all.length} markets for "${query}":\n\n${lines.join("\n\n")}`,
      action: "PMXT_SEARCH_MARKETS",
      content: { markets: all },
    });
  },
};

async function fetchPolymarketById(conditionId: string): Promise<PmxtMarket | null> {
  try {
    const url = `${process.env.POLYMARKET_CLOB_URL ?? "https://clob.polymarket.com"}/markets/${conditionId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const m: any = await res.json();
    return {
      id: m.condition_id ?? conditionId,
      source: "polymarket",
      question: m.question ?? m.title,
      yesPrice: parseFloat(m.outcomePrices?.[0] ?? m.yes_price ?? "0.5"),
      noPrice: parseFloat(m.outcomePrices?.[1] ?? m.no_price ?? "0.5"),
      volume24h: m.volumeNum ?? m.volume_24hr ?? 0,
      endDate: m.endDateIso ?? m.close_time ?? "unknown",
    };
  } catch {
    return null;
  }
}

async function fetchKalshiByTicker(ticker: string): Promise<PmxtMarket | null> {
  try {
    const url = `${process.env.KALSHI_API_URL ?? "https://trading-api.kalshi.com/trade-api/v2"}/markets/${ticker}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.KALSHI_API_KEY) headers["Authorization"] = `Bearer ${process.env.KALSHI_API_KEY}`;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data: any = await res.json();
    const m = data.market ?? data;
    return {
      id: m.ticker ?? ticker,
      source: "kalshi",
      question: m.title,
      yesPrice: (m.yes_bid + m.yes_ask) / 2 / 100,
      noPrice: (m.no_bid + m.no_ask) / 2 / 100,
      volume24h: m.volume ?? 0,
      endDate: m.close_time ?? "unknown",
    };
  } catch {
    return null;
  }
}

const getMarketAction: Action = {
  name: "PMXT_GET_MARKET",
  description: "Fetch detailed data for a specific Polymarket or Kalshi market by ID",
  similes: ["get market", "market details", "market info"],
  examples: [
    [
      { user: "operator", content: { text: "market details for KXFED-25-DEC" } },
      { user: "PRISM", content: { text: "[PMXT] Fetching Kalshi market KXFED-25-DEC..." } },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() ?? "";
    return text.includes("market details") || text.includes("market info") || text.includes("get market");
  },
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const text = message.content.text ?? "";

    // Extract market ID: hex condition_id (Polymarket) or uppercase ticker (Kalshi)
    const hexMatch = text.match(/0x[a-fA-F0-9]{10,}/);
    const tickerMatch = text.match(/\b([A-Z]{2,10}-\d{2,4}[-A-Z0-9]*)\b/);

    if (!hexMatch && !tickerMatch) {
      await callback({
        text: [
          `[PMXT] Provide a market ID to look up:`,
          `• Polymarket: market info 0xabc123...`,
          `• Kalshi:     market info KXFED-25-DEC`,
        ].join("\n"),
      });
      return;
    }

    let market: PmxtMarket | null = null;
    let source = "";

    if (hexMatch) {
      source = "Polymarket";
      await callback({ text: `[PMXT] Fetching Polymarket market ${hexMatch[0]}...` });
      market = await fetchPolymarketById(hexMatch[0]);
    } else if (tickerMatch) {
      source = "Kalshi";
      await callback({ text: `[PMXT] Fetching Kalshi market ${tickerMatch[1]}...` });
      market = await fetchKalshiByTicker(tickerMatch[1]);
    }

    if (!market) {
      await callback({ text: `[PMXT] Market not found on ${source}. It may be resolved or the ID is incorrect.` });
      return;
    }

    await callback({
      text: [
        `[PMXT] ${market.source.toUpperCase()} — ${market.question}`,
        `• YES : ${(market.yesPrice * 100).toFixed(2)}%`,
        `• NO  : ${(market.noPrice * 100).toFixed(2)}%`,
        `• Vol 24h : $${market.volume24h.toLocaleString()}`,
        `• Closes  : ${market.endDate}`,
        `• ID      : ${market.id}`,
      ].join("\n"),
      action: "PMXT_GET_MARKET",
      content: { market },
    });
  },
};

// ── Plugin Export ─────────────────────────────────────────────────────────────

export const pluginPmxt: Plugin = {
  name: "plugin-pmxt",
  description: "Unified abstraction over Polymarket and Kalshi prediction market APIs",
  actions: [searchMarketsAction, getMarketAction],
  evaluators: [],
  providers: [],
};
