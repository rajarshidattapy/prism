"use client";

import { useState } from "react";
import TerminalUI from "../components/TerminalUI";
import MarketDashboard from "../components/MarketDashboard";
import { useSolanaWallet } from "../hooks/useSolanaWallet";
import { shortenAddress, formatSol } from "../lib/utils";

type Tab = "terminal" | "markets" | "simulation";

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
              {/* Left: Market dashboard */}
              <MarketDashboard />

              {/* Right: Agent activity log */}
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

const MOCK_EVENTS = [
  { ts: "14:32:01", type: "sim", text: "MiroFish simulation dispatched to Nosana (job: nos-7f3a)" },
  { ts: "14:32:45", type: "chain", text: "Market PDA initialized: PRiSM1111...3f2e | YES: 62%" },
  { ts: "14:33:10", type: "trade", text: "PMXT: Arbitrage edge detected on Polymarket ETH ETF (+6.2%)" },
  { ts: "14:33:22", type: "oracle", text: "Switchboard consensus: Twitter 64% | Reddit 58% | Farcaster 61%" },
  { ts: "14:34:05", text: "Auto-monitor: Position market-001 | PnL: +3.2% (threshold: +20%)", type: "monitor" },
];

function AgentActivityFeed() {
  const colors: Record<string, string> = {
    sim: "text-prism-purple",
    chain: "text-prism-green",
    trade: "text-prism-cyan",
    oracle: "text-prism-yellow",
    monitor: "text-[#c8d0e8]",
  };

  return (
    <div className="card p-3 space-y-2 flex-1">
      {MOCK_EVENTS.map((e, i) => (
        <div key={i} className="flex gap-3 text-[11px]">
          <span className="text-prism-dim shrink-0">{e.ts}</span>
          <span className={colors[e.type] ?? "text-[#c8d0e8]"}>{e.text}</span>
        </div>
      ))}
      <div className="flex gap-3 text-[11px] animate-pulse">
        <span className="text-prism-dim">now</span>
        <span className="text-prism-green">Monitoring markets<span className="cursor" /></span>
      </div>
    </div>
  );
}

// ── Simulation Panel ──────────────────────────────────────────────────────────

function SimulationPanel() {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [nAgents, setNAgents] = useState(10000);
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const runSim = async () => {
    setRunning(true);
    setResult(null);

    // Simulate locally (calls Python via API in production)
    await new Promise((r) => setTimeout(r, 2000));

    // Mock result for UI demo
    const yesProbability = 0.3 + Math.random() * 0.5;
    setResult({
      question,
      n_agents: nAgents,
      yes_probability: yesProbability.toFixed(4),
      yes_basis_points: Math.round(yesProbability * 10000),
      elapsed_seconds: (1.2 + Math.random() * 2).toFixed(2),
      simulation_hash: Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join(""),
      persona_breakdown: [
        { persona: "retail_bull", avg_yes_probability: (yesProbability + 0.1).toFixed(3) },
        { persona: "crypto_native", avg_yes_probability: (yesProbability + 0.05).toFixed(3) },
        { persona: "institutional_trader", avg_yes_probability: yesProbability.toFixed(3) },
        { persona: "bear_skeptic", avg_yes_probability: (yesProbability - 0.15).toFixed(3) },
        { persona: "defi_degen", avg_yes_probability: (yesProbability + 0.18).toFixed(3) },
      ],
    });
    setRunning(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-prism-purple text-xs font-bold tracking-widest uppercase mb-4">
          ⬢ MiroFish OASIS Simulation
        </h2>
        <p className="text-prism-dim text-xs mb-4">
          Simulate N synthetic agents across persona archetypes to generate a verifiable baseline probability
          for a prediction market question. The SHA-256 attestation can be posted on-chain.
        </p>
      </div>

      {/* Input form */}
      <div className="card p-4 space-y-3">
        <div>
          <label className="text-prism-dim text-[10px] uppercase tracking-wider block mb-1">Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder='Will ETH sentiment match OASIS 62% bullish within 48h?'
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
            disabled={running || !question}
            className="px-4 py-2 text-xs font-bold border border-[#9945ff] text-prism-purple hover:bg-[#9945ff] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running ? "Running simulation..." : "Run MiroFish →"}
          </button>
        </div>
      </div>

      {/* Result */}
      {running && (
        <div className="card p-4 space-y-2">
          <div className="text-prism-green text-xs animate-pulse">
            Running {nAgents.toLocaleString()} agents across 6 persona archetypes...
          </div>
          <div className="progress-bar" style={{ animationDuration: "2s" }} />
        </div>
      )}

      {result && !running && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-prism-green text-xs font-bold">Simulation Complete</span>
            <span className="text-prism-dim text-[10px]">{result.elapsed_seconds}s elapsed</span>
          </div>

          {/* Main result */}
          <div className="flex gap-8">
            <div>
              <div className="text-prism-dim text-[10px] uppercase tracking-wider">YES Probability</div>
              <div className="text-prism-green text-2xl font-bold glow-green">
                {(result.yes_probability * 100).toFixed(1)}%
              </div>
              <div className="text-prism-dim text-[10px]">{result.yes_basis_points} basis points</div>
            </div>
            <div>
              <div className="text-prism-dim text-[10px] uppercase tracking-wider">NO Probability</div>
              <div className="text-prism-red text-2xl font-bold">
                {(100 - result.yes_probability * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Persona breakdown */}
          <div>
            <div className="text-prism-dim text-[10px] uppercase tracking-wider mb-2">Persona Breakdown</div>
            <div className="space-y-1">
              {result.persona_breakdown.map((p: any) => (
                <div key={p.persona} className="flex justify-between text-xs">
                  <span className="text-prism-dim">{p.persona.replace("_", " ")}</span>
                  <span className="text-[#c8d0e8]">
                    {(parseFloat(p.avg_yes_probability) * 100).toFixed(1)}% YES
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Attestation hash */}
          <div className="border-t border-[#1a1a2e] pt-3">
            <div className="text-prism-dim text-[10px] uppercase tracking-wider mb-1">
              SHA-256 Attestation Hash
            </div>
            <div className="text-prism-cyan text-[10px] font-mono break-all">
              {result.simulation_hash}
            </div>
            <div className="text-prism-dim text-[10px] mt-1">
              Post on-chain via: <span className="text-prism-green">seed_simulation_result(hash, {result.yes_basis_points})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
