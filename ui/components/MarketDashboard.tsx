"use client";

import { usePrismMarkets, type PrismMarket } from "../hooks/usePrismMarket";
import { type PmxtMarket } from "../lib/pmxt-client";
import { formatBasisPoints, shortenAddress, timeUntil } from "../lib/utils";

function OddsBar({ yes, no }: { yes: number; no: number }) {
  const yesPct = yes / 100;
  const noPct = no / 100;
  return (
    <div className="flex w-full h-1.5 rounded-full overflow-hidden gap-px">
      <div className="bg-[#00ff88] transition-all" style={{ width: `${yesPct}%` }} />
      <div className="bg-[#ff3366] transition-all" style={{ width: `${noPct}%` }} />
    </div>
  );
}

function PrismMarketCard({ market }: { market: PrismMarket }) {
  const simHashShort = market.simulationHash.slice(0, 10) + "...";
  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-prism-purple text-[10px] font-bold tracking-wider">◈ PRISM</span>
        <span className="text-prism-dim text-[10px]">
          {market.resolved ? (
            <span className={market.outcome === 1 ? "text-prism-green" : "text-prism-red"}>
              RESOLVED: {market.outcome === 1 ? "YES" : "NO"}
            </span>
          ) : (
            `Closes: ${timeUntil(market.resolutionTimestamp)}`
          )}
        </span>
      </div>

      <p className="text-[#c8d0e8] text-xs leading-tight">{market.question}</p>

      <OddsBar yes={market.yesOdds} no={market.noOdds} />

      <div className="flex justify-between text-[10px]">
        <span className="text-prism-green">YES {formatBasisPoints(market.yesOdds)}</span>
        <span className="text-prism-red">NO {formatBasisPoints(market.noOdds)}</span>
      </div>

      <div className="flex justify-between text-[10px] text-prism-dim pt-1 border-t border-[#1a1a2e]">
        <span>PDA: {shortenAddress(market.pda)}</span>
        <span>sim: {simHashShort}</span>
      </div>
    </div>
  );
}

function PmxtMarketCard({ market }: { market: PmxtMarket }) {
  const yesBps = Math.round(market.yesPrice * 10000);
  const noBps = Math.round(market.noPrice * 10000);
  const sourceColor = market.source === "polymarket" ? "text-[#00d4ff]" : "text-[#ffcc00]";

  return (
    <div className="card p-3 space-y-2 opacity-80">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[10px] font-bold tracking-wider uppercase ${sourceColor}`}>
          {market.source}
        </span>
        <span className="text-prism-dim text-[10px]">
          Vol: ${(market.volume24h / 1000).toFixed(0)}k
        </span>
      </div>

      <p className="text-[#c8d0e8] text-xs leading-tight">{market.question}</p>

      <OddsBar yes={yesBps} no={noBps} />

      <div className="flex justify-between text-[10px]">
        <span className="text-prism-green">YES {(market.yesPrice * 100).toFixed(1)}%</span>
        <span className="text-prism-red">NO {(market.noPrice * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function MarketDashboard() {
  const { markets, pmxtMarkets, loading, error } = usePrismMarkets();

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Section: PRISM on-chain markets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-prism-purple text-xs font-bold tracking-widest uppercase">
            ◈ PRISM Markets
          </h2>
          <span className="text-prism-dim text-[10px]">Solana Devnet</span>
        </div>

        {loading ? (
          <div className="card p-3 text-prism-dim text-xs animate-pulse">Fetching on-chain state...</div>
        ) : error ? (
          <div className="card p-3 text-prism-red text-xs">Error: {error}</div>
        ) : markets.length === 0 ? (
          <div className="card p-3 text-prism-dim text-xs">
            No markets deployed yet. Run: <span className="text-prism-cyan">prism create "..."</span>
          </div>
        ) : (
          <div className="grid gap-2">
            {markets.map((m) => (
              <PrismMarketCard key={m.pda} market={m} />
            ))}
          </div>
        )}
      </div>

      {/* Section: PMXT aggregated markets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-prism-cyan text-xs font-bold tracking-widest uppercase">
            PMXT Layer
          </h2>
          <span className="text-prism-dim text-[10px]">Polymarket + Kalshi</span>
        </div>

        <div className="grid gap-2">
          {pmxtMarkets.slice(0, 5).map((m) => (
            <PmxtMarketCard key={m.id} market={m} />
          ))}
          {pmxtMarkets.length === 0 && (
            <div className="card p-3 text-prism-dim text-xs">
              Agent offline — mock data shown. Start: <span className="text-prism-cyan">bun --cwd agent dev</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
