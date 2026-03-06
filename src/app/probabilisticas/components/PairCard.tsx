"use client";

import { memo } from "react";
import { symbolToLabel, isOtc, getAssertivenessColor } from "../utils";
import type { CatalogByAsset } from "../../api";
import { tw } from "../design-tokens";

export type PairCardProps = {
  row: CatalogByAsset;
  strategyName: string;
  onVerDetalhes: () => void;
  onVerCiclos: () => void;
  /** Destacar como primeiro/top do ranking */
  isFirst?: boolean;
};

function PairCardInner({ row, strategyName, onVerDetalhes, onVerCiclos, isFirst }: PairCardProps) {
  const cycles = row.cycles ?? row.total;
  const wins = row.wins ?? row.win_no_mg + row.win_with_mg;
  const p = row.p ?? row.win_no_mg;
  const g1 = row.g1 ?? row.win_with_mg;
  const hit = row.hit ?? row.loss;
  const winRate = row.win_rate ?? row.win_total_rate;
  const pct = 100 * (winRate ?? 0);
  const assertivenessColorClass = getAssertivenessColor(pct);
  const scoreStr = (row.score ?? 0).toFixed(2);
  const hasPayout = row.payout_avg != null && row.payout_avg !== undefined;

  return (
    <article
      className={`${tw.bgCard} border rounded-xl p-5 flex flex-col min-w-0 min-h-[200px] transition-all duration-200 ${tw.shadowCard}
        hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10 hover:border-[#2563EB]/40
        focus-within:ring-2 focus-within:ring-[#2563EB]/30 focus-within:ring-offset-2 focus-within:ring-offset-[#060B14] focus-within:border-[#2563EB]/50
        ${isFirst ? "border-blue-500 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/20" : tw.border}`}
      aria-labelledby={`card-${row.asset}-title`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <h3
          id={`card-${row.asset}-title`}
          className={`font-semibold text-sm lg:text-base ${tw.textPrimary} truncate`}
        >
          {symbolToLabel(row.asset)}
        </h3>
        <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#374151] text-[#94A3B8]">
          {isOtc(row.asset) ? "OTC" : "ABERTO"}
        </span>
      </div>
      <p className={`text-[11px] ${tw.textMuted} mb-1.5 truncate`}>{strategyName}</p>
      <div className="flex flex-col gap-0.5 mb-1">
        <div className={`text-xl lg:text-3xl font-bold ${assertivenessColorClass}`}>
          {(100 * (winRate ?? 0)).toFixed(1)}%
        </div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">Assertividade</p>
      </div>
      <div className="flex flex-col gap-3">
        <p className={`text-[10px] sm:text-[11px] ${tw.textMuted}`}>
          {cycles} ciclos — {wins} win / {hit} hit
        </p>
        {hasPayout && (
          <p className="text-xs text-gray-400">Payout médio: {Number(row.payout_avg).toFixed(0)}%</p>
        )}
        <p className="text-xs text-gray-400">Score: {scoreStr}</p>
        <div className="flex flex-wrap gap-1.5 text-[10px] sm:text-xs">
          <span className="px-1.5 py-0.5 rounded bg-[#1E3A5F]/60 text-[#93C5FD]">P {p}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#2E1F4F]/60 text-[#A78BFA]">G1 {g1}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#3F1F1F]/60 text-[#F87171]">H {hit}</span>
        </div>
      </div>
      <div className="mt-auto flex gap-2 pt-2">
        <button
          type="button"
          onClick={onVerCiclos}
          className={`flex-1 py-2 rounded-lg text-[11px] lg:text-xs font-medium ${tw.btnSecondary} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]`}
        >
          Ver ciclos
        </button>
        <button
          type="button"
          onClick={onVerDetalhes}
          className={`flex-1 py-2 rounded-lg text-[11px] lg:text-xs font-medium text-white ${tw.btnPrimary} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]`}
        >
          Ver detalhes
        </button>
      </div>
    </article>
  );
}

export const PairCard = memo(PairCardInner);
