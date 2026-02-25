"use client";

import { strengthLabel } from "./types";
import type { ConfluenceItem, ConfluencePolarity, DashboardSignalResponse } from "./types";

function polarityIcon(p: ConfluencePolarity): string {
  if (p === "confirm") return "✅";
  if (p === "against") return "❌";
  return "⚠️";
}

function polarityAria(p: ConfluencePolarity): string {
  if (p === "confirm") return "Confirma o sinal";
  if (p === "against") return "Contra o sinal";
  return "Neutra";
}

interface ConfluencesCardProps {
  data: DashboardSignalResponse | null;
  state: "idle" | "loading" | "ready" | "cooldown" | "error";
}

export function ConfluencesCard({ data, state }: ConfluencesCardProps) {
  const isLoading = state === "loading";
  const confluences: ConfluenceItem[] = data?.confluences ?? [];

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-lg card-hover"
      aria-labelledby="confluences-card-title"
    >
      <h2 id="confluences-card-title" className="mb-3 text-base font-semibold text-[var(--text-primary)]">
        Confluências
      </h2>

      {isLoading && (
        <div className="flex items-center justify-center py-6" role="status" aria-live="polite">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary-blue)] border-t-transparent" aria-hidden />
        </div>
      )}

      {!isLoading && confluences.length === 0 && (
        <p className="py-4 text-sm text-[var(--text-secondary)]">Nenhuma confluência disponível.</p>
      )}

      {!isLoading && confluences.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {confluences.map((c) => (
              <div
                key={c.id}
                className="group relative inline-flex"
              >
                <span
                  className="inline-flex cursor-help items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--text-primary)]"
                  title={`${c.name}: ${c.description} (peso ${Math.round(c.weight * 100)}%)`}
                  aria-describedby={`tooltip-${c.id}`}
                >
                  <span aria-hidden>{polarityIcon(c.polarity)}</span>
                  <span>{c.name}</span>
                  <span className="sr-only">{polarityAria(c.polarity)}</span>
                </span>
                <span
                  id={`tooltip-${c.id}`}
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-48 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-2 text-xs text-[var(--text-primary)] shadow-lg group-hover:block group-focus-within:block"
                >
                  {c.description}. Peso: {Math.round(c.weight * 100)}%. Valor: {c.value}
                </span>
              </div>
            ))}
          </div>
          <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-sm">
            <span className="text-[var(--text-secondary)]">
              Score final: <strong className="text-[var(--text-primary)]">{data?.score ?? 0}</strong>
            </span>
            <span className="font-medium text-[var(--text-primary)]" aria-label={`Força ${strengthLabel(data?.score ?? 0)}`}>
              Força: {strengthLabel(data?.score ?? 0)}
            </span>
          </footer>
        </>
      )}
    </section>
  );
}
