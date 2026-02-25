"use client";

import type { TradeRecord } from "./types";

function formatTargetTime(targetTsMs: number): string {
  const d = new Date(targetTsMs);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function resultColor(result: string): string {
  if (result === "WIN") return "var(--call)";
  if (result === "LOSS") return "var(--put)";
  if (result === "DRAW") return "var(--none)";
  return "var(--text-secondary)";
}

function formatPrice(n: number): string {
  return n.toFixed(5);
}

interface ResultCardProps {
  /** Record resolvido a exibir (currentTrade quando RESOLVED ou lastResolved). */
  record: TradeRecord | null;
}

export function ResultCard({ record }: ResultCardProps) {
  if (!record) {
    return (
      <section
        className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-lg"
        aria-labelledby="result-card-title"
      >
        <h2 id="result-card-title" className="text-base font-semibold text-[var(--text-primary)]">
          Resultado do último sinal
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Nenhum sinal resolvido ainda. Clique em &quot;Analisar&quot; para gerar um sinal e acompanhar o resultado.
        </p>
      </section>
    );
  }

  const isResolved = record.status === "RESOLVED";
  if (!isResolved) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-lg" aria-labelledby="result-card-title">
        <h2 id="result-card-title" className="text-base font-semibold text-[var(--text-primary)]">Resultado do último sinal</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Aguardando resolução (status: {record.status}).</p>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-lg"
      aria-labelledby="result-card-title"
      aria-live="polite"
    >
      <h2 id="result-card-title" className="text-base font-semibold text-[var(--text-primary)]">
        Resultado do último sinal
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: resultColor(record.result) }}
          aria-label={`Resultado: ${record.result}`}
        >
          {record.result}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {record.symbol} ({record.marketType}) · {record.timeframeSec}s
        </span>
      </div>

      {record.candleOpen != null && record.candleClose != null && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-[var(--text-secondary)]">
            Vela: <strong className="text-[var(--text-primary)]">{formatTargetTime(record.targetTsMs)}</strong>
          </p>
          <p className="font-mono text-[var(--text-primary)]">
            Open → Close: {formatPrice(record.candleOpen)} → {formatPrice(record.candleClose)}
          </p>
          <p className="text-[var(--text-secondary)]">
            Variação:{" "}
            <span
              style={{
                color:
                  record.candleClose > record.candleOpen
                    ? "var(--call)"
                    : record.candleClose < record.candleOpen
                      ? "var(--put)"
                      : "var(--none)",
              }}
            >
              {record.candleClose > record.candleOpen ? "+" : ""}
              {(record.candleClose - record.candleOpen).toFixed(5)}
            </span>
          </p>
          {record.resolvedAtMs != null && (
            <p className="text-xs text-[var(--text-secondary)]">
              Resolvido em {new Date(record.resolvedAtMs).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      )}

      {isResolved && (record.candleOpen == null || record.candleClose == null) && (
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Resultado: {record.result}</p>
      )}
    </section>
  );
}
