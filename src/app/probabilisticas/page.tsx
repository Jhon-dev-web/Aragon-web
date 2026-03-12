"use client";

/**
 * Aragon Analytics — Dashboard de probabilidade e ranking.
 * Refatoração UI/UX: apenas layout e apresentação; endpoints, cálculos e dados inalterados.
 * Componentes: HeaderBar (com ícone de presente para código promocional), KpiRow, BestNowHighlight, FilterBar, PairCard.
 * Ordenação (assertividade/score/ciclos) e "Atualizado há" são apenas no front.
 */
import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react";
import Link from "next/link";
import {
  billingCheckout,
  fetchCatalogRanking,
  fetchCycles,
  getCyclesRequestUrl,
  getAuthToken,
  getCurrentUserEmail,
  redeemPromoCode,
  startTrial,
  type CatalogResponse,
  type CatalogByAsset,
  type CyclesResponse,
  type CycleItem,
  type PaymentMethod,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { useBroker } from "../context/BrokerContext";
import { useSearchParams, useRouter } from "next/navigation";
import { isOtc, symbolToLabel } from "./utils";
import {
  HeaderBar,
  KpiRow,
  BestNowHighlight,
  FilterBar,
  PairCard,
} from "./components";

const AUTO_REFRESH_INTERVAL_MS = 60_000;

const WINDOWS = [
  { value: 120, label: "2h" },
  { value: 240, label: "4h" },
  { value: 1440, label: "24h" },
];

const STRATEGIES = [
  { value: "mhi", label: "MHI" },
  { value: "milhao", label: "MILHÃO MINORIA" },
  { value: "milhonaria", label: "MILHONARIA" },
  { value: "3mosq", label: "3 Mosqueteiros (Repetição)" },
  { value: "padrao23", label: "Padrão 23" },
];
const STRATEGY_STORAGE_KEY = "probabilisticas_strategy";

const TOP_N_OPTIONS = [1, 2, 3, 5, 10, 20];
const PREFS_KEY = "aa_prob_prefs";

const MG_OPTIONS = [
  { value: "off", label: "OFF" },
  { value: "mg1", label: "MG1" },
];

function formatExpiry(iso?: string | null): string {
  if (!iso) return "Sem expiração";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sem expiração";
  return d.toLocaleDateString("pt-BR");
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

function loadPrefs(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function savePrefs(prefs: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function ProbabilisticasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { planLimits, user, loading: authLoading, logout, fetchUser, isAdmin } = useAuth();
  const maxStrategies = planLimits.maxStrategies;
  const maxAssets = planLimits.maxAssets;
  const allowedStrategies = STRATEGIES.slice(0, maxStrategies);
  const allowedTopNOptions = TOP_N_OPTIONS.filter((n) => n <= maxAssets);
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
  const broker = useBroker();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeCpf, setUpgradeCpf] = useState("");
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState<PaymentMethod>("PIX");
  const [checkoutPlanLoading, setCheckoutPlanLoading] = useState<"advanced" | "pro_plus" | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [sortOrder, setSortOrder] = useState<"assertividade" | "score" | "ciclos">("assertividade");
  const [startTrialLoading, setStartTrialLoading] = useState(false);
  const [trialCountdownSeconds, setTrialCountdownSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (lastUpdatedAt == null) return;
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [lastUpdatedAt]);

  const expiryIso = user?.subscription_expires_at ?? user?.plan_expires_at;
  useEffect(() => {
    if (user?.plan_status !== "trial" || !expiryIso) {
      setTrialCountdownSeconds(null);
      return;
    }
    const update = () => {
      const end = new Date(expiryIso).getTime();
      const now = Date.now();
      const sec = Math.max(0, Math.floor((end - now) / 1000));
      setTrialCountdownSeconds(sec);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [user?.plan_status, expiryIso]);

  useEffect(() => {
    if (authLoading) return;
    if (!user && !getAuthToken()) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const prefsChecked = useRef(false);
  useEffect(() => {
    if (prefsChecked.current) return;
    prefsChecked.current = true;
    const prefs = loadPrefs();
    if (prefs) {
      if (typeof prefs.strategy === "string") setStrategy(prefs.strategy);
      if (typeof prefs.windowMinutes === "number") setWindowMinutes(prefs.windowMinutes);
      if (typeof prefs.mgMode === "string") setMgMode(prefs.mgMode);
      if (typeof prefs.minSetups === "number") setMinSetups(prefs.minSetups);
      if (typeof prefs.topN === "number") setTopN(prefs.topN);
      if (typeof prefs.includeOtc === "boolean") setIncludeOtc(prefs.includeOtc);
      if (typeof prefs.includeOpen === "boolean") setIncludeOpen(prefs.includeOpen);
    } else {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    if (allowedStrategies.length && !allowedStrategies.some((s) => s.value === strategy)) {
      setStrategy(allowedStrategies[0]?.value ?? "mhi");
    }
    if (maxAssets > 0 && topN > maxAssets) {
      const capped = allowedTopNOptions.length ? Math.min(maxAssets, allowedTopNOptions[allowedTopNOptions.length - 1]!) : maxAssets;
      setTopN(capped);
    }
  }, [maxAssets, strategy, topN, allowedStrategies, allowedTopNOptions]);

  useEffect(() => {
    if (prefsChecked.current && !showOnboarding) {
      savePrefs({
        strategy,
        windowMinutes,
        minSetups,
        topN,
        includeOtc,
        includeOpen,
        mgMode,
      });
    }
  }, [showOnboarding, strategy, windowMinutes, minSetups, topN, includeOtc, includeOpen, mgMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 640) setPromoExpanded(false);
  }, []);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rankingControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const rankingRequestIdRef = useRef(0);
  const currentRankingRequestIdRef = useRef(0);
  const userCancelledRequestIdRef = useRef<number | null>(null);

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
    const myId = rankingRequestIdRef.current + 1;
    rankingRequestIdRef.current = myId;
    if (rankingControllerRef.current) {
      userCancelledRequestIdRef.current = currentRankingRequestIdRef.current;
      rankingControllerRef.current.abort();
    }
    currentRankingRequestIdRef.current = myId;
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
          top_n: Math.min(topN, maxAssets),
          include_otc: includeOtc,
          include_open: includeOpen,
          strategy_id: strategy,
          mg1: mgMode === "mg1",
        },
        rankingControllerRef.current.signal
      );
      setRankingResult(data);
      setLastUpdatedAt(Date.now());
      consecutiveErrorsRef.current = 0;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError" && userCancelledRequestIdRef.current === myId) {
        userCancelledRequestIdRef.current = null;
        return;
      }
      // Não mostrar erro se este request já foi substituído (ex.: usuário trocou de estratégia)
      if (currentRankingRequestIdRef.current !== myId) return;
      const msg = e instanceof Error ? e.message : "Erro ao atualizar ranking";
      setError(msg);
      if (msg.includes("HTTP 403")) setShowUpgradeModal(true);
      consecutiveErrorsRef.current += 1;
      if (consecutiveErrorsRef.current >= 2) {
        setAutoRefreshEnabled(false);
        setAutoPausedByError(true);
      }
    } finally {
      if (currentRankingRequestIdRef.current === myId) {
        setLoading(false);
        inFlightRef.current = false;
      }
    }
  }, [strategy, windowMinutes, minSetups, topN, includeOtc, includeOpen, mgMode, maxAssets]);

  const handleAtualizarRanking = useCallback(() => {
    setAutoPausedByError(false);
    setAutoRefreshEnabled(true);
    setCountdownSeconds(60);
    fetchRanking();
  }, [fetchRanking]);

  const clearFilters = useCallback(() => {
    setStrategy("mhi");
    setWindowMinutes(120);
    setMgMode("mg1");
    setMinSetups(10);
    setTopN(Math.min(5, maxAssets));
    setIncludeOtc(true);
    setIncludeOpen(true);
  }, [maxAssets]);

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

  // Ao mudar de estratégia, atualizar o ranking automaticamente (evita primeiro render)
  const strategyChangedRef = useRef(false);
  useEffect(() => {
    if (!strategyChangedRef.current) {
      strategyChangedRef.current = true;
      return;
    }
    fetchRanking();
  }, [strategy, fetchRanking]);

  const topList = Array.isArray(rankingResult?.top) ? rankingResult.top : [];
  const sortedTopList = useMemo(() => {
    const list = [...topList];
    if (sortOrder === "assertividade") {
      list.sort((a, b) => {
        const ra = a.win_total_rate ?? a.win_rate ?? 0;
        const rb = b.win_total_rate ?? b.win_rate ?? 0;
        return rb - ra;
      });
    } else if (sortOrder === "score") {
      list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    } else {
      list.sort((a, b) => (b.cycles ?? b.total ?? 0) - (a.cycles ?? a.total ?? 0));
    }
    return list;
  }, [topList, sortOrder]);
  const hasNoResults = rankingResult != null && (topList.length === 0 || (rankingResult.count_ranked ?? 0) === 0);
  const mostAssertive = getMostAssertiveAsset(topList);
  const cyclesTotal = rankingResult?.summary?.setups_total ?? rankingResult?.summary?.total ?? 0;

  const lastUpdatedLabel = lastUpdatedAt
    ? (() => {
        const sec = Math.floor((Date.now() - lastUpdatedAt) / 1000);
        if (sec < 60) return "agora";
        const min = Math.floor(sec / 60);
        return min === 1 ? "1 min" : `${min} min`;
      })()
    : null;
  const lastUpdatedTime = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;
  const maxCyclesPerAsset = rankingResult?.debug?.max_setups_per_asset ?? 0;
  const fetchPagesUsed = rankingResult?.debug?.fetch_pages_used;
  const currentPlanLabel =
    user?.plan === "pro_plus" || user?.plan === "vitalicio"
      ? "PRO+ Vitalício"
      : user?.plan_status === "trial"
        ? "Trial"
        : user?.plan === "advanced" || user?.plan === "avancado"
          ? "Avançado"
          : "Sem acesso";
  const planExpiryText =
    user?.plan_status === "trial"
      ? (trialCountdownSeconds != null
          ? ` · ${trialCountdownSeconds <= 0 ? "encerrado" : `${Math.floor(trialCountdownSeconds / 86400)}d ${Math.floor((trialCountdownSeconds % 86400) / 3600)}h restantes`}`
          : ` · expira em ${formatExpiry(user?.subscription_expires_at ?? user?.plan_expires_at)}`)
      : user?.plan === "advanced" || user?.plan === "avancado"
        ? ` · expira em ${formatExpiry(user?.plan_expires_at)}`
        : "";
  const onlyDigits = (s: string) => s.replace(/\D/g, "").slice(0, 11);
  const formatCpfDisplay = (s: string) => {
    const d = onlyDigits(s);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const handleUpgradeCheckout = useCallback(async (plan: "advanced" | "pro_plus") => {
    const cpfDigits = onlyDigits(upgradeCpf);
    if (cpfDigits.length !== 11) {
      setError("Informe seu CPF (11 dígitos) para gerar a cobrança. O Asaas exige essa identificação.");
      return;
    }
    try {
      setCheckoutPlanLoading(plan);
      setError(null);
      const checkout = await billingCheckout(plan, cpfDigits, "UNDEFINED");
      const url = checkout.checkout_url ?? checkout.init_point;
      if (!url) throw new Error("Checkout sem URL");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar checkout");
    } finally {
      setCheckoutPlanLoading(null);
    }
  }, [upgradeCpf]);

  const handleRedeemPromo = useCallback(async () => {
    const code = promoCode.trim();
    if (!code) {
      setPromoFeedback({ type: "error", text: "Informe um código promocional." });
      return;
    }
    try {
      setPromoLoading(true);
      setPromoFeedback(null);
      const result = await redeemPromoCode(code);
      await fetchUser();
      setPromoFeedback({
        type: "success",
        text: `Código ativado com sucesso. Benefício ativo até ${formatExpiry(result.expires_at)}.`,
      });
      setPromoCode("");
    } catch (err) {
      setPromoFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Falha ao ativar código.",
      });
    } finally {
      setPromoLoading(false);
    }
  }, [promoCode, fetchUser]);

  const handleStartTrial = useCallback(async () => {
    try {
      setStartTrialLoading(true);
      setError(null);
      await startTrial();
      await fetchUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar o trial.");
    } finally {
      setStartTrialLoading(false);
    }
  }, [fetchUser]);

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB] flex flex-col">
      {showOnboarding && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-[#E5E7EB] mb-2">Configuração rápida</h2>
            <p className="text-sm text-[#9CA3AF] mb-4">
              Use os valores padrão e clique em &quot;Rodar ranking&quot; para ver o painel. Estratégia: MHI · Janela: 2h · MG1 · Min ciclos: 10 · Top: {Math.min(5, maxAssets)} · OTC ativado.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  savePrefs({
                    strategy,
                    windowMinutes,
                    minSetups,
                    topN,
                    includeOtc,
                    includeOpen,
                    mgMode,
                  });
                  setShowOnboarding(false);
                  handleAtualizarRanking();
                }}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white"
              >
                Rodar ranking
              </button>
              <button
                type="button"
                onClick={() => {
                  savePrefs({
                    strategy,
                    windowMinutes,
                    minSetups,
                    topN,
                    includeOtc,
                    includeOpen,
                    mgMode,
                  });
                  setShowOnboarding(false);
                }}
                className="px-4 py-3 rounded-xl text-sm font-medium bg-[#1F2937] border border-[#374151] text-[#E5E7EB]"
              >
                Depois
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-[#E5E7EB] mb-2">Faça upgrade</h2>
            <p className="text-sm text-[#9CA3AF] mb-2">
              Assine Avançado ou PRO+ Vitalício para liberar todas as estratégias e ativos.
            </p>
            <p className="text-xs text-[#6B7280] mb-2">
              O Asaas exige CPF para gerar a cobrança. Você não preenche na página deles.
            </p>
            <label className="block mb-3">
              <span className="block text-xs text-[#6B7280] mb-1">CPF</span>
              <input
                type="text"
                value={formatCpfDisplay(upgradeCpf)}
                onChange={(e) => { setUpgradeCpf(e.target.value); setError(null); }}
                placeholder="000.000.000-00"
                className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB] placeholder-[#6B7280] focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 focus:outline-none"
              />
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleUpgradeCheckout("advanced")}
                disabled={checkoutPlanLoading !== null}
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-center bg-gradient-to-r from-[#4F46E5] to-[#2563EB] hover:brightness-110 text-white disabled:opacity-60"
              >
                {checkoutPlanLoading === "advanced" ? "Redirecionando..." : "Assinar Avançado R$ 47,90/mês"}
              </button>
              <button
                type="button"
                onClick={() => handleUpgradeCheckout("pro_plus")}
                disabled={checkoutPlanLoading !== null}
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-center bg-[#7C3AED] hover:bg-[#8B5CF6] text-white disabled:opacity-60"
              >
                {checkoutPlanLoading === "pro_plus" ? "Redirecionando..." : "Pro+ Vitalício R$ 199"}
              </button>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-[#1F2937] border border-[#374151] text-[#E5E7EB]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <HeaderBar
        userEmail={user?.email ?? getCurrentUserEmail() ?? ""}
        userName={user?.name}
        planLabel={currentPlanLabel}
        planExpiryText={planExpiryText}
        brokerStatus={
          broker.loading
            ? "Verificando corretora…"
            : broker.connected
            ? "Corretora conectada"
            : "Corretora indisponível"
        }
        onLogout={() => {
          logout();
          router.push("/login");
        }}
        showAdminLink={isAdmin}
        promoCode={promoCode}
        onPromoCodeChange={setPromoCode}
        onRedeemPromo={handleRedeemPromo}
        promoLoading={promoLoading}
        promoFeedback={promoFeedback}
      />

      {/* Banner: trial em andamento, trial encerrado ou opção de iniciar trial */}
      {user?.plan_status === "trial" && trialCountdownSeconds != null && trialCountdownSeconds <= 0 && (
        <div className="px-4 py-3 bg-amber-900/30 border-b border-amber-600/40 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-sm">
          <span className="text-amber-200">Trial encerrado. Escolha um plano para continuar usando.</span>
          <Link href="/#planos" className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors">
            Ver planos
          </Link>
        </div>
      )}
      {user?.plan_status === "trial" && (trialCountdownSeconds == null || trialCountdownSeconds > 0) && (
        <div className="px-4 py-2.5 bg-[#1E3A5F]/40 border-b border-[#2563EB]/40 flex items-center justify-center gap-2 text-sm text-[#93C5FD]">
          <span>
            Trial: {trialCountdownSeconds != null && trialCountdownSeconds > 0
              ? `${Math.floor(trialCountdownSeconds / 86400)}d ${Math.floor((trialCountdownSeconds % 86400) / 3600)}h ${Math.floor((trialCountdownSeconds % 3600) / 60)}min restantes`
              : "ativo"}
            . Ao finalizar, escolha um plano.
          </span>
        </div>
      )}
      {user?.plan === "blocked" && user?.trial_used === false && (
        <div className="px-4 py-3 bg-[#0F172A] border-b border-[#2563EB]/40 flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="text-[#E5E7EB]">Quer testar o plano Avançado por 3 dias grátis?</span>
          <button
            type="button"
            onClick={handleStartTrial}
            disabled={startTrialLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#2563EB] hover:bg-[#3B82F6] disabled:opacity-60 text-white transition-colors"
          >
            {startTrialLoading ? "Ativando..." : "Iniciar teste de 3 dias"}
          </button>
        </div>
      )}

      <div className="md:hidden sticky top-0 z-30 bg-[#0B1220] border-b border-[#1F2937] px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-[#111827] border border-[#334155] text-[#E5E7EB]"
          >
            Menu lateral
          </button>
          <Link
            href="/admin"
            className="px-3 py-2 rounded-lg text-xs font-medium border border-[#374151] text-[#93C5FD] hover:bg-[#1F2937] transition-colors"
          >
            Admin
          </Link>
          <button
            type="button"
            onClick={handleAtualizarRanking}
            disabled={loading}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-[#2563EB] hover:bg-[#3B82F6] disabled:bg-[#1F2937] disabled:text-[#6B7280] text-white transition-colors"
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
          <span className="text-[11px] text-[#9CA3AF] ml-auto">
            Ativos: {topN}/{maxAssets}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-[#9CA3AF]">
            {broker.connected ? "Corretora conectada" : "Corretora indisponível"}
          </span>
          <span className="text-[11px] text-[#9CA3AF]">
            Plano: {currentPlanLabel}
          </span>
        </div>
      </div>

      {/* Barra de filtros + KPIs (desktop) */}
      <div className="hidden md:block sticky top-0 z-30 bg-[#060B14] border-b border-[#1F2937] px-4 py-3">
        <div className="max-w-[1400px] mx-auto space-y-3">
          <FilterBar
            strategy={strategy}
            onStrategyChange={setStrategy}
            windowMinutes={windowMinutes}
            onWindowMinutesChange={setWindowMinutes}
            mgMode={mgMode}
            onMgModeChange={setMgMode}
            minSetups={minSetups}
            onMinSetupsChange={setMinSetups}
            topN={topN}
            onTopNChange={setTopN}
            includeOtc={includeOtc}
            onIncludeOtcChange={setIncludeOtc}
            includeOpen={includeOpen}
            onIncludeOpenChange={setIncludeOpen}
            strategies={allowedStrategies}
            windows={WINDOWS}
            mgOptions={MG_OPTIONS}
            topNOptions={allowedTopNOptions}
            maxAssets={maxAssets}
            loading={loading}
            onAtualizar={handleAtualizarRanking}
            onLimparFiltros={clearFilters}
            autoRefreshEnabled={autoRefreshEnabled}
            onAutoRefreshChange={setAutoRefreshEnabled}
            countdownSeconds={countdownSeconds}
            onStopAuto={stopAutoRefresh}
            autoPausedByError={autoPausedByError}
            ativosLabel={`Ativos: ${topN}/${maxAssets}`}
            lastUpdatedLabel={lastUpdatedLabel}
            lastUpdatedTime={lastUpdatedTime}
            showUpgrade={user?.plan !== "pro_plus"}
            onUpgradeClick={() => setShowUpgradeModal(true)}
          />
          {rankingResult?.debug && (
            <KpiRow
              avaliados={rankingResult.debug.assets_total ?? 0}
              comCiclos={rankingResult.debug.assets_with_setups ?? 0}
              ciclosTotais={cyclesTotal}
              ranqueados={rankingResult.count_ranked ?? 0}
              maxPorAtivo={maxCyclesPerAsset}
              fetchPagesUsed={fetchPagesUsed}
            />
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileFiltersOpen(false)} />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-[86%] max-w-[340px] bg-[#0B1220] border-r border-[#1F2937] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#E5E7EB]">Filtros</h3>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="px-2 py-1 rounded-md text-xs border border-[#334155] text-[#9CA3AF] hover:text-[#E5E7EB]"
              >
                Fechar
              </button>
            </div>
            <div className="space-y-3">
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
              >
                {allowedStrategies.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={windowMinutes}
                onChange={(e) => setWindowMinutes(Number(e.target.value))}
                className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
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
                className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
              >
                {MG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <label className="block">
                <span className="text-xs text-[#9CA3AF]">Min ciclos</span>
                <input
                  type="number"
                  min={1}
                  value={minSetups}
                  onChange={(e) => setMinSetups(Number(e.target.value) || 10)}
                  className="mt-1 w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
                />
              </label>
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
              >
                {allowedTopNOptions.map((n) => (
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
                onClick={clearFilters}
                className="w-full px-4 py-2 rounded-lg text-xs font-medium border border-[#334155] text-[#94A3B8] hover:bg-[#1E293B] transition-colors"
              >
                Limpar filtros
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileFiltersOpen(false);
                  handleAtualizarRanking();
                }}
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] disabled:bg-[#1F2937] disabled:text-[#6B7280] text-white transition-colors"
              >
                {loading ? "Atualizando..." : "Aplicar e atualizar"}
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-3 py-4 pb-6 sm:px-4 sm:py-6">
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
              onClick={() => {
                setError(null);
                setAutoPausedByError(false);
                setAutoRefreshEnabled(true);
                handleAtualizarRanking();
              }}
              disabled={loading}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-50"
            >
              Tentar novamente
            </button>
          </div>
        )}
        {rankingResult?.warning && !error && (() => {
          const w = rankingResult.warning;
          const lower = w.toLowerCase();
          const isAuthWarning =
            lower.includes("token ausente") ||
            lower.includes("jwt") ||
            lower.includes("autoriz") ||
            lower.includes("autent") ||
            lower.includes("conecte à corretora");
          let friendly = w;
          if (w === "catalog_failed" || lower.startsWith("catalog_failed")) {
            friendly =
              "Houve um erro ao gerar o ranking (catalog_failed). Isso não é problema de login; " +
              "tente novamente em alguns segundos ou reduza o Min ciclos para testar.";
          }
          return (
            <div className="mb-4 bg-amber-900/30 border border-amber-600 rounded-xl px-4 py-3 text-amber-200 text-sm">
              <p>{friendly}</p>
              {isAuthWarning && (
                <Link
                  href="/login"
                  className="inline-block mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600/50 hover:bg-amber-600/70 text-white transition-colors"
                >
                  Ir para Login
                </Link>
              )}
              {rankingResult.stats && Object.keys(rankingResult.stats).length > 0 && (
                <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(rankingResult.stats, null, 2)}</pre>
              )}
            </div>
          );
        })()}
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
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 sm:p-8 text-center text-[#9CA3AF]">
            Ajuste os filtros no topo e clique em &quot;Atualizar ranking&quot;.
          </div>
        )}
        {loading && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 sm:p-8 text-center text-[#9CA3AF] flex flex-col items-center gap-3">
            <span className="inline-block w-8 h-8 border-2 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
            Atualizando ranking…
          </div>
        )}
        {rankingResult && !loading && hasNoResults && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 sm:p-6 max-w-2xl">
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
                  quadrants_checked: {rankingResult.debug.quadrants_checked ?? 0} — skip_missing:{" "}
                  {rankingResult.debug.skip_missing ?? 0} — skip_doji_v3:{" "}
                  {rankingResult.debug.skip_doji_v3 ?? 0} — setups_total:{" "}
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
              <BestNowHighlight
                asset={mostAssertive}
                strategyName={STRATEGIES.find((s) => s.value === strategy)?.label ?? "MHI"}
                onVerCiclos={() =>
                  setCyclesModal({
                    symbol: mostAssertive.asset,
                    strategyId: strategy,
                    strategyName: STRATEGIES.find((s) => s.value === strategy)?.label ?? "MHI",
                    windowMinutes: windowMinutes,
                    mg1: mgMode === "mg1",
                  })
                }
                onVerDetalhes={() => setDetailsAsset(mostAssertive)}
              />
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs text-[#64748B]">Ordenar por:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "assertividade" | "score" | "ciclos")}
                className="bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-1.5 text-sm text-[#F1F5F9] focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none"
                aria-label="Ordenar cards por"
              >
                <option value="assertividade">Assertividade</option>
                <option value="score">Score</option>
                <option value="ciclos">Ciclos</option>
              </select>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {sortedTopList.map((row, index) => (
                <PairCard
                  key={row.asset}
                  row={row}
                  strategyName={STRATEGIES.find((s) => s.value === strategy)?.label ?? "MHI"}
                  onVerDetalhes={() => setDetailsAsset(row)}
                  onVerCiclos={() => {
                    if (process.env.NODE_ENV !== "production") {
                      // eslint-disable-next-line no-console
                      console.log("[Ver ciclos] payload:", { symbol: row.asset, strategy, windowMinutes, mg1: mgMode === "mg1" });
                    }
                    setCyclesModal({
                      symbol: row.asset,
                      strategyId: strategy,
                      strategyName: STRATEGIES.find((s) => s.value === strategy)?.label ?? "MHI",
                      windowMinutes: windowMinutes,
                      mg1: mgMode === "mg1",
                    });
                  }}
                  isFirst={index === 0}
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
    </div>
  );
}

export default function ProbabilisticasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#9CA3AF]" style={{ background: "linear-gradient(180deg, #060b14 0%, #0b1624 100%)" }}>Carregando...</div>}>
      <ProbabilisticasContent />
    </Suspense>
  );
}
