"use client";

import { formatCountdown } from "./types";
import type { TradeRecord } from "./types";

interface TradeStatusCardProps {
  record: TradeRecord;
  countdownMs: number;
}

export function TradeStatusCard({ record, countdownMs }: TradeStatusCardProps) {
  const isArmed = record.status === "ARMED";
  const isInTrade = record.status === "IN_TRADE";

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-lg"
      aria-labelledby="trade-status-title"
      aria-live="polite"
    >
      <h2 id="trade-status-title" className="text-base font-semibold text-[var(--text-primary)]">
        Status do trade
      </h2>

      {isArmed && (
        <p className="mt-3 text-sm text-[var(--text-secondary)]" role="status">
          Entrada em <strong className="font-mono text-[var(--primary-blue)]">{formatCountdown(countdownMs)}</strong>
        </p>
      )}

      {isInTrade && (
        <p className="mt-3 text-sm text-[var(--text-secondary)]" role="status">
          Operando esta vela… aguarde fechar.
        </p>
      )}

      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        {record.symbol} ({record.marketType}) · {record.direction} · vela {new Date(record.targetTsMs).toISOString().slice(11, 19)}
      </p>
    </section>
  );
}
