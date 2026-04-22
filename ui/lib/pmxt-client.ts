"use client";

export interface PmxtMarket {
  id: string;
  source: "polymarket" | "kalshi" | "prism";
  question: string;
  yesPrice: number; // 0–1
  noPrice: number;
  volume24h: number;
  endDate: string;
  simulationHash?: string;
  simulationOdds?: number; // basis points
}

export interface PmxtSearchResult {
  markets: PmxtMarket[];
  query: string;
  sources: string[];
}

// Thin client that calls the PRISM agent API
export async function searchMarkets(query: string): Promise<PmxtSearchResult> {
  const agentUrl = process.env.NEXT_PUBLIC_WS_URL?.replace("ws://", "http://") ?? "http://localhost:3001";

  try {
    const res = await fetch(`${agentUrl}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `Search PMXT for markets about: ${query}`,
        userId: "ui-client",
        roomId: "dashboard",
      }),
    });

    if (!res.ok) throw new Error(`Agent API error: ${res.status}`);
    const data = await res.json();

    // Extract markets from agent response content if present
    const markets: PmxtMarket[] = data.content?.markets ?? [];
    return { markets, query, sources: ["polymarket", "kalshi"] };
  } catch {
    // Return mock data when agent is offline (dev mode)
    return getMockMarkets(query);
  }
}

export async function createMarket(question: string, durationHours: number = 48): Promise<string> {
  const agentUrl = process.env.NEXT_PUBLIC_WS_URL?.replace("ws://", "http://") ?? "http://localhost:3001";

  const res = await fetch(`${agentUrl}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `prism create "${question}"`,
      userId: "ui-client",
      roomId: "dashboard",
    }),
  });

  const data = await res.json();
  return data.content?.marketPda ?? data.text ?? "pending";
}

// ── Mock data for UI dev without agent running ─────────────────────────────

function getMockMarkets(query: string): PmxtSearchResult {
  const now = Math.floor(Date.now() / 1000);
  return {
    query,
    sources: ["polymarket", "kalshi", "prism"],
    markets: [
      {
        id: "poly-eth-etf-001",
        source: "polymarket",
        question: "Will the spot ETH ETF hit $1B AUM in its first month?",
        yesPrice: 0.68,
        noPrice: 0.32,
        volume24h: 2_340_000,
        endDate: new Date((now + 86400 * 30) * 1000).toISOString(),
      },
      {
        id: "kalshi-eth-5k",
        source: "kalshi",
        question: "Will ETH exceed $5,000 by end of Q2 2025?",
        yesPrice: 0.42,
        noPrice: 0.58,
        volume24h: 890_000,
        endDate: new Date((now + 86400 * 60) * 1000).toISOString(),
      },
      {
        id: "prism-sentiment-001",
        source: "prism",
        question: "Will real-world ETH sentiment match OASIS's 62% bullish rating within 48h?",
        yesPrice: 0.62,
        noPrice: 0.38,
        volume24h: 12_000,
        endDate: new Date((now + 86400 * 2) * 1000).toISOString(),
        simulationHash: "4f3a2b1c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2",
        simulationOdds: 6200,
      },
    ],
  };
}
