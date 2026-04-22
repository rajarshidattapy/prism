import { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";

const queryMarketsAction: Action = {
  name: "QUERY_MARKETS",
  description: "Search active prediction markets via the PMXT abstraction layer",
  similes: ["search markets", "find markets", "list markets", "show markets"],
  examples: [
    [
      { user: "operator", content: { text: "Find all active ETH ETF markets" } },
      { user: "PRISM", content: { text: "Querying PMXT layer for ETH ETF markets..." } },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() ?? "";
    return text.includes("market") || text.includes("find") || text.includes("search");
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const query = message.content.text ?? "";
    await callback({
      text: `[PMXT] Querying markets for: "${query}"\nThis will call the plugin-pmxt searchMarkets action.`,
      action: "QUERY_MARKETS",
    });
  },
};

const monitorPositionAction: Action = {
  name: "MONITOR_POSITION",
  description: "Continuously monitor an open position for PnL and volatility thresholds",
  similes: ["monitor", "watch position", "track position"],
  examples: [
    [
      { user: "operator", content: { text: "Monitor my position on market-001" } },
      { user: "PRISM", content: { text: "Position monitoring active for market-001. Auto-exit at +20% / -10%." } },
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
      text: `[PRISM] Monitoring position on ${marketId}.\nThresholds: auto-exit at +20% profit or -10% loss.\nEvaluator running on every agent tick.`,
      action: "MONITOR_POSITION",
    });
  },
};

export const prismActions: Action[] = [queryMarketsAction, monitorPositionAction];
