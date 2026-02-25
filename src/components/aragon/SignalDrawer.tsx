"use client";

import { useEffect } from "react";
import { confidenceLabel, strengthLabel } from "./types";
import type { ConfluenceItem, ConfluencePolarity, DashboardSignalResponse } from "./types";

function polarityIcon(p: ConfluencePolarity): string {
  if (p === "confirm") return "✅";
  if (p === "against") return "❌";
  return "⚠️";
}

function timeframeLabel(seconds: number): string {
  if (seconds >= 3600) return `${seconds / 3600}h`;
  if (seconds >= 60) return `${seconds}min`;
  return `${seconds}s`;
}

interface SignalDrawerProps {
  open: boolean;
  onClose: () => void;
  data: DashboardSignalResponse | null;
}

export function SignalDrawer({ open, onClose, data }: SignalDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--card-bg)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 id="drawer-title" className="text-lg font-semibold text-[var(--text-primary)]">
            Detalhes do Sinal
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-[var(--border)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
            aria-label="Fechar painel de detalhes"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!data && (
            <p className="text-sm text-[var(--text-secondary)]">Nenhum sinal carregado.</p>
          )}
          {data && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Par / Timeframe</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {data.symbol} ({data.marketType}) — {timeframeLabel(data.timeframe)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Direção</p>
                <p
                  className="font-semibold"
                  style={{
                    color: data.direction === "CALL" ? "var(--call)" : data.direction === "PUT" ? "var(--put)" : "var(--none)",
                  }}
                >
                  {data.direction}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Confiança</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {data.confidence}% — {confidenceLabel(data.confidence)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Score e força</p>
                <p className="font-medium text-[var(--text-primary)]">
                  Score: {data.score} — Força: {strengthLabel(data.score)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Votos</p>
                <p className="text-[var(--text-primary)]">CALL: {data.votes.call} | PUT: {data.votes.put}</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">Confluências</p>
                <ul className="list-none space-y-2">
                  {data.confluences.map((c: ConfluenceItem) => (
                    <li
                      key={c.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm"
                    >
                      <span className="font-medium text-[var(--text-primary)]">{polarityIcon(c.polarity)} {c.name}</span>
                      <p className="mt-1 text-[var(--text-secondary)]">{c.description}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Peso: {Math.round(c.weight * 100)}% — {c.value}</p>
                    </li>
                  ))}
                </ul>
              </div>
              {data.lastUpdatedAt && (
                <p className="text-xs text-[var(--text-secondary)]">
                  Última atualização: {new Date(data.lastUpdatedAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
