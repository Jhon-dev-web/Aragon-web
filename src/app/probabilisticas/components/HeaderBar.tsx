"use client";

import Link from "next/link";
import { tw } from "../design-tokens";

export type HeaderBarProps = {
  userEmail: string;
  planLabel: string;
  planExpiryText: string;
  brokerStatus: string;
  onLogout: () => void;
};

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email || "—";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return "***@" + (domain?.slice(0, 2) ?? "") + "***";
  return local.slice(0, 2) + "***@" + (domain?.slice(0, 2) ?? "") + "***";
}

export function HeaderBar({
  userEmail,
  planLabel,
  planExpiryText,
  brokerStatus,
  onLogout,
}: HeaderBarProps) {
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
        <Link
          href="/admin"
          className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs font-medium border border-[#334155] text-[#93C5FD] hover:bg-[#1E293B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060B14]"
        >
          Admin
        </Link>
        <span className={`text-xs ${tw.textMuted} hidden sm:inline`} aria-hidden>
          Logado: {maskEmail(userEmail)}
        </span>
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
          <div
            className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-xs font-semibold text-white"
            aria-hidden
          >
            {(userEmail || "U")[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col items-start hidden sm:block">
            <span className={`text-xs ${tw.textPrimary} truncate max-w-[220px]`}>
              {userEmail || "Usuário"}
            </span>
            <span className={`text-[10px] ${tw.textMuted}`}>{brokerStatus}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
