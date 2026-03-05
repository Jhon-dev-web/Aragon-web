"use client";

import { tw } from "../design-tokens";

export type KpiRowProps = {
  avaliados: number;
  comCiclos: number;
  ciclosTotais: number;
  ranqueados: number;
  maxPorAtivo?: number;
  fetchPagesUsed?: number;
};

function KpiCard({
  label,
  value,
  title,
}: {
  label: string;
  value: number | string;
  title?: string;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2 border ${tw.border} ${tw.bgCard} min-w-0`}
      title={title}
    >
      <span className={`text-[10px] sm:text-xs ${tw.textMuted} block truncate`}>
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${tw.textPrimary}`}>
        {value}
      </span>
    </div>
  );
}

export function KpiRow({
  avaliados,
  comCiclos,
  ciclosTotais,
  ranqueados,
  maxPorAtivo,
  fetchPagesUsed,
}: KpiRowProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="region"
      aria-label="Resumo rápido do ranking"
    >
      <KpiCard label="Avaliados" value={avaliados} />
      <KpiCard label="Com ciclos" value={comCiclos} />
      <KpiCard
        label="Ciclos totais"
        value={ciclosTotais}
        title={
          fetchPagesUsed != null && fetchPagesUsed > 1
            ? "Maximizado via paginação"
            : undefined
        }
      />
      {maxPorAtivo != null && (
        <KpiCard
          label="Maior/ativo"
          value={maxPorAtivo}
          title={
            fetchPagesUsed != null && fetchPagesUsed > 1
              ? "Maximizado via paginação"
              : undefined
          }
        />
      )}
      <KpiCard label="Ranqueados" value={ranqueados} />
    </div>
  );
}
