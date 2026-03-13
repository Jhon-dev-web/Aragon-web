"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { tw } from "../design-tokens";

export type HeaderBarProps = {
  userEmail: string;
  userName?: string | null;
  planLabel: string;
  planExpiryText: string;
  brokerStatus: string;
  onLogout: () => void;
  /** Exibir link para /admin. Deve ser sempre useAuth().isAdmin — nunca true para usuário não admin. */
  showAdminLink?: boolean;
  /** Código promocional: ícone de presente no header que abre popover para digitar e ativar */
  promoCode?: string;
  onPromoCodeChange?: (value: string) => void;
  onRedeemPromo?: () => void;
  promoLoading?: boolean;
  promoFeedback?: { type: "success" | "error"; text: string } | null;
};

export function HeaderBar({
  userEmail,
  userName,
  planLabel,
  planExpiryText,
  brokerStatus,
  onLogout,
  showAdminLink = false,
  promoCode = "",
  onPromoCodeChange,
  onRedeemPromo,
  promoLoading = false,
  promoFeedback,
}: HeaderBarProps) {
  const displayName = (userName || "").trim();
  const hasName = displayName.length > 0;
  const [promoOpen, setPromoOpen] = useState(false);
  const promoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (promoFeedback?.type === "success") setPromoOpen(false);
  }, [promoFeedback?.type]);

  useEffect(() => {
    if (!promoOpen) return;
    const close = (e: MouseEvent) => {
      if (promoRef.current && !promoRef.current.contains(e.target as Node)) setPromoOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [promoOpen]);

  const showPromo = onRedeemPromo && onPromoCodeChange;

  return (
    <header
      className={`flex items-center justify-between px-4 py-3 border-b ${tw.border} ${tw.bgPage} shrink-0`}
      role="banner"
    >
      <Link
        href="/"
        className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060B14] rounded-lg"
        aria-label="Voltar à home"
      >
        <div
          className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0"
          aria-hidden
        >
          <span className="text-white font-bold text-sm">AA</span>
        </div>
        <div>
          <h1 className={`text-base sm:text-xl font-semibold ${tw.textPrimary}`}>
            ARAGON ANALYTICS
          </h1>
          <p className="text-[10px] sm:text-xs text-[#64748B] hidden sm:block">
            Probabilidade &amp; Ranking
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {showPromo && (
          <div className="relative" ref={promoRef}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPromoOpen((v) => !v); }}
              className="p-2 rounded-lg border border-[#334155] text-[#E5E7EB] hover:bg-[#1E293B] hover:border-[#4B5563] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50"
              aria-label="Código promocional"
              aria-expanded={promoOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </button>
            {promoOpen && (
              <div
                className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-[#1F2937] bg-[#111827] shadow-xl p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs font-medium text-[#E5E7EB] mb-2">Código promocional</p>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => onPromoCodeChange(e.target.value)}
                  placeholder="Digite o código"
                  disabled={promoLoading}
                  className="w-full mb-2 px-3 py-2 rounded-lg border border-[#1F2937] bg-[#0B1220] text-sm text-[#E5E7EB] placeholder-[#64748B] focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 focus:outline-none"
                  aria-label="Código promocional"
                />
                <button
                  type="button"
                  onClick={() => onRedeemPromo()}
                  disabled={promoLoading}
                  className="w-full py-2 rounded-lg text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] disabled:opacity-60 text-white transition-colors"
                >
                  {promoLoading ? "Ativando…" : "Ativar"}
                </button>
                {promoFeedback && (
                  <p className={`mt-2 text-xs ${promoFeedback.type === "success" ? "text-[#22C55E]" : "text-[#F87171]"}`}>
                    {promoFeedback.text}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        {showAdminLink && (
          <Link
            href="/admin"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs font-medium border border-[#334155] text-[#93C5FD] hover:bg-[#1E293B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060B14]"
          >
            Admin
          </Link>
        )}
        {hasName && (
          <span className={`text-xs ${tw.textMuted} hidden sm:inline`} aria-hidden>
            Logado: {displayName}
          </span>
        )}
        <span className={`text-xs ${tw.textMuted} hidden md:inline`} aria-hidden>
          Plano: {planLabel}{planExpiryText}
        </span>
        <button
          type="button"
          onClick={onLogout}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border ${tw.borderMuted} ${tw.textPrimary} hover:bg-[#1E293B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060B14]`}
          aria-label="Sair da conta"
        >
          Sair
        </button>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111827] border border-[#1F2937]">
          {hasName ? (
            <>
              <div
                className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-xs font-semibold text-white"
                aria-hidden
              >
                {displayName[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col items-start">
                <span className={`text-xs ${tw.textPrimary} truncate max-w-[220px]`}>
                  {displayName}
                </span>
                <span className={`text-[10px] ${tw.textMuted}`}>{brokerStatus}</span>
              </div>
            </>
          ) : (
            <div
              className="w-7 h-7 rounded-full bg-[#1E293B] flex items-center justify-center text-base"
              title={userEmail || "Ver email"}
              aria-label={`Email: ${userEmail || ""}`}
            >
              👤
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
