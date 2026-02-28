/**
 * Base URL da API. Sem prefixo no backend (rotas são /health, /assets, etc.).
 * - Dev: default "/api" usa proxy do Next (rewrite → API_BACKEND_URL).
 * - Prod (app.aragon.app): use NEXT_PUBLIC_API_URL=https://api.aragon.app para chamar o subdomínio da API.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "/api";

// ----- Auth token (JWT) -----
const TOKEN_STORAGE_KEY = "aa_auth_token";
const USER_EMAIL_KEY = "aa_user_email";
const USER_PLAN_KEY = "aa_user_plan";

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null, email?: string, plan?: string) {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (email) {
        window.localStorage.setItem(USER_EMAIL_KEY, email.toLowerCase());
      }
      if (plan !== undefined) {
        window.localStorage.setItem(USER_PLAN_KEY, plan);
      }
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(USER_EMAIL_KEY);
      window.localStorage.removeItem(USER_PLAN_KEY);
    }
  }
}

export type MeResponse = { id: string; email: string; plan: string };

export function getStoredPlan(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_PLAN_KEY);
}

export function setStoredPlan(plan: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(USER_PLAN_KEY, plan);
  }
}

export async function fetchMe(): Promise<MeResponse | null> {
  const r = await fetch(`${API_BASE}/me`, { headers: authHeaders() });
  const text = await r.text();
  if (!r.ok) return null;
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("text/html") || text.trimStart().startsWith("<")) return null;
  try {
    const data = JSON.parse(text);
    return {
      id: String(data.id ?? ""),
      email: String(data.email ?? ""),
      plan: String(data.plan ?? "free"),
    };
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return inMemoryToken;
  if (inMemoryToken) return inMemoryToken;
  const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  inMemoryToken = stored;
  return stored;
}

export function getCurrentUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_EMAIL_KEY);
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAuthToken();
  const base: HeadersInit = extra ? { ...extra } : {};
  if (token) {
    return { ...base, Authorization: `Bearer ${token}` };
  }
  return base;
}

/** URL do WebSocket de mercado (candles em tempo quase real). Fallback: null = só atualização manual. */
export function getMarketWsUrl(): string | null {
  if (typeof window === "undefined") return null;
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  if (base.startsWith("http://")) return base.replace("http://", "ws://") + "/ws/market";
  if (base.startsWith("https://")) return base.replace("https://", "wss://") + "/ws/market";
  const origin = window.location.origin;
  const wsOrigin = origin.startsWith("https") ? origin.replace("https", "wss") : origin.replace("http", "ws");
  return wsOrigin + "/api/ws/market";
}

export type CandleItem = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  color: "green" | "red" | "doji";
};

export type SignalResponse = {
  asset: string;
  timeframe: string;
  server_now: string;
  candle: { open_time: string; close_time: string; seconds_left: number };
  entry_time: string;
  action: "CALL" | "PUT" | "NONE";
  confidence: number;
  reason: string;
  metrics: { body_ratio: number; range: number; hh: number; ll: number };
  status: "APTO" | "BLOQUEADO";
};

/** Resposta do motor de confluências (POST /signals/analyze). */
export type SignalsAnalyzeResponse = {
  direction: "CALL" | "PUT";
  score_call: number;
  score_put: number;
  confluences: Record<string, string>;
  /** Confiança 0–100; opcional, frontend usa 50 se ausente. */
  confidence?: number;
};

export type CatalogMhiResponse = {
  asset: string;
  minutes: number;
  total: number;
  skip: number;
  win_no_mg: number;
  win_with_mg: number;
  win_total_with_mg: number;
  loss_after_mg: number;
  rates: {
    pct_win_no_mg: number;
    pct_win_with_mg_only: number;
    pct_win_total_with_mg: number;
    pct_loss: number;
  };
};

/** Mensagem amigável quando o backend retorna HTML (ex.: 502/503 do proxy). */
function friendlyMessageIfHtml(status: number, text: string): string | null {
  if ((status === 502 || status === 503) && text.trimStart().startsWith("<")) {
    return "Servidor iniciando. Tente novamente em alguns instantes.";
  }
  return null;
}

export async function fetchHealth(): Promise<{ status: string; server_now: string; asset_default: string }> {
  const r = await fetch(`${API_BASE}/health`);
  const text = await r.text();
  if (!r.ok) {
    const msg = friendlyMessageIfHtml(r.status, text);
    throw new Error(msg ?? text);
  }
  return JSON.parse(text);
}

