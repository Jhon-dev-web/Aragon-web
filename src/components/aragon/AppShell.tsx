"use client";

import { TopBar } from "./TopBar";
import type { MarketType } from "./types";

interface AppShellProps {
  children: React.ReactNode;
  marketType: MarketType;
  onMarketTypeChange: (t: MarketType) => void;
  symbol: string;
  onSymbolChange: (s: string) => void;
  countdownSeconds: number;
  onAnalisar: () => void;
  analyzing: boolean;
  /** Desabilita Analisar (ex.: trade em andamento ARMED/IN_TRADE) */
  analisarDisabled?: boolean;
  lastStatus: string;
  /** Conteúdo fixo no rodapé em mobile (ex: botão Analisar duplicado) */
  mobileFooter?: React.ReactNode;
}

export function AppShell({
  children,
  marketType,
  onMarketTypeChange,
  symbol,
  onSymbolChange,
  countdownSeconds,
  onAnalisar,
  analyzing,
  analisarDisabled = false,
  lastStatus,
  mobileFooter,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <TopBar
        marketType={marketType}
        onMarketTypeChange={onMarketTypeChange}
        symbol={symbol}
        onSymbolChange={onSymbolChange}
        countdownSeconds={countdownSeconds}
        onAnalisar={onAnalisar}
        analyzing={analyzing}
        analisarDisabled={analisarDisabled}
        lastStatus={lastStatus}
      />
      <main className="flex-1 overflow-auto pb-20 md:pb-6" id="dashboard-main" tabIndex={-1}>
        {children}
      </main>
      {mobileFooter ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--card-bg)] p-3 md:hidden">
          {mobileFooter}
        </div>
      ) : null}
    </div>
  );
}
