"use client";

import { tw } from "../design-tokens";

export type FilterBarStrategy = { value: string; label: string };
export type FilterBarWindow = { value: number; label: string };
export type FilterBarMg = { value: string; label: string };

export type FilterBarProps = {
  strategy: string;
  onStrategyChange: (v: string) => void;
  windowMinutes: number;
  onWindowMinutesChange: (v: number) => void;
  mgMode: string;
  onMgModeChange: (v: string) => void;
  minSetups: number;
  onMinSetupsChange: (v: number) => void;
  topN: number;
  onTopNChange: (v: number) => void;
  includeOtc: boolean;
  onIncludeOtcChange: (v: boolean) => void;
  includeOpen: boolean;
  onIncludeOpenChange: (v: boolean) => void;
  strategies: FilterBarStrategy[];
  windows: FilterBarWindow[];
  mgOptions: FilterBarMg[];
  topNOptions: number[];
  maxAssets: number;
  loading: boolean;
  onAtualizar: () => void;
  onLimparFiltros: () => void;
  autoRefreshEnabled: boolean;
  onAutoRefreshChange: (v: boolean) => void;
  countdownSeconds: number;
  onStopAuto: () => void;
  autoPausedByError: boolean;
  ativosLabel: string;
  lastUpdatedLabel: string | null;
  showUpgrade?: boolean;
  onUpgradeClick?: () => void;
  compact?: boolean;
};

const selectClass = `bg-[#0B1220] border ${tw.border} rounded-lg px-3 py-2 text-sm ${tw.textPrimary} focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none min-w-0`;

export function FilterBar({
  strategy,
  onStrategyChange,
  windowMinutes,
  onWindowMinutesChange,
  mgMode,
  onMgModeChange,
  minSetups,
  onMinSetupsChange,
  topN,
  onTopNChange,
  includeOtc,
  onIncludeOtcChange,
  includeOpen,
  onIncludeOpenChange,
  strategies,
  windows,
  mgOptions,
  topNOptions,
  maxAssets,
  loading,
  onAtualizar,
  onLimparFiltros,
  autoRefreshEnabled,
  onAutoRefreshChange,
  countdownSeconds,
  onStopAuto,
  autoPausedByError,
  ativosLabel,
  lastUpdatedLabel,
  showUpgrade,
  onUpgradeClick,
  compact = false,
}: FilterBarProps) {
  return (
    <div className={`space-y-3 ${compact ? "space-y-2" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={strategy}
          onChange={(e) => onStrategyChange(e.target.value)}
          className={selectClass}
          aria-label="Estratégia"
        >
          {strategies.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={windowMinutes}
          onChange={(e) => onWindowMinutesChange(Number(e.target.value))}
          className={selectClass}
          aria-label="Janela"
        >
          {windows.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
        <select
          value={mgMode}
          onChange={(e) => onMgModeChange(e.target.value)}
          className={selectClass}
          aria-label="MG"
        >
          {mgOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2">
          <span className={`text-xs ${tw.textMuted} whitespace-nowrap`}>Min ciclos</span>
          <input
            type="number"
            min={1}
            value={minSetups}
            onChange={(e) => onMinSetupsChange(Number(e.target.value) || 10)}
            className={`w-16 sm:w-20 ${selectClass}`}
            aria-label="Mínimo de ciclos"
          />
        </label>
        <select
          value={topN}
          onChange={(e) => onTopNChange(Number(e.target.value))}
          className={selectClass}
          aria-label="Top N"
        >
          {topNOptions.map((n) => (
            <option key={n} value={n}>
              Top {n}
            </option>
          ))}
        </select>
        <span className={`text-xs ${tw.textMuted}`}>{ativosLabel}</span>
        {showUpgrade && onUpgradeClick && (
          <button
            type="button"
            onClick={onUpgradeClick}
            className="text-xs text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 rounded"
          >
            Faça upgrade
          </button>
        )}
        {/* Chips OTC / Aberto */}
        <div className="flex rounded-lg border border-[#334155] p-0.5" role="group" aria-label="Tipos de ativo">
          <button
            type="button"
            onClick={() => onIncludeOtcChange(!includeOtc)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 ${
              includeOtc ? "bg-[#2563EB]/20 text-[#93C5FD] border border-[#2563EB]/40" : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
            aria-pressed={includeOtc}
          >
            OTC
          </button>
          <button
            type="button"
            onClick={() => onIncludeOpenChange(!includeOpen)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 ${
              includeOpen ? "bg-[#2563EB]/20 text-[#93C5FD] border border-[#2563EB]/40" : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
            aria-pressed={includeOpen}
          >
            Aberto
          </button>
        </div>
        <button
          type="button"
          onClick={onLimparFiltros}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${tw.textMuted} border ${tw.border} hover:bg-[#1E293B] hover:${tw.textSecondary} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50`}
          aria-label="Limpar filtros e restaurar padrões"
        >
          Limpar filtros
        </button>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {autoPausedByError ? (
            <span className="px-2 py-1.5 rounded-lg text-xs font-medium bg-amber-900/30 text-amber-200 border border-amber-600/50">
              Auto pausado por erro
            </span>
          ) : autoRefreshEnabled ? (
            <>
              <button
                type="button"
                onClick={() => onAutoRefreshChange(false)}
                className="px-2 py-1.5 rounded-lg text-xs font-medium bg-emerald-900/30 text-emerald-200 border border-emerald-600/50"
                aria-label="Auto atualização ligada"
              >
                Auto: ON (60s)
              </button>
              <span className="tabular-nums text-xs text-[#64748B] min-w-[2.5rem]" aria-hidden>
                {String(Math.floor(countdownSeconds / 60)).padStart(2, "0")}:
                {String(countdownSeconds % 60).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={onStopAuto}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium ${tw.btnSecondary}`}
              >
                Parar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onAutoRefreshChange(true)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium ${tw.textMuted} border ${tw.border} hover:bg-[#1E293B] hover:${tw.textSecondary}`}
              aria-label="Ligar auto atualização"
            >
              Auto: OFF
            </button>
          )}
          <button
            type="button"
            onClick={onAtualizar}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${tw.btnPrimary} disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]`}
            aria-label="Atualizar ranking"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
                Atualizando…
              </>
            ) : (
              "Atualizar ranking"
            )}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {lastUpdatedLabel && (
          <span className={`text-[11px] ${tw.textMuted}`}>
            Atualizado há: {lastUpdatedLabel}
          </span>
        )}
      </div>
    </div>
  );
}
