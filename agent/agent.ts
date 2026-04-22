import "dotenv/config";
import { AgentRuntime, ModelProviderName, stringToUuid } from "@elizaos/core";
import { DirectClient } from "@elizaos/client-direct";
import { pluginPmxt } from "@prism/plugin-pmxt";
import { pluginPrism } from "@prism/plugin-prism";
import { pluginSwitchboard } from "@prism/plugin-switchboard";
import { prismActions } from "./src/actions.js";
import { prismEvaluators } from "./src/evaluators.js";
import { prismProviders } from "./src/providers.js";
import character from "./characters/prism_orchestrator.json" assert { type: "json" };

async function main() {
  const runtime = new AgentRuntime({
    agentId: stringToUuid("prism-orchestrator"),
    character: character as any,
    modelProvider: ModelProviderName.ANTHROPIC,
    token: process.env.ANTHROPIC_API_KEY!,
    plugins: [pluginPmxt, pluginPrism, pluginSwitchboard],
    actions: prismActions,
    evaluators: prismEvaluators,
    providers: prismProviders,
    databaseAdapter: undefined as any, // use in-memory for MVP
  });

  await runtime.initialize();

  const client = new DirectClient();
  await client.start(runtime);

  console.log("[PRISM] Agent online — listening on port 3001");
  console.log("[PRISM] Plugins loaded: pmxt, prism, switchboard");
}

main().catch((err) => {
  console.error("[PRISM] Fatal startup error:", err);
  process.exit(1);
});
