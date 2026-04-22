import { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { Connection, PublicKey } from "@solana/web3.js";

const solanaStateProvider: Provider = {
  get: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    try {
      const rpc = runtime.getSetting("SOLANA_RPC_URL") ?? "https://api.devnet.solana.com";
      const connection = new Connection(rpc, "confirmed");
      const slot = await connection.getSlot();
      const programId = runtime.getSetting("PRISM_PROGRAM_ID");

      return `[Solana Context]\nNetwork: devnet\nCurrent slot: ${slot}\nPRISM program: ${programId ?? "not configured"}`;
    } catch {
      return "[Solana Context] Unable to fetch on-chain state.";
    }
  },
};

const marketSummaryProvider: Provider = {
  get: async (_runtime: IAgentRuntime, _message: Memory, state?: State) => {
    // In the MVP this returns cached state; later it queries PMXT
    const markets = (state as any)?.activeMarkets ?? [];
    if (markets.length === 0) {
      return "[Market Context] No active PRISM markets found.";
    }
    const lines = markets.map(
      (m: any) => `• ${m.question} — YES: ${m.yesOdds / 100}% | liquidity: ${m.liquidity}`
    );
    return `[Market Context]\n${lines.join("\n")}`;
  },
};

export const prismProviders: Provider[] = [solanaStateProvider, marketSummaryProvider];
