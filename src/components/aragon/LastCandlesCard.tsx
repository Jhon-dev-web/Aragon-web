"use client";

import type { CandleRow, DashboardSignalResponse } from "./types";

function bodySize(open: number, close: number): number {
  return Math.abs(close - open);
}

function formatPrice(n: number): string {
  return n.toFixed(4);
}

interface LastCandlesCardProps {
  data: DashboardSignalResponse | null;
  state: "idle" | "loading" | "ready" | "cooldown" | "error";
  onRefresh: () => void;
  refreshing: boolean;
  lastCandlesUpdate?: string | null;
}

export function LastCandlesCard({ data, state, onRefresh, refreshing, lastCandlesUpdate }: LastCandlesCardProps) {
  const candles: CandleRow[] = data?.candles ?? [];
  const isLoading = state === "loading";

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-lg card-hover overflow-hidden"
      aria-labelledby="candles-card-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 id="candles-card-title" className="text-base font-semibold text-[var(--text-primary)]">
          Últimos candles
        </h2>
        <div className="flex items-center gap-2">
          {lastCandlesUpdate && (
            <span className="text-xs text-[var(--text-secondary)]" title={new Date(lastCandlesUpdate).toLocaleString()}>
              {new Date(lastCandlesUpdate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || isLoading}
            className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] disabled:opacity-50"
            aria-label={refreshing ? "Atualizando candles…" : "Atualizar candles"}
          >
            {refreshing ? (
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--primary-blue)] border-t-transparent" aria-hidden />
                Atualizar
              </span>
            ) : (
              "Atualizar"
            )}
          </button>
        </div>
      </div>

      {isLoading && candles.length === 0 && (
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary-blue)] border-t-transparent" aria-hidden />
        </div>
      )}

      {!isLoading && candles.length === 0 && (
        <p className="py-6 text-center text-sm text-[var(--text-secondary)]">Nenhum candle carregado.</p>
      )}

      {candles.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[320px] text-left text-sm" role="table" aria-label="Últimos candles">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                <th scope="col" className="py-2 pr-2 font-mono font-normal">O</th>
                <th scope="col" className="py-2 pr-2 font-mono font-normal">H</th>
                <th scope="col" className="py-2 pr-2 font-mono font-normal">L</th>
                <th scope="col" className="py-2 pr-2 font-mono font-normal">C</th>
                <th scope="col" className="py-2 font-mono font-normal">Body</th>
              </tr>
            </thead>
            <tbody>
              {candles.map((row, i) => (
                <tr
                  key={row.ts}
                  className="border-b border-[var(--border)]/60"
                  style={{
                    color: row.color === "green" ? "var(--call)" : row.color === "red" ? "var(--put)" : "var(--text-secondary)",
                  }}
                >
                  <td className="py-1.5 pr-2 font-mono tabular-nums">{formatPrice(row.open)}</td>
                  <td className="py-1.5 pr-2 font-mono tabular-nums">{formatPrice(row.high)}</td>
                  <td className="py-1.5 pr-2 font-mono tabular-nums">{formatPrice(row.low)}</td>
                  <td className="py-1.5 pr-2 font-mono tabular-nums">{formatPrice(row.close)}</td>
                  <td className="py-1.5 font-mono tabular-nums">{formatPrice(bodySize(row.open, row.close))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
