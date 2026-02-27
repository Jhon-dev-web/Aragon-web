"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchExecutorStatus,
  executorStart,
  executorStop,
  fetchExecutorTrades,
  fetchExecutorLogs,
  executorExecute,
  fetchAssets,
  fetchBrokerStatus,
  brokerConnect,
  brokerDisconnect,
  getAuthToken,
  type ExecutorStatus,
  type ExecutorTrade,
  type ExecutorLog,
  type ExecutorRiskConfig,
  type AssetOption,
  type BrokerStatus,
} from "../api";

const TRADES_POLL_MS = 5000;
const LOGS_POLL_MS = 5000;

type BrokerConnectionState = {
  connected: boolean;
  loading: boolean;
  accountId?: string | null;
  accountType?: string | null;
  balance?: number | null;
};

function symbolToLabel(symbol: string): string {
  const base = symbol.replace(/-OTC$/i, "").trim();
  if (base.length === 6 && /^[A-Z]+$/i.test(base)) {
    return `${base.slice(0, 3)}/${base.slice(3)}`;
  }
  return base;
}

function isOtc(symbol: string): boolean {
  return (symbol || "").toUpperCase().endsWith("-OTC");
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

function computeMetrics(trades: ExecutorTrade[]) {
  const todayTrades = trades.filter((t) => isToday(t.openedAt));
  const closed = todayTrades.filter((t) => t.status === "WIN" || t.status === "LOSS");
  const wins = closed.filter((t) => t.status === "WIN").length;
  const winPct = closed.length ? (100 * wins) / closed.length : 0;
  const profit = closed.reduce((s, t) => s + t.profit, 0);
  let consecutive = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].status === "LOSS") consecutive++;
    else break;
  }
  return { tradesToday: todayTrades.length, winPct, profit, consecutiveLosses: consecutive };
}

