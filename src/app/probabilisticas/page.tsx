"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  fetchCatalogRanking,
  fetchCycles,
  getCyclesRequestUrl,
  fetchHealth,
  type CatalogResponse,
  type CatalogByAsset,
  type CyclesResponse,
  type CycleItem,
} from "../api";

const AUTO_REFRESH_INTERVAL_MS = 60_000;

const WINDOWS = [
  { value: 120, label: "2h" },
  { value: 240, label: "4h" },
  { value: 1440, label: "24h" },
];

const STRATEGIES = [
  { value: "mhi", label: "MHI" },
  { value: "3mosq", label: "3 Mosqueteiros (Repetição)" },
  { value: "padrao23", label: "Padrão 23" },
];
const STRATEGY_STORAGE_KEY = "probabilisticas_strategy";

const TOP_N_OPTIONS = [5, 10, 20];

const MG_OPTIONS = [
  { value: "off", label: "OFF" },
  { value: "mg1", label: "MG1" },
];

function isOtc(asset: string): boolean {
  return asset.toUpperCase().endsWith("-OTC");
}

/** Mais assertivo: 1) maior win_total_rate, 2) empate = mais ciclos, 3) empate = menor HIT% */
function getMostAssertiveAsset(list: CatalogByAsset[]): CatalogByAsset | null {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => {
    const rateA = a.win_total_rate ?? a.win_rate ?? 0;
    const rateB = b.win_total_rate ?? b.win_rate ?? 0;
    if (rateB !== rateA) return rateB - rateA;
    const cyclesA = a.cycles ?? a.total ?? 0;
    const cyclesB = b.cycles ?? b.total ?? 0;
    if (cyclesB !== cyclesA) return cyclesB - cyclesA;
    const hitA = a.loss_rate ?? (a.total ? (a.loss ?? a.hit ?? 0) / a.total : 0);
    const hitB = b.loss_rate ?? (b.total ? (b.loss ?? b.hit ?? 0) / b.total : 0);
    return hitA - hitB;
  });
  return sorted[0] ?? null;
}

/** Símbolo para label exibível: EURUSD -> EUR/USD, EURUSD-OTC -> EUR/USD */
function symbolToLabel(symbol: string): string {
  const base = symbol.replace(/-OTC$/i, "").trim();
  if (base.length === 6 && /^[A-Z]+$/i.test(base)) {
    return `${base.slice(0, 3)}/${base.slice(3)}`;
  }
  return base;
}

const OUTCOME_COLORS: Record<string, { bg: string; text: string }> = {
  P: { bg: "bg-teal-900/50", text: "text-teal-300" },
  G1: { bg: "bg-purple-900/50", text: "text-purple-300" },
  G2: { bg: "bg-amber-900/50", text: "text-amber-300" },
  H: { bg: "bg-red-900/50", text: "text-red-300" },
};

function CycleChip({ outcome, timestamp }: { outcome: string; timestamp: number }) {
  const style = OUTCOME_COLORS[outcome] ?? { bg: "bg-[#1F2937]", text: "text-[#9CA3AF]" };
  const d = new Date(timestamp * 1000);
  const hm = d.toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit" });
  const dayMonth = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return (
    <div
      className={`rounded-lg border border-[#1F2937] p-2 min-w-0 ${style.bg} ${style.text}`}
      title={`${outcome} — ${hm} — ${dayMonth}`}
    >
      <div className="font-semibold text-xs">{outcome}</div>
      <div className="text-[10px] opacity-90">{hm}</div>
      <div className="text-[10px] opacity-80">dia {dayMonth}</div>
    </div>
  );
}

