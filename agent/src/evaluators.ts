import { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";

// PnL threshold evaluator — triggers sell routing when thresholds breach.
// Positions are populated by the agent state from buySharesAction.
// On-chain sell execution requires the Anchor program to be deployed.

const pnlThresholdEvaluator: Evaluator = {
  name: "PNL_THRESHOLD",
  description: "Auto-exit when a position hits +20% profit or -10% stop-loss",
  similes: [],
  examples: [],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => true,
  handler: async (runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const positions: any[] = (state as any)?.openPositions ?? [];
    for (const pos of positions) {
      if (!pos.entryValue || pos.entryValue === 0) continue;
      const pnlPct = ((pos.currentValue - pos.entryValue) / pos.entryValue) * 100;

      if (pnlPct >= 20) {
        console.log(`[PRISM Evaluator] Take-profit triggered: +${pnlPct.toFixed(1)}% on ${pos.marketId}`);
        // Route to buySharesAction with sell intent when program is deployed
        await runtime.processActions(
          {
            content: {
              text: `sell YES shares on ${pos.marketId} amount ${pos.shares}`,
              source: "evaluator",
            },
            userId: runtime.agentId,
            agentId: runtime.agentId,
            roomId: pos.marketId,
          } as any,
          []
        ).catch(() => {
          console.log(`[PRISM Evaluator] Sell routing failed for ${pos.marketId} — deploy Anchor program first`);
        });
      }

      if (pnlPct <= -10) {
        console.log(`[PRISM Evaluator] Stop-loss triggered: ${pnlPct.toFixed(1)}% on ${pos.marketId}`);
        await runtime.processActions(
          {
            content: {
              text: `sell NO shares on ${pos.marketId} amount ${pos.shares}`,
              source: "evaluator",
            },
            userId: runtime.agentId,
            agentId: runtime.agentId,
            roomId: pos.marketId,
          } as any,
          []
        ).catch(() => {
          console.log(`[PRISM Evaluator] Stop-loss routing failed for ${pos.marketId}`);
        });
      }
    }
  },
};

// Sentiment drift evaluator — alerts when real oracle diverges from simulation baseline.
// Logs drift for operator awareness; does not auto-trade (would require confidence threshold).

const sentimentDriftEvaluator: Evaluator = {
  name: "SENTIMENT_DRIFT",
  description: "Alert when real-world sentiment deviates from simulation baseline by >15 percentage points",
  similes: [],
  examples: [],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    return typeof message.content.text === "string";
  },
  handler: async (_runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const simOdds: number | null = (state as any)?.simulationOdds ?? null;
    const realOdds: number | null = (state as any)?.oracleOdds ?? null;

    if (simOdds === null || realOdds === null) return;

    const drift = Math.abs(simOdds - realOdds);
    if (drift > 1500) {
      console.log(
        `[PRISM Evaluator] Sentiment drift alert: simulation=${(simOdds / 100).toFixed(1)}% vs oracle=${(realOdds / 100).toFixed(1)}% (drift=${(drift / 100).toFixed(1)}pp)`
      );
    }
  },
};

export const prismEvaluators: Evaluator[] = [pnlThresholdEvaluator, sentimentDriftEvaluator];
