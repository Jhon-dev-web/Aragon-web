"use client";

import { confidenceLabel } from "./types";
import type { DashboardSignalResponse, SignalDirection } from "./types";

function directionColor(d: SignalDirection): string {
  if (d === "CALL") return "var(--call)";
  if (d === "PUT") return "var(--put)";
  return "var(--none)";
}

function timeframeLabel(seconds: number): string {
  if (seconds >= 3600) return `${seconds / 3600}h`;
  if (seconds >= 60) return `${seconds}min`;
  return `${seconds}s`;
}

interface SignalCardProps {
  data: DashboardSignalResponse | null;
  onVerDetalhes: () => void;
  onSalvarSinal: () => void;
  state: "idle" | "loading" | "ready" | "cooldown" | "error";
}

export function SignalCard({ data, onVerDetalhes, onSalvarSinal, state }: SignalCardProps) {
  const isLoading = state === "loading";
  const hasData = state === "ready" && data;

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-lg card-hover"
      aria-labelledby="signal-card-title"
    >
      <h2 id="signal-card-title" className="sr-only">
        Sinal atual
      </h2>

      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-[var(--text-secondary)]" role="status" aria-live="polite">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary-blue)] border-t-transparent" aria-hidden />
          <span>Carregando sinal…</span>
        </div>
      )}

      {state === "error" && (
        <div className="py-6 text-center text-sm text-[var(--put)]" role="alert">
          Erro ao carregar o sinal. Tente novamente.
        </div>
      )}

      {state === "idle" && !hasData && !isLoading && (
        <div className="py-6 text-center text-sm text-[var(--text-secondary)]">
          Clique em &quot;Analisar&quot; para obter o sinal.
        </div>
      )}

      {hasData && data && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-lg font-semibold"
              style={{ color: directionColor(data.direction) }}
              aria-label={`Direção: ${data.direction}`}
            >
              {data.direction}
            </span>
            <span className="rounded-full bg-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
              {data.confluences.length} confluências
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Confiança</span>
              <span className="font-medium text-[var(--text-primary)]" aria-label={`Confiança ${data.confidence}%, ${confidenceLabel(data.confidence)}`}>
                {data.confidence}% — {confidenceLabel(data.confidence)}
              </span>
            </div>
            <div
              className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--border)]"
              role="progressbar"
              aria-valuenow={data.confidence}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Confiança ${data.confidence}%`}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${data.confidence}%`,
                  backgroundColor: data.direction === "CALL" ? "var(--call)" : data.direction === "PUT" ? "var(--put)" : "var(--none)",
                }}
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <span>CALL</span>
              <span>PUT</span>
            </div>
            <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-l-full transition-all duration-300"
                style={{
                  width: `${data.votes.call + data.votes.put > 0 ? (100 * data.votes.call) / (data.votes.call + data.votes.put) : 50}%`,
                  backgroundColor: "var(--call)",
                }}
              />
              <div
                className="h-full rounded-r-full transition-all duration-300"
                style={{
                  width: `${data.votes.call + data.votes.put > 0 ? (100 * data.votes.put) / (data.votes.call + data.votes.put) : 50}%`,
                  backgroundColor: "var(--put)",
                }}
              />
            </div>
            <div className="mt-0.5 flex justify-between text-xs text-[var(--text-secondary)]">
              <span>{data.votes.call} votos</span>
              <span>{data.votes.put} votos</span>
            </div>
          </div>

          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Sinal válido para: Próxima vela ({timeframeLabel(data.timeframe)}).
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onVerDetalhes}
              className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
              aria-label="Ver detalhes do sinal"
            >
              Ver detalhes
            </button>
            <button
              type="button"
              onClick={onSalvarSinal}
              className="rounded-lg bg-[var(--primary-blue)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[var(--secondary-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
              aria-label="Salvar sinal (mock)"
            >
              Salvar sinal
            </button>
          </div>
        </>
      )}

      {(state === "cooldown" && data) && (
        <div className="py-2 text-center text-sm text-[var(--text-secondary)]" aria-live="polite">
          Aguarde o cooldown para analisar novamente.
        </div>
      )}
    </section>
  );
}