function CyclesModal({
  open,
  onClose,
  symbol,
  strategyName,
  timeframe,
  mg,
  minutes,
  mg1,
  strategyId,
}: {
  open: boolean;
  onClose: () => void;
  symbol: string;
  strategyName: string;
  timeframe: string;
  mg: string;
  minutes: number;
  mg1: boolean;
  strategyId: string;
}) {
  const [data, setData] = useState<CyclesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "P" | "G1" | "G2" | "H">("all");

  useEffect(() => {
    if (!open || !symbol) return;
    setLoading(true);
    setData(null);
    fetchCycles({ symbol, strategy: strategyId, minutes, mg1 })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, symbol, strategyId, minutes, mg1]);

  const cycles = data?.cycles ?? [];
  const filtered =
    filter === "all"
      ? cycles
      : cycles.filter((c) => c.outcome === filter);
  const counts = data?.counts ?? { P: 0, G1: 0, G2: 0, H: 0 };
  const total = data?.total ?? 0;
  const wins = (counts.P + counts.G1 + counts.G2);
  const hits = counts.H;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[#111827] border border-[#1F2937] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between p-4 border-b border-[#1F2937] shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#E5E7EB]">{symbolToLabel(symbol)}</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#374151] text-[#9CA3AF]">
                {isOtc(symbol) ? "OTC" : "OPEN"}
              </span>
              <span className="text-sm text-[#9CA3AF]">·</span>
              <span className="text-sm text-[#9CA3AF]">{strategyName}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#E5E7EB]"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Stats rápidos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg p-2 border border-[#1F2937] bg-teal-900/20 text-teal-300 text-center">
                <div className="text-xs text-[#9CA3AF]">P</div>
                <div className="font-semibold">{counts.P}</div>
                <div className="text-[10px]">{total ? ((100 * counts.P) / total).toFixed(0) : 0}%</div>
              </div>
              <div className="rounded-lg p-2 border border-[#1F2937] bg-purple-900/20 text-purple-300 text-center">
                <div className="text-xs text-[#9CA3AF]">G1</div>
                <div className="font-semibold">{counts.G1}</div>
                <div className="text-[10px]">{total ? ((100 * counts.G1) / total).toFixed(0) : 0}%</div>
              </div>
              {counts.G2 > 0 && (
                <div className="rounded-lg p-2 border border-[#1F2937] bg-amber-900/20 text-amber-300 text-center">
                  <div className="text-xs text-[#9CA3AF]">G2</div>
                  <div className="font-semibold">{counts.G2}</div>
                  <div className="text-[10px]">{total ? ((100 * counts.G2) / total).toFixed(0) : 0}%</div>
                </div>
              )}
              <div className="rounded-lg p-2 border border-[#1F2937] bg-red-900/20 text-red-300 text-center">
                <div className="text-xs text-[#9CA3AF]">H</div>
                <div className="font-semibold">{counts.H}</div>
                <div className="text-[10px]">{total ? ((100 * counts.H) / total).toFixed(0) : 0}%</div>
              </div>
            </div>

            <p className="text-sm text-[#9CA3AF]">
              {total} ciclos: {wins} wins / {hits} hits
            </p>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              {(["all", "P", "G1", "H"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    filter === f
                      ? "bg-[#2563EB]/30 border-[#2563EB]/50 text-[#93C5FD]"
                      : "bg-[#1F2937] border-[#374151] text-[#9CA3AF] hover:border-[#4B5563]"
                  }`}
                >
                  {f === "all" ? "Todos" : f}
                  {f !== "all" && counts[f as keyof typeof counts] != null && ` (${counts[f as keyof typeof counts]})`}
                </button>
              ))}
            </div>

            {/* Grade de ciclos */}
            <div className="min-h-[200px]">
              {loading && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="rounded-lg h-16 bg-[#1F2937] animate-pulse" />
                  ))}
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="py-6 space-y-2">
                  <p className="text-sm text-[#9CA3AF] text-center">Sem ciclos para este filtro.</p>
                  {process.env.NODE_ENV !== "production" && (
                    <div className="text-xs text-[#6B7280] bg-[#0B1220] border border-[#1F2937] rounded-lg p-3 font-mono break-all">
                      <div>request: {getCyclesRequestUrl({ symbol, strategy: strategyId, minutes, mg1 })}</div>
                      <div>returned: {(data?.total ?? 0)} cycles</div>
                    </div>
                  )}
                </div>
              )}
              {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {filtered.map((c: CycleItem) => (
                    <CycleChip key={c.id} outcome={c.outcome} timestamp={c.timestamp} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function RankingCard({
  row,
  strategyName,
  onVerDetalhes,
  onVerCiclos,
}: {
  row: CatalogByAsset;
  strategyName: string;
  onVerDetalhes: () => void;
  onVerCiclos: () => void;
}) {
  const cycles = row.cycles ?? row.total;
  const wins = row.wins ?? row.win_no_mg + row.win_with_mg;
  const p = row.p ?? row.win_no_mg;
  const g1 = row.g1 ?? row.win_with_mg;
  const hit = row.hit ?? row.loss;
  const winRate = row.win_rate ?? row.win_total_rate;
  const winTotalPct = (100 * winRate).toFixed(1);

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 flex flex-col shadow-[0_0_20px_rgba(37,99,235,0.06)] hover:border-[#2563EB]/50 transition-colors">
      {/* HEADER: nome do ativo + badge OTC | OPEN */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-semibold text-[#E5E7EB] truncate">{symbolToLabel(row.asset)}</span>
        <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-[#374151] text-[#9CA3AF]">
          {isOtc(row.asset) ? "OTC" : "OPEN"}
        </span>
      </div>
      {/* TÍTULO: nome da estratégia */}
      <p className="text-xs text-[#9CA3AF] mb-2">{strategyName}</p>
      {/* MÉTRICA PRINCIPAL: Win total % */}
      <div className="text-2xl font-bold text-[#22C55E] mb-1">{winTotalPct}%</div>
      {/* SUBTEXTO: ciclos — wins / hits */}
      <p className="text-xs text-[#9CA3AF] mb-3">
        {cycles} ciclos — {wins} wins / {hit} hits
      </p>
      {/* LINHA DE DISTRIBUIÇÃO: P / G1 / HIT */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        <span className="px-2 py-1 rounded bg-[#1E3A5F] text-[#3B82F6]">P → {p}</span>
        <span className="px-2 py-1 rounded bg-[#2E1F4F] text-[#A78BFA]">G1 → {g1}</span>
        <span className="px-2 py-1 rounded bg-[#3F1F1F] text-[#EF4444]">HIT → {hit}</span>
      </div>
      {/* RODAPÉ */}
      <p className="text-[10px] text-[#6B7280] mb-3">Último ciclo analisado: —</p>
      <div className="mt-auto flex flex-col gap-2">
        <button
          type="button"
          onClick={onVerCiclos}
          className="w-full py-2 rounded-lg text-sm font-medium bg-[#0F172A] text-[#94A3B8] border border-[#334155] hover:bg-[#1E293B] hover:border-[#475569] transition-colors"
        >
          Ver ciclos
        </button>
        <button
          type="button"
          onClick={onVerDetalhes}
          className="w-full py-2 rounded-lg text-sm font-medium bg-[#2563EB]/20 text-[#3B82F6] border border-[#2563EB]/40 hover:bg-[#2563EB]/30 transition-colors"
        >
          Ver detalhes
        </button>
      </div>
    </div>
  );
}

function DetailsDrawer({
  asset,
  onClose,
}: {
  asset: CatalogByAsset | null;
  onClose: () => void;
}) {
  if (!asset) return null;
  const winTotal = asset.win_no_mg + asset.win_with_mg;
  const winTotalPct = asset.total ? (100 * asset.win_total_rate).toFixed(1) : "0";
  const winNoMgPct = asset.total ? (100 * asset.win_no_mg / asset.total).toFixed(1) : "0";
  const winMg1Pct = asset.total ? (100 * asset.win_with_mg / asset.total).toFixed(1) : "0";
  const lossPct = asset.total ? (100 * asset.loss / asset.total).toFixed(1) : "0";
  const skipPct = asset.total ? (100 * asset.skip / asset.total).toFixed(1) : "0";
  const lastHitTs = asset.last_hit_ts ?? null;
  const hitStreakMax = asset.hit_streak_max ?? 0;
  const hitStreakCurrent = asset.hit_streak_current ?? 0;

  const formatHm = (ts: number | null): string => {
    if (!ts) return "-";
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#111827] border-l border-[#1F2937] shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#1F2937]">
          <h3 className="text-lg font-semibold text-[#E5E7EB]">
            {symbolToLabel(asset.asset)}
            <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-[#374151] text-[#9CA3AF]">
              {isOtc(asset.asset) ? "OTC" : "OPEN"}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#E5E7EB]"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h4 className="text-xs font-medium text-[#9CA3AF] mb-2">Taxas (%)</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-[#0B1220] rounded-lg p-3 border border-[#1F2937]">
                <span className="text-[#9CA3AF] block text-xs">Win total</span>
                <span className="font-semibold text-[#22C55E]">{winTotalPct}%</span>
              </div>
              <div className="bg-[#0B1220] rounded-lg p-3 border border-[#1F2937]">
                <span className="text-[#9CA3AF] block text-xs">Win sem MG</span>
                <span className="font-semibold text-[#E5E7EB]">{winNoMgPct}%</span>
              </div>
              <div className="bg-[#0B1220] rounded-lg p-3 border border-[#1F2937]">
                <span className="text-[#9CA3AF] block text-xs">Win MG1</span>
                <span className="font-semibold text-[#93C5FD]">{winMg1Pct}%</span>
              </div>
              <div className="bg-[#0B1220] rounded-lg p-3 border border-[#1F2937]">
                <span className="text-[#9CA3AF] block text-xs">Loss</span>
                <span className="font-semibold text-[#EF4444]">{lossPct}%</span>
              </div>
              <div className="bg-[#0B1220] rounded-lg p-3 border border-[#1F2937] col-span-2">
                <span className="text-[#9CA3AF] block text-xs">Skip</span>
                <span className="font-semibold text-[#E5E7EB]">{skipPct}%</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-[#9CA3AF] mb-2">Contadores</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-[#0B1220] rounded-lg p-3 border border-[#1F2937]">
                <span className="text-[#9CA3AF] block text-xs">Total</span>
                <span className="font-semibold text-[#E5E7EB]">{asset.total}</span>
              </div>
              <div className="bg-[#0B1220] rounded-lg p-3 border border-[#1F2937]">
                <span className="text-[#9CA3AF] block text-xs">Wins (no MG + MG1)</span>
                <span className="font-semibold text-[#22C55E]">{winTotal}</span>
              </div>
              <div className="bg-[#0B1220] rounded-lg p-3 border border-[#1F2937]">
                <span className="text-[#9CA3AF] block text-xs">Win sem MG</span>
                <span className="font-semibold text-[#E5E7EB]">{asset.win_no_mg}</span>
              </div>
              <div className="bg-[#0B1220] rounded-lg p-3 border border-[#1F2937]">
                <span className="text-[#9CA3AF] block text-xs">Win MG1</span>
                <span className="font-semibold text-[#93C5FD]">{asset.win_with_mg}</span>
              </div>
              <div className="bg-[#0B1220] rounded-lg p-3 border border-[#1F2937]">
                <span className="text-[#9CA3AF] block text-xs">Loss</span>
                <span className="font-semibold text-[#EF4444]">{asset.loss}</span>
              </div>
              <div className="bg-[#0B1220] rounded-lg p-3 border border-[#1F2937]">
                <span className="text-[#9CA3AF] block text-xs">Score</span>
                <span className="font-semibold text-[#E5E7EB]">{asset.score.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-[#9CA3AF] mb-2">Ciclos (P, G1, HIT)</h4>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-2 py-1 rounded bg-[#1E3A5F] text-[#3B82F6]">P → {asset.p ?? asset.win_no_mg}</span>
              <span className="px-2 py-1 rounded bg-[#2E1F4F] text-[#A78BFA]">G1 → {asset.g1 ?? asset.win_with_mg}</span>
              <span className="px-2 py-1 rounded bg-[#3F1F1F] text-[#EF4444]">HIT → {asset.hit ?? asset.loss}</span>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-[#9CA3AF] mb-2">Histórico de HIT</h4>
            {lastHitTs === null ? (
              <p className="text-xs text-[#9CA3AF]">Nenhum HIT na janela.</p>
            ) : (
              <div className="space-y-1 text-xs text-[#E5E7EB]">
                <p>
                  Último HIT: <span className="font-semibold">{formatHm(lastHitTs)}</span>
                </p>
                <p>
                  Sequência máxima de HIT:{" "}
                  <span className="font-semibold">{hitStreakMax}</span>
                </p>
                <p>
                  Sequência atual de HIT:{" "}
                  <span
                    className={`font-semibold ${
                      hitStreakCurrent > 0 ? "text-[#EF4444]" : "text-[#E5E7EB]"
                    }`}
                  >
                    {hitStreakCurrent}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProbabilisticasPage() {
  const searchParams = useSearchParams();
  const [strategy, setStrategy] = useState("mhi");
  const [windowMinutes, setWindowMinutes] = useState(120);
  const [mgMode, setMgMode] = useState("mg1");
  const [minSetups, setMinSetups] = useState(10);
  const [topN, setTopN] = useState(5);
  const [includeOtc, setIncludeOtc] = useState(true);
  const [includeOpen, setIncludeOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rankingResult, setRankingResult] = useState<CatalogResponse | null>(null);
  const [serverNow, setServerNow] = useState<string | null>(null);
  const [detailsAsset, setDetailsAsset] = useState<CatalogByAsset | null>(null);
  const [cyclesModal, setCyclesModal] = useState<{
    symbol: string;
    strategyId: string;
    strategyName: string;
    windowMinutes: number;
    mg1: boolean;
  } | null>(null);
  const [removedStrategyToast, setRemovedStrategyToast] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [autoPausedByError, setAutoPausedByError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rankingControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);

  useEffect(() => {
    fetchHealth()
      .then((h) => setServerNow(h.server_now))
      .catch(() => setServerNow(null));
  }, []);

  // Carregar estratégia de query ou localStorage; fallback se for estratégia removida
  useEffect(() => {
    const fromQuery = searchParams?.get("strategy");
    const fromStorage =
      typeof window !== "undefined" ? localStorage.getItem(STRATEGY_STORAGE_KEY) : null;
    const saved = fromQuery ?? fromStorage ?? "mhi";
    if (saved === "mosqueteiros_rep" || saved === "3mosq") {
      setStrategy("mhi");
      setRemovedStrategyToast(true);
      if (typeof window !== "undefined") localStorage.setItem(STRATEGY_STORAGE_KEY, "mhi");
      const t = setTimeout(() => setRemovedStrategyToast(false), 6000);
      return () => clearTimeout(t);
    }
    if (saved && saved !== strategy) setStrategy(saved);
  }, [searchParams]);

  // Persistir estratégia ao trocar
  useEffect(() => {
    if (strategy && strategy !== "mosqueteiros_rep" && strategy !== "3mosq" && typeof window !== "undefined")
      localStorage.setItem(STRATEGY_STORAGE_KEY, strategy);
  }, [strategy]);

  const fetchRanking = useCallback(async () => {
    rankingControllerRef.current?.abort();
    rankingControllerRef.current = new AbortController();
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    setDetailsAsset(null);
    try {
      const data = await fetchCatalogRanking(
        {
          minutes: windowMinutes,
          min_setups: minSetups,
          top_n: topN,
          include_otc: includeOtc,
          include_open: includeOpen,
          strategy_id: strategy,
          mg1: mgMode === "mg1",
        },
        rankingControllerRef.current.signal
      );
      setRankingResult(data);
      consecutiveErrorsRef.current = 0;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao atualizar ranking";
      setError(msg);
      consecutiveErrorsRef.current += 1;
      if (consecutiveErrorsRef.current >= 2) {
        setAutoRefreshEnabled(false);
        setAutoPausedByError(true);
      }
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [strategy, windowMinutes, minSetups, topN, includeOtc, includeOpen, mgMode]);

  const handleAtualizarRanking = useCallback(() => {
    setAutoPausedByError(false);
    setAutoRefreshEnabled(true);
    setCountdownSeconds(60);
    fetchRanking();
  }, [fetchRanking]);

  const stopAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Auto-refresh: a cada 60s quando ligado; só dispara se aba visível e nenhum refresh em andamento
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    intervalRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (inFlightRef.current) return;
      fetchRanking();
      setCountdownSeconds(60);
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled, fetchRanking]);

  // Countdown 60 -> 0 a cada segundo (apenas exibição; o refresh é pelo interval de 60s)
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    countdownRef.current = setInterval(() => {
      setCountdownSeconds((s) => (s <= 1 ? 60 : s - 1));
    }, 1000);
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [autoRefreshEnabled]);

  // Limpar intervalos ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    };
  }, []);

  const topList = Array.isArray(rankingResult?.top) ? rankingResult.top : [];
  const hasNoResults = rankingResult != null && (topList.length === 0 || (rankingResult.count_ranked ?? 0) === 0);
  const mostAssertive = getMostAssertiveAsset(topList);
  const cyclesTotal = rankingResult?.summary?.setups_total ?? rankingResult?.summary?.total ?? 0;
  const maxCyclesPerAsset = rankingResult?.debug?.max_setups_per_asset ?? 0;
  const fetchPagesUsed = rankingResult?.debug?.fetch_pages_used;

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB] flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937] shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">AA</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#E5E7EB]">ARAGON ANALYTICS</h1>
            <p className="text-xs text-[#9CA3AF]">Trading Intelligence Platform</p>
          </div>
        </Link>
      </header>

      {/* Topbar fixo com filtros */}
      <div className="sticky top-0 z-30 bg-[#0B1220] border-b border-[#1F2937] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
          >
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={windowMinutes}
            onChange={(e) => setWindowMinutes(Number(e.target.value))}
            className="bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
          >
            {WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
          <select
            value={mgMode}
            onChange={(e) => setMgMode(e.target.value)}
            className="bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
          >
            {MG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2">
            <span className="text-xs text-[#9CA3AF]">Min ciclos</span>
            <input
              type="number"
              min={1}
              value={minSetups}
              onChange={(e) => setMinSetups(Number(e.target.value) || 10)}
              className="w-20 bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
            />
          </label>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
          >
            {TOP_N_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Top {n}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeOtc}
              onChange={(e) => setIncludeOtc(e.target.checked)}
              className="rounded border-[#1F2937] bg-[#111827] text-[#2563EB]"
            />
            <span className="text-xs text-[#9CA3AF]">mostrar OTC</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeOpen}
              onChange={(e) => setIncludeOpen(e.target.checked)}
              className="rounded border-[#1F2937] bg-[#111827] text-[#2563EB]"
            />
            <span className="text-xs text-[#9CA3AF]">mostrar aberto</span>
          </label>
          <button
            type="button"
            onClick={handleAtualizarRanking}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] disabled:bg-[#1F2937] disabled:text-[#6B7280] text-white transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Atualizando…
              </>
            ) : (
              "Atualizar ranking"
            )}
          </button>
          {autoPausedByError ? (
            <span className="px-2 py-1.5 rounded-lg text-xs font-medium bg-amber-900/30 text-amber-200 border border-amber-600/50">
              Auto pausado por erro
            </span>
          ) : autoRefreshEnabled ? (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1.5 rounded-lg text-xs font-medium bg-[#166534]/30 text-[#86EFAC] border border-[#166534]/50">
                Auto: ON (60s)
              </span>
              <span className="tabular-nums text-xs text-[#9CA3AF] min-w-[2.5rem]">
                {String(Math.floor(countdownSeconds / 60)).padStart(2, "0")}:
                {String(countdownSeconds % 60).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={stopAutoRefresh}
                className="px-2 py-1.5 rounded-lg text-xs font-medium bg-[#1F2937] border border-[#374151] text-[#9CA3AF] hover:bg-[#374151] hover:text-[#E5E7EB]"
              >
                Parar
              </button>
            </div>
          ) : (
            <span className="px-2 py-1.5 rounded-lg text-xs font-medium text-[#6B7280] border border-[#1F2937]">
              Auto: OFF
            </span>
          )}
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            {rankingResult != null && rankingResult.debug && (
              <>
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111827] border border-[#1F2937] text-[#9CA3AF]">
                  Avaliados: {rankingResult.debug.assets_total ?? 0}
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111827] border border-[#1F2937] text-[#9CA3AF]">
                  Com ciclos: {rankingResult.debug.assets_with_setups ?? 0}
                </span>
                <span
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111827] border border-[#1F2937] text-[#9CA3AF]"
                  title={fetchPagesUsed != null && fetchPagesUsed > 1 ? "Maximizado via paginação" : undefined}
                >
                  Ciclos totais: {cyclesTotal}
                </span>
                <span
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111827] border border-[#1F2937] text-[#9CA3AF]"
                  title={fetchPagesUsed != null && fetchPagesUsed > 1 ? "Maximizado via paginação" : undefined}
                >
                  Maior por ativo: {maxCyclesPerAsset}
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111827] border border-[#1F2937] text-[#9CA3AF]">
                  Ranqueados: {rankingResult.count_ranked ?? 0}
                </span>
              </>
            )}
            {serverNow && (
              <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2563EB]/20 text-[#3B82F6] border border-[#2563EB]/40">
                {serverNow}
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-6 pb-24">
        {removedStrategyToast && (
          <div className="mb-4 bg-amber-900/30 border border-amber-500 rounded-xl px-4 py-2 text-amber-200 text-sm">
            Estratégia removida: usando MHI.
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-600 rounded-xl px-4 py-3 text-red-200 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Falha ao atualizar: {error}</span>
            <button
              type="button"
              onClick={() => fetchRanking()}
              disabled={loading}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-50"
            >
              Tentar novamente
            </button>
          </div>
        )}
        {rankingResult?.warning && !error && (
          <div className="mb-4 bg-amber-900/30 border border-amber-600 rounded-xl px-4 py-3 text-amber-200 text-sm">
            <p>{rankingResult.warning}</p>
            <Link
              href="/login"
              className="inline-block mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600/50 hover:bg-amber-600/70 text-white transition-colors"
            >
              Ir para Login
            </Link>
            {rankingResult.stats && Object.keys(rankingResult.stats).length > 0 && (
              <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(rankingResult.stats, null, 2)}</pre>
            )}
          </div>
        )}
        {rankingResult?.debug?.max_setups_per_asset != null &&
          rankingResult.debug.max_setups_per_asset > 0 && (() => {
            const expected = windowMinutes === 120 ? 20 : windowMinutes === 240 ? 40 : 250;
            const maxSetups = rankingResult!.debug!.max_setups_per_asset!;
            return maxSetups < expected / 2 ? (
              <div className="mb-4 bg-amber-900/30 border border-amber-600 rounded-xl px-4 py-2 text-amber-200 text-sm">
                Poucos candles na janela — verifique limite de histórico da API. (Máx ciclos: {maxSetups}, esperado ~{expected}+)
              </div>
            ) : null;
          })()}

        {!rankingResult && !loading && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-8 text-center text-[#9CA3AF]">
            Ajuste os filtros no topo e clique em &quot;Atualizar ranking&quot;.
          </div>
        )}
        {loading && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-8 text-center text-[#9CA3AF] flex flex-col items-center gap-3">
            <span className="inline-block w-8 h-8 border-2 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
            Atualizando ranking…
          </div>
        )}
        {rankingResult && !loading && hasNoResults && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 max-w-2xl">
            <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">Sem resultados para esta janela</h3>
            <p className="text-sm text-[#9CA3AF] mb-4">
              Nenhum ativo passou no filtro (min ciclos). A estratégia ainda gerou estatísticas agregadas abaixo.
            </p>
            {/* Summary agregado: sempre exibir % mesmo com ranking vazio */}
            {rankingResult.summary && (
              <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-lg bg-[#0B1220] border border-[#1F2937]">
                <div className="text-center">
                  <span className="text-xs text-[#9CA3AF] block">WIN sem MG %</span>
                  <span className="font-semibold text-[#3B82F6]">
                    {((rankingResult.summary.win_no_mg_rate ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-[#9CA3AF] block">WIN com MG %</span>
                  <span className="font-semibold text-[#A78BFA]">
                    {((rankingResult.summary.win_with_mg_rate ?? rankingResult.summary.win_total_rate ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-[#9CA3AF] block">HIT %</span>
                  <span className="font-semibold text-[#EF4444]">
                    {((rankingResult.summary.hit_rate ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
            <p className="text-sm text-[#E5E7EB] mb-4">
              Nenhum ativo passou min_setups ({minSetups}), mas a estratégia teve{" "}
              <strong>{rankingResult?.summary?.setups_total ?? rankingResult?.summary?.total ?? 0}</strong> setups no total
              ({(rankingResult?.debug?.assets_with_setups ?? rankingResult?.summary?.assets_with_setups ?? 0)} ativos com ciclos).
            </p>
            {rankingResult?.debug && (
              <div className="space-y-2 text-sm text-[#D1D5DB] mb-4">
                <p>
                  <span className="text-[#9CA3AF]">Ativos:</span>{" "}
                  {rankingResult.debug.assets_ranked ?? 0} ranqueados de {rankingResult.debug.assets_total ?? 0} avaliados
                  {rankingResult.debug.reason === "min_setups_filter" && " (filtro min ciclos)"}
                </p>
                <p>
                  <span className="text-[#9CA3AF]">Contadores:</span>{" "}
                  quadrants_checked_total: {rankingResult.debug.quadrants_checked_total ?? 0} — skip_missing_total:{" "}
                  {rankingResult.debug.skip_missing_total ?? 0} — skip_doji_ref_total:{" "}
                  {rankingResult.debug.skip_doji_ref_total ?? 0} — setups_total:{" "}
                  {rankingResult.debug.setups_total ?? rankingResult.debug.total_setups_sum ?? 0}
                </p>
                {rankingResult.debug.note && (
                  <p className="text-xs text-amber-400/90 mt-2">{rankingResult.debug.note}</p>
                )}
              </div>
            )}
            <p className="text-sm text-[#93C5FD]">
              {minSetups > 3
                ? "Tente reduzir Min ciclos para 3 para ver mais ativos."
                : "Dica: aumente a janela para 4h/24h para mais ciclos."}
            </p>
            {rankingResult?.summary?.max_cycles != null && (
              <p className="text-sm text-[#9CA3AF] mt-2">
                Max ciclos encontrados nesta janela: <strong>{rankingResult.summary.max_cycles}</strong> (por ativo)
              </p>
            )}
            {rankingResult?.debug?.max_setups_per_asset != null && (
              <p className="text-sm text-[#9CA3AF] mt-2">
                Max ciclos encontrados nesta janela:{" "}
                <strong>{rankingResult.debug.max_setups_per_asset}</strong> (por ativo)
              </p>
            )}
          </div>
        )}
        {rankingResult && !loading && !hasNoResults && (
          <>
            {mostAssertive && (
              <p className="mb-4 text-sm text-[#E5E7EB]">
                <span className="text-[#9CA3AF]">Mais assertivo agora: </span>
                <span className="font-semibold text-[#22C55E]">
                  {symbolToLabel(mostAssertive.asset)} ({(100 * (mostAssertive.win_total_rate ?? mostAssertive.win_rate ?? 0)).toFixed(1)}% • {mostAssertive.cycles ?? mostAssertive.total ?? 0} ciclos • Score {(mostAssertive.score ?? 0).toFixed(2)})
                </span>
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topList.map((row) => (
              <RankingCard
                key={row.asset}
                row={row}
                strategyName={STRATEGIES.find((s) => s.value === strategy)?.label ?? "MHI"}
                onVerDetalhes={() => setDetailsAsset(row)}
                onVerCiclos={() => {
                  const payload = {
                    symbol: row.asset,
                    strategy,
                    strategyName: STRATEGIES.find((s) => s.value === strategy)?.label ?? "MHI",
                    timeframe: WINDOWS.find((w) => w.value === windowMinutes)?.label ?? "2h",
                    mg: mgMode,
                    window: windowMinutes,
                    minCycles: minSetups,
                    showOtc: includeOtc,
                    showOpen: includeOpen,
                  };
                  if (process.env.NODE_ENV !== "production") {
                    // eslint-disable-next-line no-console
                    console.log("[Ver ciclos] payload enviado para a API:", payload);
                  }
                  setCyclesModal({
                    symbol: row.asset,
                    strategyId: strategy,
                    strategyName: STRATEGIES.find((s) => s.value === strategy)?.label ?? "MHI",
                    windowMinutes: windowMinutes,
                    mg1: mgMode === "mg1",
                  });
                }}
              />
            ))}
            </div>
          </>
        )}
      </main>

      <DetailsDrawer asset={detailsAsset} onClose={() => setDetailsAsset(null)} />
      <CyclesModal
        open={cyclesModal != null}
        onClose={() => setCyclesModal(null)}
        symbol={cyclesModal?.symbol ?? ""}
        strategyName={cyclesModal?.strategyName ?? ""}
        timeframe={WINDOWS.find((w) => w.value === (cyclesModal?.windowMinutes ?? 120))?.label ?? "2h"}
        mg={cyclesModal?.mg1 ? "MG1" : "none"}
        minutes={cyclesModal?.windowMinutes ?? 120}
        mg1={cyclesModal?.mg1 ?? true}
        strategyId={cyclesModal?.strategyId ?? "mhi"}
      />

      <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around py-3 px-4 bg-[#0B1220] border-t border-[#1F2937]">
        <Link href="/" className="flex flex-col items-center gap-1 text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs">Análise</span>
        </Link>
        <span className="flex flex-col items-center gap-1 text-[#3B82F6]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-xs">Probabilísticas</span>
        </span>
        <Link href="/login" className="flex flex-col items-center gap-1 text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <span className="text-xs">Corretora</span>
        </Link>
      </nav>
    </div>
  );
}