/** Resumo público para a home (GET /public/summary). Retorna null se API indisponível ou HTML. */
export type PublicSummary = {
  assets_evaluated: number;
  cycles_total: number;
  top_asset: { symbol: string; label: string; win_rate_pct: number; cycles: number } | null;
};

export async function fetchPublicSummary(): Promise<PublicSummary | null> {
  try {
    const r = await fetch(`${API_BASE}/public/summary`, { cache: "no-store" });
    const text = await r.text();
    const ct = r.headers.get("content-type") || "";
    if (!r.ok) return null;
    if (ct.includes("text/html") || text.trimStart().startsWith("<")) return null;
    const data = JSON.parse(text);
    return {
      assets_evaluated: Number(data.assets_evaluated) || 0,
      cycles_total: Number(data.cycles_total) || 0,
      top_asset:
        data.top_asset && data.top_asset.symbol
          ? {
              symbol: String(data.top_asset.symbol),
              label: String(data.top_asset.label || data.top_asset.symbol),
              win_rate_pct: Number(data.top_asset.win_rate_pct) || 0,
              cycles: Number(data.top_asset.cycles) || 0,
            }
          : null,
    };
  } catch {
    return null;
  }
}

const FETCH_TIMEOUT_MS = 25_000;

/** fetch com timeout e opcional AbortSignal externo; rejeita com erro amigável se abort ou timeout. */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = FETCH_TIMEOUT_MS, signal: outerSignal, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (outerSignal) {
    if (outerSignal.aborted) {
      clearTimeout(timeoutId);
      throw new Error("Tempo esgotado ao atualizar. Tente novamente.");
    }
    outerSignal.addEventListener("abort", () => controller.abort());
  }
  try {
    const r = await fetch(url, { ...rest, signal: controller.signal });
    clearTimeout(timeoutId);
    return r;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError")
      throw new Error("Tempo esgotado ao atualizar. Tente novamente.");
    throw e;
  }
}

