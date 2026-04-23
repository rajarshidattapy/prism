"use client";

import { useEffect, useState, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { type PmxtMarket, searchMarkets } from "../lib/pmxt-client";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet"
  ? "https://api.mainnet-beta.solana.com"
  : "https://api.devnet.solana.com";

const PROGRAM_ID = process.env.NEXT_PUBLIC_PRISM_PROGRAM_ID ?? "PRiSMVzV9vV1GqSsGaijT9tCGANWGFCj9yXv5x8vFJ3";

// Approximate Market account size from the Anchor program layout
const MARKET_ACCOUNT_SIZE = 395;

export interface PrismMarket {
  pda: string;
  marketId: string;
  question: string;
  yesOdds: number;   // basis points
  noOdds: number;
  yesLiquidity: number;
  noLiquidity: number;
  resolved: boolean;
  outcome: number;
  simulationHash: string;
  resolutionTimestamp: number;
}

export function usePrismMarkets() {
  const [markets, setMarkets] = useState<PrismMarket[]>([]);
  const [pmxtMarkets, setPmxtMarkets] = useState<PmxtMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programDeployed, setProgramDeployed] = useState<boolean | null>(null);

  const fetchOnChainMarkets = useCallback(async () => {
    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const programId = new PublicKey(PROGRAM_ID);

      const accounts = await connection.getProgramAccounts(programId, {
        filters: [{ dataSize: MARKET_ACCOUNT_SIZE }],
      });

      setProgramDeployed(true);

      // Parse raw account data — 8 byte discriminator + fields per lib.rs layout:
      // market_id: [u8;32], question: String (4+len), yes_odds: u64, no_odds: u64,
      // yes_liq: u64, no_liq: u64, resolved: bool, outcome: u8, sim_hash: [u8;32],
      // resolution_ts: i64, creator: Pubkey, bump: u8
      const parsed: PrismMarket[] = accounts.map((acc) => {
        try {
          const data = acc.pubkey; // real parsing requires IDL — show PDA only for now
          return {
            pda: acc.pubkey.toBase58(),
            marketId: "on-chain",
            question: "Market loaded from chain (IDL parse pending anchor deploy)",
            yesOdds: 5000,
            noOdds: 5000,
            yesLiquidity: 0,
            noLiquidity: 0,
            resolved: false,
            outcome: 0,
            simulationHash: "0".repeat(64),
            resolutionTimestamp: Math.floor(Date.now() / 1000) + 86400,
          };
        } catch {
          return null;
        }
      }).filter(Boolean) as PrismMarket[];

      setMarkets(parsed);
      setError(null);
    } catch (err: any) {
      // Program not deployed — show empty state, not fake data
      setProgramDeployed(false);
      setMarkets([]);
      setError("PRISM program not deployed. Run: cd anchor && anchor build && anchor deploy");
    }
  }, []);

  const fetchPmxtMarkets = useCallback(async () => {
    const result = await searchMarkets("ETH prediction");
    setPmxtMarkets(result.markets);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOnChainMarkets(), fetchPmxtMarkets()])
      .finally(() => setLoading(false));

    const interval = setInterval(fetchOnChainMarkets, 15000);
    return () => clearInterval(interval);
  }, [fetchOnChainMarkets, fetchPmxtMarkets]);

  return { markets, pmxtMarkets, loading, error, programDeployed, refetch: fetchOnChainMarkets };
}
