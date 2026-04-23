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
  agentOnline: boolean;
  error?: string;
}

const AGENT_URL = (process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001").replace("ws://", "http://");
const AGENT_ID = "PRISM%20Orchestrator";

export async function searchMarkets(query: string): Promise<PmxtSearchResult> {
  try {
    const res = await fetch(`${AGENT_URL}/${AGENT_ID}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `prism search ${query}`,
        userId: "ui-client",
        roomId: "dashboard",
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Agent API ${res.status}`);
    const data = await res.json();

    // Agent may return markets in content, or as text we can't parse into cards
    const messages: any[] = Array.isArray(data) ? data : [data];
    const markets: PmxtMarket[] = messages
      .flatMap((m: any) => m.content?.markets ?? [])
      .filter(Boolean);

    return { markets, query, sources: ["polymarket", "kalshi"], agentOnline: true };
  } catch (err: any) {
    return {
      markets: [],
      query,
      sources: [],
      agentOnline: false,
      error: err.message ?? "Agent unreachable",
    };
  }
}

export async function createMarket(question: string): Promise<string> {
  const res = await fetch(`${AGENT_URL}/${AGENT_ID}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `prism create "${question}"`,
      userId: "ui-client",
      roomId: "dashboard",
    }),
  });

  if (!res.ok) throw new Error(`Agent API ${res.status}`);
  const data = await res.json();
  const messages: any[] = Array.isArray(data) ? data : [data];
  const pda = messages.find((m: any) => m.content?.marketPda)?.content?.marketPda;
  return pda ?? "pending — check terminal for details";
}
