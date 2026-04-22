"use client";

import { useEffect, useState, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { type PmxtMarket, searchMarkets } from "../lib/pmxt-client";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet"
  ? "https://api.mainnet-beta.solana.com"
  : "https://api.devnet.solana.com";

const PROGRAM_ID = process.env.NEXT_PUBLIC_PRISM_PROGRAM_ID ?? "PRiSMVzV9vV1GqSsGaijT9tCGANWGFCj9yXv5x8vFJ3";

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

  const fetchOnChainMarkets = useCallback(async () => {
    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const programId = new PublicKey(PROGRAM_ID);

      // Fetch all accounts owned by the PRISM program
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [{ dataSize: 395 }], // approximate Market account size
      });

      // In MVP: parse raw account data
      // After `anchor build`, use the generated IDL for typed deserialization
      const parsed: PrismMarket[] = accounts.map((acc) => ({
        pda: acc.pubkey.toBase58(),
        marketId: "on-chain",
        question: "Fetched from chain",
        yesOdds: 5000,
        noOdds: 5000,
        yesLiquidity: 0,
        noLiquidity: 0,
        resolved: false,
        outcome: 0,
        simulationHash: "0x" + "0".repeat(64),
        resolutionTimestamp: Math.floor(Date.now() / 1000) + 86400,
      }));

      setMarkets(parsed);
    } catch {
      // Program not deployed yet — use mock data
      setMarkets([
        {
          pda: "PRiSM1111111111111111111111111111111111",
          marketId: "prism-demo-001",
          question: "Will real-world ETH sentiment match OASIS's 62% bullish rating within 48h?",
          yesOdds: 6200,
          noOdds: 3800,
          yesLiquidity: 50_000_000,
          noLiquidity: 30_000_000,
          resolved: false,
          outcome: 0,
          simulationHash: "4f3a2b1c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2",
          resolutionTimestamp: Math.floor(Date.now() / 1000) + 86400 * 2,
        },
      ]);
    }
  }, []);

  const fetchPmxtMarkets = useCallback(async () => {
    const result = await searchMarkets("ETH");
    setPmxtMarkets(result.markets);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOnChainMarkets(), fetchPmxtMarkets()])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    const interval = setInterval(fetchOnChainMarkets, 15000);
    return () => clearInterval(interval);
  }, [fetchOnChainMarkets, fetchPmxtMarkets]);

  return { markets, pmxtMarkets, loading, error, refetch: fetchOnChainMarkets };
}
