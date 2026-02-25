"use client";

import type { MarketType } from "./types";

const PAIRS = [
  { value: "EURUSD", label: "EUR/USD (OTC)" },
  { value: "EURUSD_OPEN", label: "EUR/USD (OPEN)" },
  { value: "GBPUSD", label: "GBP/USD (OTC)" },
  { value: "USDJPY", label: "USD/JPY (OTC)" },
];

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface TopBarProps {
  marketType: MarketType;
  onMarketTypeChange: (t: MarketType) => void;
  symbol: string;
  onSymbolChange: (s: string) => void;
  countdownSeconds: number;
  onAnalisar: () => void;
  analyzing: boolean;
  analisarDisabled?: boolean;
  lastStatus: string;
}

export function TopBar({
  marketType,
  onMarketTypeChange,
  symbol,
  onSymbolChange,
  countdownSeconds,
  onAnalisar,
  analyzing,
  analisarDisabled = false,
  lastStatus,
}: TopBarProps) {
  const pairLabel = PAIRS.find((p) => p.value === symbol)?.label ?? `${symbol} (${marketType})`;

  return (
    <header
      className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--card-bg)]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--card-bg)]/80"
      role="banner"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--text-secondary)]" aria-hidden>Mercado</span>
        <button
          type="button"
          role="switch"
          aria-checked={marketType === "OTC"}
          aria-label={marketType === "OTC" ? "Mercado OTC ativo; clicar para OPEN" : "Mercado OPEN ativo; clicar para OTC"}
          className="relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border border-[var(--border)] bg-[var(--background)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          onClick={() => onMarketTypeChange(marketType === "OTC" ? "OPEN" : "OTC")}
        >
          <span
            className="pointer-events-none inline-block h-6 w-6 translate-y-0.5 rounded-full bg-[var(--primary-blue)] shadow transition-transform ml-0.5"
            style={{ transform: marketType === "OTC" ? "translateX(0)" : "translateX(24px)" }}
            aria-hidden
          />
          <span className="sr-only">{marketType === "OTC" ? "OTC" : "OPEN"}</span>
        </button>
        <span className="text-sm font-medium text-[var(--text-primary)]" aria-live="polite">
          {marketType}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="aragon-pair-select" className="text-sm text-[var(--text-secondary)]">
          Par
        </label>
        <select
          id="aragon-pair-select"
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-blue)]"
          aria-label="Selecionar par de ativos"
        >
          {PAIRS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]" role="timer" aria-live="polite">
        <span>Fechamento da vela em</span>
        <span className="font-mono font-medium text-[var(--text-primary)]">{formatCountdown(countdownSeconds)}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="max-w-[180px] truncate text-xs text-[var(--text-secondary)]" title={lastStatus}>
          {lastStatus}
        </span>
        <button
          type="button"
          onClick={onAnalisar}
          disabled={analyzing || analisarDisabled}
          className="rounded-lg bg-[var(--primary-blue)] px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-[var(--secondary-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label={analyzing ? "Analisando…" : analisarDisabled ? "Aguarde o trade encerrar" : "Analisar sinal"}
        >
          {analyzing ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
              Analisando…
            </span>
          ) : analisarDisabled ? (
            "Aguarde…"
          ) : (
            "Analisar"
          )}
        </button>
      </div>
    </header>
  );
}