function BrokerLogin({
  onConnected,
  showToast,
}: {
  onConnected: (status: BrokerStatus) => void;
  showToast: (type: "success" | "error", message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Informe email e senha");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await brokerConnect({ email, password });
      if (res.success && res.connected) {
        const status = await fetchBrokerStatus();
        onConnected(status);
        showToast("success", "Conta conectada");
      } else {
        setError("Não foi possível confirmar a conexão da conta");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Falha ao conectar na corretora";
      setError(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 max-w-md w-full shadow-[0_0_20px_rgba(37,99,235,0.12)]">
        <h2 className="text-lg font-semibold text-[#E5E7EB] mb-1">
          Conectar conta da corretora
        </h2>
        <p className="text-xs text-[#9CA3AF] mb-4">
          Necessário para executar operações automáticas.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="block text-xs text-[#9CA3AF] mb-1">Email</span>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-[#9CA3AF] mb-1">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/50 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] disabled:bg-[#1F2937] disabled:text-[#6B7280] text-white transition-colors"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Conectando…
              </span>
            ) : (
              "Conectar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ExecutorDashboard() {
  const router = useRouter();
  const [brokerState, setBrokerState] = useState<BrokerConnectionState>({
    connected: false,
    loading: true,
    accountId: null,
  });
  const [status, setStatus] = useState<ExecutorStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [trades, setTrades] = useState<ExecutorTrade[]>([]);
  const [logs, setLogs] = useState<ExecutorLog[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [riskCollapsed, setRiskCollapsed] = useState(true);
  const [logsCollapsed, setLogsCollapsed] = useState(true);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [manualSymbol, setManualSymbol] = useState("");
  const [manualDirection, setManualDirection] = useState<"CALL" | "PUT">("CALL");
  const [manualStrategy, setManualStrategy] = useState("aggressive");
  const [manualExpiration, setManualExpiration] = useState(60);
  const [manualLoading, setManualLoading] = useState(false);
  const [riskForm, setRiskForm] = useState<ExecutorRiskConfig>({
    stakeType: "fixed",
    stakeValue: 10,
    maxDailyLoss: 100,
    maxDailyTrades: 20,
    maxConsecutiveLoss: 3,
    pauseAfterLossMinutes: 15,
  });
  const tradesPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  const loadBrokerStatus = useCallback(async () => {
    setBrokerState((prev) => ({ ...prev, loading: true }));
    try {
      const s = await fetchBrokerStatus();
      setBrokerState({
        connected: !!s.connected,
        loading: false,
        accountId: s.accountId ?? null,
        accountType: s.accountType ?? null,
        balance: s.balance ?? null,
      });
    } catch {
      setBrokerState({
        connected: false,
        loading: false,
        accountId: null,
        accountType: null,
        balance: null,
      });
    }
  }, []);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const s = await fetchExecutorStatus();
      setStatus(s);
    } catch (e) {
      setStatus(null);
      showToast(
        "error",
        e instanceof Error ? e.message : "Erro ao carregar status"
      );
    } finally {
      setStatusLoading(false);
    }
  }, [showToast]);

  const loadTrades = useCallback(async () => {
    try {
      const { trades: list } = await fetchExecutorTrades(50);
      setTrades(list);
    } catch {
      setTrades([]);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const { logs: list } = await fetchExecutorLogs(50);
      setLogs(list);
    } catch {
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    loadBrokerStatus();
  }, [loadBrokerStatus, router]);

  useEffect(() => {
    if (!brokerState.connected) return;
    loadStatus();
  }, [brokerState.connected, loadStatus]);

  useEffect(() => {
    fetchAssets()
      .then(setAssets)
      .catch(() => setAssets([]));
  }, []);

  useEffect(() => {
    if (assets.length && !manualSymbol) setManualSymbol(assets[0].symbol);
  }, [assets, manualSymbol]);

  useEffect(() => {
    if (!brokerState.connected) return;
    loadTrades();
    loadLogs();
  }, [brokerState.connected, loadTrades, loadLogs]);

  useEffect(() => {
    if (!brokerState.connected) return;
    if (status?.state === "RUNNING") {
      setStartedAt((prev) => prev ?? new Date());
      tradesPollRef.current = setInterval(loadTrades, TRADES_POLL_MS);
      logsPollRef.current = setInterval(loadLogs, LOGS_POLL_MS);
    } else {
      setStartedAt(null);
      if (tradesPollRef.current) {
        clearInterval(tradesPollRef.current);
        tradesPollRef.current = null;
      }
      if (logsPollRef.current) {
        clearInterval(logsPollRef.current);
        logsPollRef.current = null;
      }
    }
    return () => {
      if (tradesPollRef.current) clearInterval(tradesPollRef.current);
      if (logsPollRef.current) clearInterval(logsPollRef.current);
    };
  }, [brokerState.connected, status?.state, loadTrades, loadLogs]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await executorStart(riskForm);
      setStartedAt(new Date());
      await loadStatus();
      showToast("success", "Executor iniciado");
    } catch (e) {
      showToast(
        "error",
        e instanceof Error ? e.message : "Falha ao iniciar"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      await executorStop();
      await loadStatus();
      showToast("success", "Executor parado");
    } catch (e) {
      showToast(
        "error",
        e instanceof Error ? e.message : "Falha ao parar"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualExecute = async () => {
    if (!manualSymbol) {
      showToast("error", "Selecione um ativo");
      return;
    }
    setManualLoading(true);
    try {
      const result = await executorExecute({
        symbol: manualSymbol,
        direction: manualDirection,
        strategy: manualStrategy,
        expiration: manualExpiration,
      });
      if (result.accepted) {
        setManualLoading(false);
        showToast("success", "Sinal enviado. Acompanhe em Trades/Logs.");
        loadTrades();
        loadLogs();
        return;
      }
      if (result.executed) {
        showToast(
          "success",
          result.win
            ? `WIN (${result.profit?.toFixed(2)})`
            : `LOSS (${result.profit?.toFixed(2)})`
        );
        loadTrades();
        loadLogs();
      } else {
        showToast("error", result.reason ?? "Execução bloqueada");
      }
    } catch (e) {
      showToast(
        "error",
        e instanceof Error ? e.message : "Falha na execução"
      );
    } finally {
      setManualLoading(false);
    }
  };

  const handleBrokerConnected = (s: BrokerStatus) => {
    setBrokerState({
      connected: true,
      loading: false,
      accountId: s.accountId ?? null,
      accountType: s.accountType ?? null,
      balance: s.balance ?? null,
    });
    loadStatus();
    loadTrades();
    loadLogs();
  };

  const handleLogout = async () => {
    try {
      await brokerDisconnect();
    } catch {
      // ignore
    } finally {
      setBrokerState({
        connected: false,
        loading: false,
        accountId: null,
        accountType: null,
        balance: null,
      });
      setStatus(null);
      setTrades([]);
      setLogs([]);
      showToast("success", "Conta desconectada");
    }
  };

  const metrics = computeMetrics(trades);
  const uptimeSeconds =
    startedAt && status?.state === "RUNNING"
      ? Math.floor((Date.now() - startedAt.getTime()) / 1000)
      : 0;
  const uptimeStr =
    uptimeSeconds >= 3600
      ? `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor(
          (uptimeSeconds % 3600) / 60
        )}m`
      : uptimeSeconds >= 60
        ? `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`
        : `${uptimeSeconds}s`;

  const stateBadge = (state: string) => {
    const styles =
      state === "RUNNING"
        ? "bg-emerald-900/50 text-emerald-300 border-emerald-600/50"
        : state === "PAUSED_RISK"
          ? "bg-amber-900/50 text-amber-300 border-amber-600/50"
          : "bg-[#374151] text-[#9CA3AF] border-[#4B5563]";
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles}`}>
        {state}
      </span>
    );
  };

  const showExecutorContent = brokerState.connected && !brokerState.loading;

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB] flex flex-col pb-24">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937] shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">AA</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#E5E7EB]">
              ARAGON ANALYTICS
            </h1>
            <p className="text-xs text-[#9CA3AF]">Trading Intelligence Platform</p>
          </div>
        </Link>
      </header>

      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full space-y-6">
        {brokerState.loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="space-y-3 text-center">
              <div className="h-6 w-40 bg-[#1F2937] rounded animate-pulse mx-auto" />
              <p className="text-sm text-[#9CA3AF]">
                Verificando conexão com a corretora…
              </p>
            </div>
          </div>
        ) : !showExecutorContent ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 max-w-md w-full text-center space-y-3">
              <h2 className="text-sm font-semibold text-[#E5E7EB]">
                Conecte sua conta da corretora
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Use o perfil no canto superior direito da aba Probabilísticas para conectar à
                corretora antes de iniciar o Executor.
              </p>
              <Link
                href="/probabilisticas"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white"
              >
                Ir para Probabilísticas
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Seção 1 — Controle do Executor */}
            <section className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 shadow-[0_0_20px_rgba(37,99,235,0.06)]">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-sm font-medium text-[#9CA3AF]">
                  Controle do Executor
                </h2>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs px-3 py-1 rounded-lg border border-[#374151] text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#E5E7EB] transition-colors"
                >
                  Desconectar conta
                </button>
              </div>
              {(brokerState.accountType != null || brokerState.balance != null) && (
                <div className="flex flex-wrap gap-3 text-xs text-[#9CA3AF] mb-2">
                  {brokerState.accountType != null && (
                    <span>
                      Conta: <span className="font-medium text-[#E5E7EB]">{brokerState.accountType}</span>
                    </span>
                  )}
                  {brokerState.balance != null && (
                    <span>
                      Saldo: <span className="font-medium text-[#22C55E]">{Number(brokerState.balance).toFixed(2)}</span>
                    </span>
                  )}
                </div>
              )}
              {statusLoading ? (
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="h-9 w-24 rounded-full bg-[#1F2937] animate-pulse" />
                  <div className="h-4 w-48 bg-[#1F2937] rounded animate-pulse" />
                </div>
              ) : status ? (
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    {stateBadge(status.state)}
                    {status.simulated && (
                      <span className="text-xs text-[#9CA3AF]">
                        Executor em modo SIMULADO
                      </span>
                    )}
                  </div>
                  {status.state === "RUNNING" && (
                    <span className="text-sm text-[#9CA3AF]">
                      Tempo ativo: {uptimeStr}
                    </span>
                  )}
                  {(status.signalsReceivedCount ?? 0) > 0 && (
                    <span className="text-sm text-[#9CA3AF]">
                      Sinais recebidos: {status.signalsReceivedCount}
                    </span>
                  )}
                  {brokerState.accountId && (
                    <span className="text-xs text-[#9CA3AF]">
                      Conta: <span className="font-mono">{brokerState.accountId}</span>
                    </span>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={handleStart}
                      disabled={status.state === "RUNNING" || actionLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#166534] hover:bg-[#15803D] disabled:bg-[#1F2937] disabled:text-[#6B7280] text-white transition-colors"
                    >
                      <span className="w-4 h-4 flex items-center justify-center">
                        ▶
                      </span>
                      Iniciar
                    </button>
                    <button
                      type="button"
                      onClick={handleStop}
                      disabled={status.state === "STOPPED" || actionLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#7F1D1D] hover:bg-[#991B1B] disabled:bg-[#1F2937] disabled:text-[#6B7280] text-white transition-colors"
                    >
                      <span className="w-4 h-4 flex items-center justify-center">
                        ⏹
                      </span>
                      Parar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#9CA3AF]">
                  Não foi possível carregar o status.
                </p>
              )}
            </section>

            {/* Seção 2 — Configuração de Risco (colapsável) */}
            <section className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setRiskCollapsed(!riskCollapsed)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1F2937]/50 transition-colors"
              >
                <h2 className="text-sm font-medium text-[#E5E7EB]">
                  Configuração de risco
                </h2>
                <span className="text-[#9CA3AF]">
                  {riskCollapsed ? "▼" : "▲"}
                </span>
              </button>
              {!riskCollapsed && (
                <div className="px-4 pb-4 pt-0 border-t border-[#1F2937] space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="col-span-2 sm:col-span-1">
                      <span className="block text-xs text-[#9CA3AF] mb-1">
                        Tipo de stake
                      </span>
                      <select
                        value={riskForm.stakeType}
                        onChange={(e) =>
                          setRiskForm((f) => ({
                            ...f,
                            stakeType: e.target.value as "fixed" | "percent",
                          }))
                        }
                        className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
                      >
                        <option value="fixed">Fixo</option>
                        <option value="percent">Percentual</option>
                      </select>
                    </label>
                    <label>
                      <span className="block text-xs text-[#9CA3AF] mb-1">
                        Valor da stake
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={riskForm.stakeValue}
                        onChange={(e) =>
                          setRiskForm((f) => ({
                            ...f,
                            stakeValue: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
                      />
                    </label>
                    <label>
                      <span className="block text-xs text-[#9CA3AF] mb-1">
                        Stop diário
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={riskForm.maxDailyLoss}
                        onChange={(e) =>
                          setRiskForm((f) => ({
                            ...f,
                            maxDailyLoss: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
                      />
                    </label>
                    <label>
                      <span className="block text-xs text-[#9CA3AF] mb-1">
                        Máx trades/dia
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={riskForm.maxDailyTrades}
                        onChange={(e) =>
                          setRiskForm((f) => ({
                            ...f,
                            maxDailyTrades: Number(e.target.value) || 1,
                          }))
                        }
                        className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
                      />
                    </label>
                    <label>
                      <span className="block text-xs text-[#9CA3AF] mb-1">
                        Máx losses consecutivos
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={riskForm.maxConsecutiveLoss}
                        onChange={(e) =>
                          setRiskForm((f) => ({
                            ...f,
                            maxConsecutiveLoss:
                              Number(e.target.value) || 1,
                          }))
                        }
                        className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
                      />
                    </label>
                    <label>
                      <span className="block text-xs text-[#9CA3AF] mb-1">
                        Cooldown após loss (min)
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={riskForm.pauseAfterLossMinutes}
                        onChange={(e) =>
                          setRiskForm((f) => ({
                            ...f,
                            pauseAfterLossMinutes:
                              Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    A configuração é aplicada ao clicar em &quot;Iniciar&quot;.
                  </p>
                </div>
              )}
            </section>

            {/* Seção 3 — Métricas rápidas */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 text-center">
                <div className="text-xs text-[#9CA3AF]">Trades hoje</div>
                <div className="text-xl font-semibold text-[#E5E7EB]">
                  {metrics.tradesToday}
                </div>
              </div>
              <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 text-center">
                <div className="text-xs text-[#9CA3AF]">Win %</div>
                <div className="text-xl font-semibold text-[#22C55E]">
                  {metrics.winPct.toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 text-center">
                <div className="text-xs text-[#9CA3AF]">Lucro acumulado</div>
                <div
                  className={`text-xl font-semibold ${
                    metrics.profit >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                  }`}
                >
                  {metrics.profit >= 0 ? "+" : ""}
                  {metrics.profit.toFixed(2)}
                </div>
              </div>
              <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 text-center">
                <div className="text-xs text-[#9CA3AF]">Loss consecutivos</div>
                <div className="text-xl font-semibold text-[#EF4444]">
                  {metrics.consecutiveLosses}
                </div>
              </div>
            </section>

            {/* Seção 4 — Lista de trades */}
            <section className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
              <h2 className="px-4 py-3 border-b border-[#1F2937] text-sm font-medium text-[#E5E7EB]">
                Trades
              </h2>
              <div className="overflow-x-auto">
                {trades.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[#9CA3AF]">
                    Nenhum trade ainda.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1F2937] text-left text-[#9CA3AF]">
                        <th className="px-4 py-2 font-medium">Ativo</th>
                        <th className="px-4 py-2 font-medium">Estratégia</th>
                        <th className="px-4 py-2 font-medium">Direção</th>
                        <th className="px-4 py-2 font-medium">Stake</th>
                        <th className="px-4 py-2 font-medium">MG</th>
                        <th className="px-4 py-2 font-medium">Resultado</th>
                        <th className="px-4 py-2 font-medium">Horário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b border-[#1F2937]/50 hover:bg-[#1F2937]/30"
                        >
                          <td className="px-4 py-2 text-[#E5E7EB]">
                            {symbolToLabel(t.symbol)}
                          </td>
                          <td className="px-4 py-2 text-[#9CA3AF]">
                            {t.strategy}
                          </td>
                          <td className="px-4 py-2 text-[#E5E7EB]">
                            {t.direction}
                          </td>
                          <td className="px-4 py-2 text-[#E5E7EB]">
                            {t.stake}
                          </td>
                          <td className="px-4 py-2 text-[#9CA3AF]">
                            {t.mgLevel}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={
                                t.status === "WIN"
                                  ? "text-[#22C55E] font-medium"
                                  : t.status === "LOSS"
                                    ? "text-[#EF4444] font-medium"
                                    : "text-[#9CA3AF]"
                              }
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-[#9CA3AF]">
                            {formatTime(t.openedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {status?.state === "RUNNING" && (
                <p className="px-4 py-2 text-xs text-[#9CA3AF] border-t border-[#1F2937]">
                  Atualização automática a cada 5s
                </p>
              )}
            </section>

            {/* Seção 5 — Logs */}
            <section className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setLogsCollapsed(!logsCollapsed)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1F2937]/50 transition-colors"
              >
                <h2 className="text-sm font-medium text-[#E5E7EB]">
                  Logs do executor
                </h2>
                <span className="text-[#9CA3AF]">
                  {logsCollapsed ? "▼" : "▲"}
                </span>
              </button>
              {!logsCollapsed && (
                <div className="border-t border-[#1F2937] max-h-64 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="py-8 text-center text-sm text-[#9CA3AF]">
                      Nenhum log.
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#1F2937]/50 text-xs font-mono">
                      {logs.map((log) => (
                        <li
                          key={log.id}
                          className={`px-4 py-2 ${
                            log.level === "ERROR"
                              ? "text-red-400 bg-red-900/10"
                              : log.level === "WARN"
                                ? "text-amber-400 bg-amber-900/10"
                                : "text-[#9CA3AF]"
                          }`}
                        >
                          <span className="text-[#6B7280] mr-2">
                            {formatTime(log.timestamp)}
                          </span>
                          <span className="font-medium mr-2">
                            [{log.level}]
                          </span>
                          {log.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>

            {/* Seção 6 — Execução manual (teste) */}
            <section className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
              <h2 className="text-sm font-medium text-[#E5E7EB] mb-3">
                Execução manual (teste)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <label>
                  <span className="block text-xs text-[#9CA3AF] mb-1">Ativo</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={manualSymbol}
                      onChange={(e) => setManualSymbol(e.target.value)}
                      className="flex-1 min-w-0 bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
                    >
                      {assets.map((a) => (
                        <option key={a.symbol} value={a.symbol}>
                          {a.label ?? a.symbol} ({a.market === "otc" ? "OTC" : "OPEN"})
                        </option>
                      ))}
                    </select>
                    {manualSymbol && (
                      <span
                        className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${
                          isOtc(manualSymbol)
                            ? "bg-violet-900/50 text-violet-300 border border-violet-600/50"
                            : "bg-[#374151] text-[#9CA3AF] border border-[#4B5563]"
                        }`}
                      >
                        {isOtc(manualSymbol) ? "OTC" : "OPEN"}
                      </span>
                    )}
                  </div>
                </label>
                <label>
                  <span className="block text-xs text-[#9CA3AF] mb-1">
                    Direção
                  </span>
                  <select
                    value={manualDirection}
                    onChange={(e) =>
                      setManualDirection(e.target.value as "CALL" | "PUT")
                    }
                    className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
                  >
                    <option value="CALL">CALL</option>
                    <option value="PUT">PUT</option>
                  </select>
                </label>
                <label>
                  <span className="block text-xs text-[#9CA3AF] mb-1">
                    Estratégia
                  </span>
                  <input
                    type="text"
                    value={manualStrategy}
                    onChange={(e) => setManualStrategy(e.target.value)}
                    className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
                  />
                </label>
                <label>
                  <span className="block text-xs text-[#9CA3AF] mb-1">
                    Expiração (s)
                  </span>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={manualExpiration}
                    onChange={(e) =>
                      setManualExpiration(Number(e.target.value) || 60)
                    }
                    className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E5E7EB]"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={handleManualExecute}
                disabled={manualLoading}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] disabled:bg-[#1F2937] disabled:text-[#6B7280] text-white transition-colors"
              >
                {manualLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Executando…
                  </span>
                ) : (
                  "Executar teste"
                )}
              </button>
            </section>
          </>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === "success"
              ? "bg-[#166534]/90 border-[#22C55E]/50 text-white"
              : "bg-[#7F1D1D]/90 border-[#EF4444]/50 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Nav inferior */}
      <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around py-3 px-4 bg-[#0B1220] border-t border-[#1F2937]">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span className="text-xs">Análise</span>
        </Link>
        <Link
          href="/probabilisticas"
          className="flex flex-col items-center gap-1 text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <span className="text-xs">Probabilísticas</span>
        </Link>
        <Link
          href="/executor"
          className="flex flex-col items-center gap-1 text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <span className="text-xs">Corretora</span>
        </Link>
      </nav>
    </div>
  );
}
