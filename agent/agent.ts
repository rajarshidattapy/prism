import "dotenv/config";
import { AgentRuntime, ModelProviderName, stringToUuid } from "@elizaos/core";
import { DirectClient } from "@elizaos/client-direct";
import { SqliteDatabaseAdapter } from "@elizaos/adapter-sqlite";
import Database from "better-sqlite3";
import { pluginPmxt } from "@prism/plugin-pmxt";
import { pluginPrism } from "@prism/plugin-prism";
import { pluginSwitchboard } from "@prism/plugin-switchboard";
import { prismActions } from "./src/actions.js";
import { prismEvaluators } from "./src/evaluators.js";
import { prismProviders } from "./src/providers.js";
import character from "./characters/prism_orchestrator.json" assert { type: "json" };

async function main() {
  const db = new Database("prism.db");
  const databaseAdapter = new SqliteDatabaseAdapter(db);
  await databaseAdapter.init();

  const runtime = new AgentRuntime({
    agentId: stringToUuid("prism-orchestrator"),
    character: character as any,
    modelProvider: ModelProviderName.OPENAI,
    token: process.env.OPENAI_API_KEY!,
    plugins: [pluginPmxt, pluginPrism, pluginSwitchboard],
    actions: prismActions,
    evaluators: prismEvaluators,
    providers: prismProviders,
    databaseAdapter,
  });

  await runtime.initialize();

  const port = parseInt(process.env.SERVER_PORT ?? "3001");
  const client = new DirectClient();
  client.registerAgent(runtime);
  client.start(port);

  console.log(`[PRISM] Agent online — listening on port ${port}`);
  console.log("[PRISM] Plugins loaded: pmxt, prism, switchboard");
}

main().catch((err) => {
  console.error("[PRISM] Fatal startup error:", err);
  process.exit(1);
});
