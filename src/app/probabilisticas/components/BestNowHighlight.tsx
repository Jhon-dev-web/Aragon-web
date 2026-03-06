"use client";

import { symbolToLabel, getAssertivenessColor } from "../utils";
import type { CatalogByAsset } from "../../api";
import { tw } from "../design-tokens";

export type BestNowHighlightProps = {
  asset: CatalogByAsset;
  strategyName: string;
  onVerCiclos: () => void;
  onVerDetalhes: () => void;
};

/** Mini sparkline visual (CSS only, decorative). */
function SparklineBar() {
  const heights = [40, 65, 45, 80, 55, 70, 60];
  return (
    <div
      className="flex items-end gap-0.5 h-8 w-16"
      aria-hidden
      style={{ minWidth: "4rem" }}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-[#2563EB]/40 min-w-[3px] max-w-[6px]"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function BestNowHighlight({
  asset,
  strategyName,
  onVerCiclos,
  onVerDetalhes,
}: BestNowHighlightProps) {
  const winRate = asset.win_rate ?? asset.win_total_rate ?? 0;
  const pctNum = 100 * winRate;
  const pct = pctNum.toFixed(1);
  const assertivenessColorClass = getAssertivenessColor(pctNum);
  const cycles = asset.cycles ?? asset.total ?? 0;
  const score = (asset.score ?? 0).toFixed(2);
  const wins = asset.wins ?? asset.win_no_mg + asset.win_with_mg;
  const hit = asset.hit ?? asset.loss;

  return (
    <section
      className={`rounded-xl border border-[#2563EB]/30 bg-gradient-to-br from-[#111827] to-[#1E3A5F]/20 p-4 sm:p-5 ${tw.shadowCard}`}
      aria-labelledby="best-now-title"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p
            id="best-now-title"
            className={`text-xs font-medium ${tw.textMuted} mb-1`}
          >
            Melhor assertivo agora
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xl sm:text-2xl font-bold ${tw.textPrimary}`}>
              {symbolToLabel(asset.asset)}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#374151] text-[#94A3B8]">
              {asset.asset.toUpperCase().endsWith("-OTC") ? "OTC" : "OPEN"}
            </span>
          </div>
          <p className={`text-xs ${tw.textMuted} mb-2`}>{strategyName}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`font-semibold ${assertivenessColorClass}`}>{pct}% assertividade</span>
            <span className={tw.textSecondary}>{cycles} ciclos</span>
            <span className={tw.textSecondary}>Score {score}</span>
            <span className={tw.textMuted}>
              {wins} win / {hit} hit
            </span>
          </div>
        </div>
        <div className="hidden sm:block" aria-hidden>
          <SparklineBar />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onVerCiclos}
            className={`px-3 py-2 rounded-lg text-xs font-medium ${tw.btnSecondary} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]`}
          >
            Ver ciclos
          </button>
          <button
            type="button"
            onClick={onVerDetalhes}
            className={`px-3 py-2 rounded-lg text-xs font-medium text-white ${tw.btnPrimary} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]`}
          >
            Ver detalhes
          </button>
        </div>
      </div>
    </section>
  );
}
