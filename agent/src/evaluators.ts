import { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";

const pnlThresholdEvaluator: Evaluator = {
  name: "PNL_THRESHOLD",
  description: "Triggers auto-exit when a position hits PnL thresholds",
  similes: ["pnl check", "profit loss monitor"],
  examples: [],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    // Run on every agent tick
    return true;
  },
  handler: async (runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const positions = (state as any)?.openPositions ?? [];
    for (const pos of positions) {
      const pnlPct = ((pos.currentValue - pos.entryValue) / pos.entryValue) * 100;

      if (pnlPct >= 20) {
        console.log(`[PRISM] Auto-exit triggered: +${pnlPct.toFixed(1)}% on ${pos.marketId}`);
        // TODO: call pluginPrism sell action
      }

      if (pnlPct <= -10) {
        console.log(`[PRISM] Stop-loss triggered: ${pnlPct.toFixed(1)}% on ${pos.marketId}`);
        // TODO: call pluginPrism sell action
      }
    }
  },
};

const sentimentDriftEvaluator: Evaluator = {
  name: "SENTIMENT_DRIFT",
  description: "Detects when real-world sentiment diverges from simulation baseline by >15%",
  similes: ["sentiment check", "oracle drift"],
  examples: [],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    return typeof message.content.text === "string";
  },
  handler: async (_runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const simOdds = (state as any)?.simulationOdds ?? null;
    const realOdds = (state as any)?.oracleOdds ?? null;

    if (simOdds !== null && realOdds !== null) {
      const drift = Math.abs(simOdds - realOdds);
      if (drift > 1500) {
        console.log(`[PRISM] Sentiment drift alert: simulation=${simOdds / 100}% vs oracle=${realOdds / 100}%`);
      }
    }
  },
};

export const prismEvaluators: Evaluator[] = [pnlThresholdEvaluator, sentimentDriftEvaluator];