export async function fetchCandles(
  asset: string,
  n: number = 20,
  signal?: AbortSignal
): Promise<CandleItem[]> {
  const r = await fetchWithTimeout(
    `${API_BASE}/candles/last?asset=${encodeURIComponent(asset)}&n=${n}`,
    { signal, timeoutMs: FETCH_TIMEOUT_MS, headers: authHeaders() }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchSignal(asset: string, strategy: "aggressive" | "normal", window_sec: number = 2): Promise<SignalResponse> {
  const r = await fetch(`${API_BASE}/signal`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ asset, strategy, window_sec }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/** Analisa confluências e retorna direção CALL/PUT com pontuação e detalhes. */
export async function fetchSignalsAnalyze(symbol: string, timeframe: number = 60): Promise<SignalsAnalyzeResponse> {
  const r = await fetch(`${API_BASE}/signals/analyze`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ symbol, timeframe }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchCatalogMhi(asset: string, minutes: number = 120): Promise<CatalogMhiResponse> {
  const r = await fetch(`${API_BASE}/catalog/mhi`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ asset, minutes }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ----- Catalog batch (ranking MHI por ativos) -----
export type CatalogByAsset = {
  asset: string;
  total: number;
  win_total_rate: number;
  win_no_mg: number;
  win_with_mg: number;
  loss: number;
  skip: number;
  score: number;
  cycles?: number;
  wins?: number;
  p?: number;
  g1?: number;
  g2?: number;
  hit?: number;
  win_rate?: number;
  win_no_mg_rate?: number;
  loss_rate?: number;
   last_hit_ts?: number | null;
   hit_streak_max?: number;
   hit_streak_current?: number;
};

export type CatalogSummary = {
  total: number;
  win_no_mg: number;
  win_with_mg: number;
  loss: number;
  skip: number;
  win_total_rate: number;
  assets_total?: number;
  assets_with_setups?: number;
  assets_ranked?: number;
  setups_total?: number;
  win_no_mg_rate?: number;
  win_with_mg_rate?: number;
  hit_rate?: number;
  /** Máximo de ciclos por ativo na janela (exibição em probabilisticas). */
  max_cycles?: number;
};

export type CatalogResponse = {
  summary: CatalogSummary;
  by_asset: CatalogByAsset[];
  minutes?: number;
  min_setups?: number;
  top_n?: number;
  count_ranked?: number;
  top?: CatalogByAsset[];
  warning?: string;
  stats?: Record<string, number>;
  debug?: {
    assets_total?: number;
    assets_with_setups?: number;
    assets_ranked?: number;
    reason?: string;
    quadrants_checked?: number;
    skip_missing?: number;
    skip_missing_v3_v4?: number;
    skip_doji_v3?: number;
    setups_total?: number;
    total_setups_sum?: number;
    p_wins?: number;
    g1_wins?: number;
    hits?: number;
    note?: string;
    minutes?: number;
    candles_fetched?: number;
    closed_candles_in_window?: number;
    earliest_ts?: number;
    latest_ts?: number;
    max_setups_per_asset?: number;
    /** Indica que foi usada paginação para maximizar candles na janela */
    fetch_pages_used?: number;
  };
};

const CATALOG_FETCH_TIMEOUT_MS = 60_000;

/** POST /catalog — ranking automático. Timeout 1 min; suporta AbortSignal externo (cancelar anterior). */
export async function fetchCatalogRanking(
  params: {
    minutes: number;
    min_setups?: number;
    top_n?: number;
    include_otc?: boolean;
    include_open?: boolean;
    strategy_id?: string;
    mg1?: boolean;
  },
  signal?: AbortSignal
): Promise<CatalogResponse> {
  const {
    minutes,
    min_setups = 10,
    top_n = 5,
    include_otc = true,
    include_open = true,
    strategy_id = "mhi",
    mg1 = true,
  } = params;
  const body: Record<string, unknown> = {
    strategy_id,
    minutes,
    assets_mode: "auto",
    assets: [],
    min_setups,
    top_n,
    include_otc,
    include_open,
    mg1,
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CATALOG_FETCH_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw new Error("Tempo esgotado ao atualizar. Tente novamente.");
    }
    signal.addEventListener("abort", () => controller.abort());
  }
  let r: Response;
  try {
    r = await fetch(`${API_BASE}/catalog`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error) {
      if (e.name === "AbortError")
        throw new Error("Tempo esgotado ao atualizar. Tente novamente.");
      throw new Error(`Falha na rede: ${e.message}. Backend em http://127.0.0.1:8000 ?`);
    }
    throw e;
  }
  clearTimeout(timeoutId);
  if (!r.ok) {
    const text = await r.text();
    const friendly = friendlyMessageIfHtml(r.status, text);
    if (friendly) throw new Error(friendly);
    if (r.status === 400) {
      try {
        const j = JSON.parse(text);
        if (j.detail === "strategy_not_supported")
          throw new Error("Estratégia não suportada. Use MHI.");
      } catch (e) {
        if (e instanceof Error) throw e;
      }
    }
    let detail = text;
    try {
      const j = JSON.parse(text) as Record<string, unknown>;
      const d = j.detail ?? j.error ?? j.message;
      detail = typeof d === "string" ? d : JSON.stringify(d ?? text);
    } catch {
      // keep detail as text
    }
    if (r.status === 503)
      throw new Error(`Serviço indisponível: ${detail}. Verifique conexão com a corretora no perfil (topo direito).`);
    throw new Error(`HTTP ${r.status}: ${detail}`);
  }
  return r.json();
}

// ----- Ativos (compartilhado Análise + Probabilísticas) -----
export type AssetOption = { symbol: string; label: string; market?: "open" | "otc" };

// ----- Ciclos por ativo (GET /analytics/assets/:symbol/cycles) -----
export type CycleItem = { id: string; timestamp: number; outcome: "P" | "G1" | "G2" | "H" };

export type CyclesResponse = {
  symbol: string;
  strategy: string;
  timeframe: string;
  mg: string;
  total: number;
  counts: { P: number; G1: number; G2: number; H: number };
  cycles: CycleItem[];
};

const cyclesCache = new Map<string, { data: CyclesResponse; ts: number }>();
const CACHE_TTL_MS = 60_000;

/** Backend espera: mhi | padrao23 | 3mosq (lowercase). */
export function mapStrategyUiToApi(ui: string): string {
  const s = (ui || "mhi").trim().toLowerCase();
  if (s === "mosqueteiros_rep" || s === "3 mosqueteiros") return "3mosq";
  return s || "mhi";
}

/** Backend espera minutos (número). UI pode enviar "2h" | 120 etc. */
export function mapTimeframeUiToApi(ui: string | number): number {
  if (typeof ui === "number" && ui >= 1) return ui;
  const t = String(ui || "").toLowerCase().trim();
  if (t === "24h" || t === "24") return 1440;
  if (t === "4h" || t === "4") return 240;
  if (t === "2h" || t === "2") return 120;
  const n = parseInt(t.replace(/\D/g, ""), 10);
  if (!Number.isNaN(n) && t.includes("h")) return n * 60;
  if (!Number.isNaN(n)) return n;
  return 120;
}

/** Backend espera mg1: boolean. */
export function mapMgUiToApi(ui: string | boolean): boolean {
  if (typeof ui === "boolean") return ui;
  const v = String(ui || "").toLowerCase().trim();
  return v === "mg1" || v === "true" || v === "1" || v === "on";
}

/** Monta URL da request de ciclos (para debug no modal). */
export function getCyclesRequestUrl(params: {
  symbol: string;
  strategy: string;
  minutes: number;
  mg1: boolean;
}): string {
  const strategy = mapStrategyUiToApi(params.strategy);
  const minutes = mapTimeframeUiToApi(params.minutes);
  const mg1 = mapMgUiToApi(params.mg1);
  const q = new URLSearchParams({
    strategy,
    minutes: String(minutes),
    mg1: String(mg1),
  });
  return `${API_BASE}/analytics/assets/${encodeURIComponent(params.symbol)}/cycles?${q}`;
}

export async function fetchCycles(params: {
  symbol: string;
  strategy: string;
  minutes: number;
  mg1: boolean;
}): Promise<CyclesResponse> {
  const strategy = mapStrategyUiToApi(params.strategy);
  const minutes = mapTimeframeUiToApi(params.minutes);
  const mg1 = mapMgUiToApi(params.mg1);
  const { symbol } = params;

  const key = `${symbol}|${strategy}|${minutes}|${mg1}`;
  const cached = cyclesCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const q = new URLSearchParams({
    strategy,
    minutes: String(minutes),
    mg1: String(mg1),
  });
  const url = `${API_BASE}/analytics/assets/${encodeURIComponent(symbol)}/cycles?${q}`;

  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[fetchCycles] request URL:", url);
  }

  const r = await fetch(url, { headers: authHeaders() });

  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[fetchCycles] response status:", r.status);
  }

  if (!r.ok) throw new Error(`Ciclos: ${r.status}`);

  const data = (await r.json()) as CyclesResponse;

  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[fetchCycles] response JSON:", { total: data?.total, cyclesLength: data?.cycles?.length, data });
  }

  cyclesCache.set(key, { data, ts: Date.now() });
  return data;
}

// ----- Ativos (compartilhado Análise + Probabilísticas) -----
// ----- Executor -----
export type ExecutorStatus = {
  state: "STOPPED" | "RUNNING" | "PAUSED_RISK";
  simulated: boolean;
  brokerConnected?: boolean;
  lastSignalAt?: string | null;
  signalsReceivedCount?: number;
};

export type ExecutorTrade = {
  id: string;
  userId: string;
  symbol: string;
  strategy: string;
  direction: string;
  stake: number;
  mgLevel: number;
  status: string;
  profit: number;
  openedAt: string;
  closedAt: string | null;
  orderId: string | null;
  signalId: string | null;
  simulated: boolean;
};

export type ExecutorLog = {
  id: string;
  tradeId: string | null;
  message: string;
  level: string;
  timestamp: string;
};

export type ExecutorRiskConfig = {
  stakeType: "fixed" | "percent";
  stakeValue: number;
  maxDailyLoss: number;
  maxDailyTrades: number;
  maxConsecutiveLoss: number;
  pauseAfterLossMinutes: number;
};

export async function fetchExecutorStatus(): Promise<ExecutorStatus> {
  const r = await fetch(`${API_BASE}/executor/status`, {
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function executorStart(riskConfig?: ExecutorRiskConfig): Promise<{ ok: boolean; message: string }> {
  const r = await fetch(`${API_BASE}/executor/start`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(riskConfig ? { riskConfig } : {}),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function executorStop(): Promise<{ ok: boolean; message: string }> {
  const r = await fetch(`${API_BASE}/executor/stop`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchExecutorTrades(limit = 50): Promise<{ trades: ExecutorTrade[] }> {
  const r = await fetch(`${API_BASE}/executor/trades?limit=${limit}`, {
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchExecutorLogs(limit = 50, tradeId?: string): Promise<{ logs: ExecutorLog[] }> {
  const url = tradeId
    ? `${API_BASE}/executor/logs?limit=${limit}&tradeId=${encodeURIComponent(tradeId)}`
    : `${API_BASE}/executor/logs?limit=${limit}`;
  const r = await fetch(url, { headers: authHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export type ExecutorExecuteResponse = {
  /** Resposta 202: sinal aceito, execução em background */
  accepted?: boolean;
  signalId?: string;
  scheduledAt?: string;
  message?: string;
  /** Resposta legada (quando não usa 202) */
  executed?: boolean;
  reason?: string;
  tradeId?: string;
  win?: boolean;
  profit?: number;
  simulated?: boolean;
};

export async function executorExecute(params: {
  symbol: string;
  direction: "CALL" | "PUT";
  strategy?: string;
  expiration?: number;
  /** false = ordem real na corretora (Executar teste); true = simulado */
  simulate?: boolean;
  amount?: number;
}): Promise<ExecutorExecuteResponse> {
  const r = await fetch(`${API_BASE}/executor/execute`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      symbol: params.symbol,
      direction: params.direction,
      strategy: params.strategy ?? "aggressive",
      expiration: params.expiration ?? 60,
      simulate: params.simulate ?? false,
      ...(params.amount != null && params.amount > 0 ? { amount: params.amount } : {}),
    }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ----- Broker (mesmo fluxo do CLI: Bullex + connect) -----
export type BrokerStatus = {
  connected: boolean;
  accountType?: string | null;
  balance?: number | null;
  accountId?: string | null;
  broker?: string | null;
};

export type BrokerConnectResponse = {
  success: boolean;
  connected: boolean;
  accountType?: string | null;
  balance?: number | null;
};

export async function fetchBrokerStatus(): Promise<BrokerStatus> {
  const r = await fetch(`${API_BASE}/broker/status`, {
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function brokerConnect(body: {
  email: string;
  password: string;
}): Promise<BrokerConnectResponse> {
  const r = await fetch(`${API_BASE}/broker/connect`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = await r.text();
    try {
      const j = JSON.parse(msg) as any;
      msg = j.detail ?? j.error ?? j.message ?? msg;
    } catch {
      // ignore
    }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return r.json();
}

export async function brokerDisconnect(): Promise<void> {
  const r = await fetch(`${API_BASE}/broker/disconnect`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!r.ok) {
    // eslint-disable-next-line no-console
    console.warn("brokerDisconnect failed", r.status);
  }
}

// ----- Auth (multi-tenant) -----
export type AuthTokenResponse = {
  access_token: string;
  token_type: string;
  user_id: string;
};

export async function authLogin(email: string, password: string): Promise<AuthTokenResponse> {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const text = await r.text();
    let detail = text;
    try {
      const j = JSON.parse(text) as any;
      detail = j.detail ?? j.error ?? j.message ?? text;
    } catch {
      // ignore
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  const data = (await r.json()) as AuthTokenResponse;
  setAuthToken(data.access_token, email);
  return data;
}

export async function authRegister(email: string, password: string): Promise<AuthTokenResponse> {
  const r = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const text = await r.text();
    let detail = text;
    try {
      const j = JSON.parse(text) as any;
      detail = j.detail ?? j.error ?? j.message ?? text;
    } catch {
      // ignore
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  const data = (await r.json()) as AuthTokenResponse;
  setAuthToken(data.access_token, email);
  return data;
}

// ----- Ativos (compartilhado Análise + Probabilísticas) -----
/** Lista única de ativos da corretora. GET {API_BASE}/assets. Ordenada por symbol. */
export async function fetchAssets(): Promise<AssetOption[]> {
  const url = `${API_BASE}/assets`;
  const r = await fetch(url, { headers: authHeaders() });
  if (!r.ok) {
    const body = await r.json().catch(() => ({} as Record<string, unknown>));
    const details =
      ((body as any).details ?? (body as any).error ?? r.statusText) || String(r.status);
    console.error("GET /assets failed", r.status, url, body);
    throw new Error(
      details ? `Falha ao buscar ativos: ${details}` : `Falha ao buscar ativos (${r.status})`
    );
  }
  const raw = await r.json();
  const data: AssetOption[] = (raw && Array.isArray(raw.assets) ? raw.assets : raw) as AssetOption[];
  if (!data.length) {
    // Debug quando a lista vier vazia
    // eslint-disable-next-line no-console
    console.log("GET /assets returned empty payload", raw);
  }
  return [...data].sort((a, b) => a.symbol.localeCompare(b.symbol));
}
