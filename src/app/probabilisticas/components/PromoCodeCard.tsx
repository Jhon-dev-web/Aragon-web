"use client";

import { useState } from "react";
import { tw } from "../design-tokens";

export type PromoCodeCardProps = {
  planLabel: string;
  planExpiryText: string;
  promoExpiryText: string | null;
  promoCode: string;
  onPromoCodeChange: (value: string) => void;
  onRedeem: () => void;
  promoLoading: boolean;
  promoFeedback: { type: "success" | "error"; text: string } | null;
  defaultExpanded?: boolean;
};

export function PromoCodeCard({
  planLabel,
  planExpiryText,
  promoExpiryText,
  promoCode,
  onPromoCodeChange,
  onRedeem,
  promoLoading,
  promoFeedback,
  defaultExpanded = true,
}: PromoCodeCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const statusBadge =
    planLabel !== "Sem acesso" || promoExpiryText
      ? `${planLabel}${planExpiryText ?? ""}${promoExpiryText ? ` · ${promoExpiryText}` : ""}`
      : "Sem acesso";

  return (
    <section
      className={`rounded-xl border ${tw.border} ${tw.bgCard} p-4 flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-3`}
      aria-labelledby="promo-title"
    >
      <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h3
            id="promo-title"
            className={`text-sm font-semibold ${tw.textPrimary}`}
          >
            Código promocional
          </h3>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#1E293B] border ${tw.border} ${tw.textSecondary}`}
            aria-label="Status do plano"
          >
            {statusBadge}
          </span>
        </div>
        <button
          type="button"
          className="sm:hidden px-2 py-1 rounded-md text-[11px] border border-[#334155] text-[#94A3B8] hover:bg-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={expanded ? "promo-form" : undefined}
        >
          {expanded ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {expanded && (
        <div id="promo-form" className="flex flex-col sm:flex-row gap-2 flex-1 sm:max-w-md w-full">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </span>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => onPromoCodeChange(e.target.value)}
              placeholder="Digite seu código"
              className={`w-full pl-9 pr-3 py-2 rounded-lg border ${tw.border} ${tw.bgInput} text-sm ${tw.textPrimary} placeholder-[#64748B] focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none`}
              aria-label="Código promocional"
              disabled={promoLoading}
            />
          </div>
          <button
            type="button"
            onClick={onRedeem}
            disabled={promoLoading}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white ${tw.btnPrimary} disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]`}
            aria-label="Ativar código"
          >
            {promoLoading ? "Ativando…" : "Ativar"}
          </button>
        </div>
      )}
      {expanded && promoFeedback && (
        <p
          className={`text-xs px-3 py-2 rounded-lg border mt-1 sm:mt-0 sm:col-span-full ${
            promoFeedback.type === "success"
              ? "bg-emerald-900/20 border-emerald-700/50 text-emerald-300"
              : "bg-red-900/20 border-red-700/50 text-red-300"
          }`}
          role="alert"
        >
          {promoFeedback.text}
        </p>
      )}
    </section>
  );
}
