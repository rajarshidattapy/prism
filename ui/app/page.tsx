"use client";

import { useState, useEffect, useRef } from "react";
import TerminalUI from "../components/TerminalUI";
import MarketDashboard from "../components/MarketDashboard";
import { useSolanaWallet } from "../hooks/useSolanaWallet";
import { shortenAddress, formatSol } from "../lib/utils";

type Tab = "terminal" | "markets" | "simulation";

const AGENT_URL = (process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001").replace("ws://", "http://");
const BACKEND_URL = "http://localhost:5001";
const AGENT_ID = "PRISM%20Orchestrator";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("terminal");
  const wallet = useSolanaWallet();

  return (
    <div className="flex flex-col h-[calc(100vh-72px)]">
      {/* Nav bar */}
      <nav className="flex items-center justify-between border-b border-[#1a1a2e] px-4">
        <div className="flex">
          {(["terminal", "markets", "simulation"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs tracking-wider uppercase transition-colors border-b-2 ${
                activeTab === tab
                  ? "border-[#9945ff] text-[#c8d0e8]"
                  : "border-transparent text-[#4a4a6a] hover:text-[#c8d0e8]"
              }`}
            >
              {tab === "terminal" && "◈ Terminal"}
              {tab === "markets" && "⬡ Markets"}
              {tab === "simulation" && "⬢ Simulation"}
            </button>
          ))}
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {wallet.slot && (
            <span className="text-[10px] text-prism-dim hidden sm:block">
              slot #{wallet.slot.toLocaleString()}
            </span>
          )}
          {wallet.connected ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-prism-green">
                {formatSol((wallet.balance ?? 0) * 1e9)}
              </span>
              <button
                onClick={wallet.disconnect}
                className="text-[10px] text-prism-dim border border-[#1a1a2e] px-2 py-1 hover:border-[#ff3366] hover:text-prism-red transition-colors"
              >
                {shortenAddress(wallet.address!)}
              </button>
            </div>
          ) : (
            <button
              onClick={wallet.connect}
              className="text-[10px] text-prism-green border border-[#00ff88] px-3 py-1 hover:bg-[#00ff88] hover:text-black transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "terminal" && (
          <div className="h-full p-4">
            <TerminalUI />
          </div>
        )}

        {activeTab === "markets" && (
          <div className="h-full overflow-y-auto">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 h-full">
              <MarketDashboard />
              <div className="flex flex-col gap-3">
                <h2 className="text-prism-yellow text-xs font-bold tracking-widest uppercase">
                  ⬡ Agent Activity
                </h2>
                <AgentActivityFeed />
              </div>
            </div>
          </div>
        )}

        {activeTab === "simulation" && (
          <div className="h-full overflow-y-auto p-4">
            <SimulationPanel />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Agent Activity Feed ───────────────────────────────────────────────────────
// Polls the agent's memory endpoint for real recent events.

interface AgentEvent {
  id: string;
  ts: string;
  type: string;
  text: string;
}

function classifyEvent(text: string): string {
  if (text.includes("MiroFish") || text.includes("simulation")) return "sim";
  if (text.includes("PDA") || text.includes("on-chain") || text.includes("Solana")) return "chain";
  if (text.includes("Polymarket") || text.includes("Kalshi") || text.includes("trade")) return "trade";
  if (text.includes("oracle") || text.includes("Switchboard") || text.includes("sentiment")) return "oracle";
  return "monitor";
}

function AgentActivityFeed() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        const res = await fetch(
          `${AGENT_URL}/${AGENT_ID}/terminal/memories?count=20`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (!res.ok) throw new Error("not ok");
        const data = await res.json();
        if (cancelled) return;
        setAgentOnline(true);

        const memories: any[] = data.memories ?? [];
        const parsed: AgentEvent[] = memories
          .filter((m: any) => m.content?.text)
          .map((m: any) => ({
            id: m.id,
            ts: new Date(m.createdAt).toLocaleTimeString("en-US", { hour12: false }),
            type: classifyEvent(m.content.text),
            text: m.content.text.slice(0, 120),
          }));
        setEvents(parsed.reverse());
      } catch {
        if (!cancelled) setAgentOnline(false);
      }
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const colors: Record<string, string> = {
    sim: "text-prism-purple",
    chain: "text-prism-green",
    trade: "text-prism-cyan",
    oracle: "text-prism-yellow",
    monitor: "text-[#c8d0e8]",
  };

  if (agentOnline === false) {
    return (
      <div className="card p-3 flex-1 flex items-center justify-center">
        <span className="text-prism-dim text-xs">Agent offline — start with: bun run dev:agent</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="card p-3 flex-1 flex items-center justify-center">
        <span className="text-prism-dim text-xs animate-pulse">
          {agentOnline === null ? "Connecting to agent..." : "No activity yet — try a terminal command"}
        </span>
      </div>
    );
  }

  return (
    <div className="card p-3 space-y-2 flex-1 overflow-y-auto">
      {events.map((e) => (
        <div key={e.id} className="flex gap-3 text-[11px]">
          <span className="text-prism-dim shrink-0">{e.ts}</span>
          <span className={`${colors[e.type] ?? "text-[#c8d0e8]"} line-clamp-2`}>{e.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── Simulation Panel ──────────────────────────────────────────────────────────
// Calls the real backend oracle pipeline. No Math.random().

interface OracleResult {
  question: string;
  yes_probability: number;
  yes_basis_points: number;
  no_basis_points: number;
  simulation_hash: string;
  simulation_id: string;
  platform: string;
  elapsed_seconds?: number;
  n_agents?: number;
  persona_breakdown?: { persona: string; avg_yes_probability: number }[];
}

function SimulationPanel() {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [nAgents, setNAgents] = useState(10000);
  const [result, setResult] = useState<OracleResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(2000) })
      .then((r) => setBackendOnline(r.ok))
      .catch(() => setBackendOnline(false));
  }, []);

  const runSim = async () => {
    if (!question.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);

    const t0 = Date.now();

    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/oracle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context, n_agents: nAgents }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Oracle failed");

      const data: OracleResult = {
        ...json.data,
        elapsed_seconds: ((Date.now() - t0) / 1000),
        n_agents: nAgents,
      };
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-prism-purple text-xs font-bold tracking-widest uppercase mb-2">
          ⬢ MiroFish OASIS Simulation
        </h2>
        <p className="text-prism-dim text-xs mb-1">
          Runs the real oracle pipeline — statistical agent simulation across persona archetypes.
          Output is a verifiable SHA-256 attestation that can be committed on-chain before the real event.
        </p>
        {backendOnline === false && (
          <div className="text-prism-red text-[10px] mt-1">
            ⚠ Backend offline — start with: <span className="text-prism-yellow">cd backend && venv311/Scripts/python.exe run.py</span>
          </div>
        )}
        {backendOnline === true && (
          <div className="text-prism-green text-[10px] mt-1">● Backend online</div>
        )}
      </div>

      {/* Input form */}
      <div className="card p-4 space-y-3">
        <div>
          <label className="text-prism-dim text-[10px] uppercase tracking-wider block mb-1">Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will ETH sentiment match OASIS 62% bullish within 48h?"
            className="w-full bg-[#0a0a0f] border border-[#1a1a2e] text-[#c8d0e8] text-xs px-3 py-2 outline-none focus:border-[#9945ff] transition-colors"
          />
        </div>
        <div>
          <label className="text-prism-dim text-[10px] uppercase tracking-wider block mb-1">Context / News</label>
          <input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="ETF approved, institutional inflow strong, regulatory clarity improving"
            className="w-full bg-[#0a0a0f] border border-[#1a1a2e] text-[#c8d0e8] text-xs px-3 py-2 outline-none focus:border-[#9945ff] transition-colors"
          />
        </div>
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-prism-dim text-[10px] uppercase tracking-wider block mb-1">Agents</label>
            <select
              value={nAgents}
              onChange={(e) => setNAgents(parseInt(e.target.value))}
              className="bg-[#0a0a0f] border border-[#1a1a2e] text-[#c8d0e8] text-xs px-3 py-2 outline-none"
            >
              <option value={1000}>1,000 (fast)</option>
              <option value={10000}>10,000 (default)</option>
              <option value={100000}>100,000 (Nosana)</option>
              <option value={1000000}>1,000,000 (full)</option>
            </select>
          </div>
          <button
            onClick={runSim}
            disabled={running || !question.trim() || backendOnline === false}
            className="px-4 py-2 text-xs font-bold border border-[#9945ff] text-prism-purple hover:bg-[#9945ff] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running ? "Running simulation..." : "Run MiroFish →"}
          </button>
        </div>
      </div>

      {running && (
        <div className="card p-4 space-y-2">
          <div className="text-prism-green text-xs animate-pulse">
            Running oracle pipeline for {nAgents.toLocaleString()} agents...
          </div>
          <div className="progress-bar" />
        </div>
      )}

      {error && !running && (
        <div className="card p-4 border border-[#ff3366]">
          <div className="text-prism-red text-xs font-bold mb-1">Oracle Error</div>
          <div className="text-prism-dim text-[10px] font-mono">{error}</div>
        </div>
      )}

      {result && !running && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-prism-green text-xs font-bold">
              Simulation Complete
              <span className="text-prism-dim ml-2 font-normal">
                [{result.platform ?? "statistical"}]
              </span>
            </span>
            <span className="text-prism-dim text-[10px]">
              {result.elapsed_seconds?.toFixed(1)}s · {result.n_agents?.toLocaleString()} agents
            </span>
          </div>

          <div className="flex gap-8">
            <div>
              <div className="text-prism-dim text-[10px] uppercase tracking-wider">YES Probability</div>
              <div className="text-prism-green text-2xl font-bold glow-green">
                {(result.yes_probability * 100).toFixed(1)}%
              </div>
              <div className="text-prism-dim text-[10px]">{result.yes_basis_points} bps</div>
            </div>
            <div>
              <div className="text-prism-dim text-[10px] uppercase tracking-wider">NO Probability</div>
              <div className="text-prism-red text-2xl font-bold">
                {(100 - result.yes_probability * 100).toFixed(1)}%
              </div>
              <div className="text-prism-dim text-[10px]">{result.no_basis_points} bps</div>
            </div>
          </div>

          {result.persona_breakdown && result.persona_breakdown.length > 0 && (
            <div>
              <div className="text-prism-dim text-[10px] uppercase tracking-wider mb-2">Persona Breakdown</div>
              <div className="space-y-1">
                {result.persona_breakdown.map((p) => (
                  <div key={p.persona} className="flex justify-between text-xs">
                    <span className="text-prism-dim">{p.persona.replace(/_/g, " ")}</span>
                    <span className="text-[#c8d0e8]">
                      {(p.avg_yes_probability * 100).toFixed(1)}% YES
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[#1a1a2e] pt-3">
            <div className="text-prism-dim text-[10px] uppercase tracking-wider mb-1">
              SHA-256 Attestation
            </div>
            <div className="text-prism-cyan text-[10px] font-mono break-all">
              {result.simulation_hash}
            </div>
            <div className="text-prism-dim text-[10px] mt-2">
              Simulation ID: <span className="text-[#c8d0e8]">{result.simulation_id}</span>
            </div>
            <div className="text-prism-dim text-[10px] mt-1">
              On-chain call:{" "}
              <span className="text-prism-green font-mono">
                seed_simulation_result(hash, {result.yes_basis_points})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
