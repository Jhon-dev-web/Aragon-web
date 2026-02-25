"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  fetchCandles,
  fetchSignalsAnalyze,
  fetchHealth,
  fetchAssets,
  getMarketWsUrl,
  type CandleItem,
  type SignalsAnalyzeResponse,
  type AssetOption,
} from "./api";

function tsToTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function isOtc(symbol: string): boolean {
  return (symbol || "").toUpperCase().endsWith("-OTC");
}

// --- Subcomponentes premium (apenas UI) ---
function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const isCall = pct >= 50;
  return (
    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${pct}%`,
          background: isCall ? "linear-gradient(90deg, #22c55e, #4ade80)" : "linear-gradient(90deg, #ef4444, #f87171)",
        }}
      />
    </div>
  );
}

function CountdownRing({ seconds }: { seconds: number }) {
  const total = 60;
  const progress = (total - seconds) / total;
  const circumference = 2 * Math.PI * 22;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = seconds < 10;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="22" fill="none" className="stroke-white/10" strokeWidth="4" />
        <circle
          cx="26"
          cy="26"
          r="22"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
          style={{
            stroke: isUrgent ? "#ef4444" : "#3b82f6",
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>
      <span className="absolute font-mono font-bold text-sm tabular-nums text-[#e6edf3]">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
      </span>
    </div>
  );
}

function ConfluenceChips({ confluences }: { confluences: Record<string, string> }) {
  const entries = Object.entries(confluences || {});
  const chipStyle = (value: string) => {
    const v = value.toUpperCase();
    if (v.includes("CALL") || v.includes("BULL") || v.includes("ALTA") || v.includes(">")) return "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30";
    if (v.includes("PUT") || v.includes("BEAR") || v.includes("BAIXA") || v.includes("<")) return "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30";
    return "bg-white/5 text-[#8b9bb3] border-white/10";
  };
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          title={value}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${chipStyle(value)}`}
        >
          {key.replace(/_/g, " ")} {value.includes("CALL") ? "↑" : value.includes("PUT") ? "↓" : ""}
        </span>
      ))}
    </div>
  );
}

export default function Dashboard() {
  type TradePhase = "IDLE" | "ARMED" | "IN_TRADE" | "RESOLVED";
  type TradeResult = "WIN" | "LOSS" | "DRAW" | "UNKNOWN";
  interface TradeState {
    direction: "CALL" | "PUT";
    targetTsSec: number;
    phase: TradePhase;
    result: TradeResult;
    candleOpen?: number;
    candleClose?: number;
  }

  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [asset, setAsset] = useState("");
  const [showOpen, setShowOpen] = useState(true);
  const [showOtc, setShowOtc] = useState(true);
  const [candles, setCandles] = useState<CandleItem[]>([]);
  const [analyzeResult, setAnalyzeResult] = useState<SignalsAnalyzeResponse | null>(null);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [loadingSignal, setLoadingSignal] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assetDefault, setAssetDefault] = useState("");
  const candlesControllerRef = useRef<AbortController | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [trade, setTrade] = useState<TradeState | null>(null);
  const [showCandles, setShowCandles] = useState(false);

  const loadCandles = useCallback(async () => {
    if (!asset) return;
    candlesControllerRef.current?.abort();
    candlesControllerRef.current = new AbortController();
    setLoadingCandles(true);
    setError(null);
    try {
      const data = await fetchCandles(asset, 20, candlesControllerRef.current.signal);
      setCandles(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar candles");
      setCandles([]);
    } finally {
      setLoadingCandles(false);
    }
  }, [asset]);

  useEffect(() => {
    loadCandles();
  }, [loadCandles]);

  const wsRef = useRef<WebSocket | null>(null);
  const subscribedSymbolRef = useRef<string | null>(null);
  const assetRef = useRef<string>(asset);
  assetRef.current = asset;
  useEffect(() => {
    const wsUrl = getMarketWsUrl();
    if (!wsUrl || !asset) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      try {
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "subscribe", symbol: asset, timeframe: 60 }));
          subscribedSymbolRef.current = asset;
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if ((msg.type === "snapshot" || msg.type === "update") && msg.symbol === assetRef.current && Array.isArray(msg.candles)) {
              setCandles(msg.candles);
            }
          } catch (_) {}
        };
        ws.onerror = () => {};
        ws.onclose = () => { wsRef.current = null; subscribedSymbolRef.current = null; };
        wsRef.current = ws;
      } catch (_) {
        wsRef.current = null;
      }
      return () => {
        if (wsRef.current) {
          if (subscribedSymbolRef.current) {
            try { wsRef.current.send(JSON.stringify({ type: "unsubscribe", symbol: subscribedSymbolRef.current })); } catch (_) {}
          }
          wsRef.current.close();
          wsRef.current = null;
          subscribedSymbolRef.current = null;
        }
      };
    }
    const prev = subscribedSymbolRef.current;
    if (prev && prev !== asset) {
      try { wsRef.current?.send(JSON.stringify({ type: "unsubscribe", symbol: prev })); } catch (_) {}
    }
    try { wsRef.current?.send(JSON.stringify({ type: "subscribe", symbol: asset, timeframe: 60 })); } catch (_) {}
    subscribedSymbolRef.current = asset;
    return () => {};
  }, [asset]);

  useEffect(() => {
    const tick = () => {
      const nowMs = Date.now();
      const nextCandleEndMs = Math.ceil(nowMs / 60_000) * 60_000;
      const sec = Math.max(0, Math.floor((nextCandleEndMs - nowMs) / 1000));
      setCountdownSeconds(sec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Atualização automática de candles (fallback caso o WebSocket não entregue updates em tempo real).
  // A cada alguns segundos, se a aba estiver visível e não houver fetch em andamento, chama loadCandles().
  useEffect(() => {
    if (!asset) return;
    const INTERVAL_MS = 10_000;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (loadingCandles) return;
      loadCandles();
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [asset, loadCandles, loadingCandles]);

  useEffect(() => {
    fetchHealth()
      .then((h) => setAssetDefault(h.asset_default || ""))
      .catch(() => {});
  }, []);

  // Trade flow: sinal sempre para PRÓXIMA vela (M1).
  // 1) Ao gerar análise CALL/PUT, armamos trade para a próxima vela (ARMED).
  // 2) Quando chegar targetTsSec, mudamos para IN_TRADE.
  // 3) Quando candle alvo aparecer em candles (ts == targetTsSec), resolvemos WIN/LOSS/DRAW.

  // ARMED -> IN_TRADE (quando o timestamp da vela alvo chegar)
  useEffect(() => {
    if (!trade || trade.phase !== "ARMED") return;
    const targetTs = trade.targetTsSec;
    const id = setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec >= targetTs) {
        setTrade((prev) => {
          if (!prev || prev.phase !== "ARMED" || prev.targetTsSec !== targetTs) return prev;
          return { ...prev, phase: "IN_TRADE" };
        });
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [trade?.phase, trade?.targetTsSec]);

  // IN_TRADE -> RESOLVED quando candle alvo chegar em candles
  useEffect(() => {
    if (!trade || trade.phase !== "IN_TRADE") return;
    const targetTs = trade.targetTsSec;
    const candle = candles.find((c) => Math.floor(c.ts) === targetTs);
    if (!candle) return;
    const open = candle.open;
    const close = candle.close;
    let result: TradeResult = "UNKNOWN";
    if (close > open) {
      result = trade.direction === "CALL" ? "WIN" : "LOSS";
    } else if (close < open) {
      result = trade.direction === "PUT" ? "WIN" : "LOSS";
    } else {
      result = "DRAW";
    }
    setTrade((prev) => {
      if (!prev || prev.phase !== "IN_TRADE" || prev.targetTsSec !== targetTs) return prev ?? null;
      return { ...prev, phase: "RESOLVED", result, candleOpen: open, candleClose: close };
    });
  }, [candles, trade?.phase, trade?.targetTsSec, trade?.direction]);

  // Fallback quando WebSocket não atualizar candles:
  // em IN_TRADE, tenta chamar loadCandles automaticamente algumas vezes
  // para buscar o candle fechado da vela alvo, sem o usuário precisar clicar em "Atualizar Mercado".
  useEffect(() => {
    if (!trade || trade.phase !== "IN_TRADE") return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      if (attempts > 3) {
        clearInterval(id);
        return;
      }
      loadCandles();
    }, 5_000);
    return () => clearInterval(id);
  }, [trade?.phase, loadCandles]);

  useEffect(() => {
    let cancelled = false;
    setAssetsError(null);
    fetchAssets()
      .then((list) => {
        if (cancelled) return;
        setAssets(list);
        if (list.length && !asset) setAsset(list[0].symbol);
      })
      .catch((e) => {
        if (!cancelled)
          setAssetsError(
            e instanceof Error ? e.message : "Não foi possível carregar ativos da corretora"
          );
      });
    return () => { cancelled = true; };
  }, []);

  const visibleAssets = assets.filter(
    (a) => (a.market === "open" && showOpen) || (a.market === "otc" && showOtc)
  );

  useEffect(() => {
    if (visibleAssets.length && !asset) setAsset(visibleAssets[0].symbol);
  }, [visibleAssets.length, asset]);

  useEffect(() => {
    if (!assetDefault || !assets.length) return;
    if (!assets.some((a) => a.symbol === assetDefault)) return;
    setAsset((prev) => (prev === "" || prev === visibleAssets[0]?.symbol ? assetDefault : prev));
  }, [assetDefault, assets]);

  useEffect(() => {
    const visible = assets.filter(
      (a) => (a.market === "open" && showOpen) || (a.market === "otc" && showOtc)
    );
    if (visible.length && asset && !visible.some((a) => a.symbol === asset)) {
      setAsset(visible[0].symbol);
    }
  }, [showOpen, showOtc, assets, asset]);

  const handleAnalisar = async () => {
    setLoadingSignal(true);
    setError(null);
    setAnalyzeResult(null);
    try {
      await loadCandles();
      const data = await fetchSignalsAnalyze(asset, 60);
      setAnalyzeResult(data);
      const dir = (data.direction ?? "").toUpperCase().trim();
      if (dir === "CALL" || dir === "PUT") {
        const nowSec = Math.floor(Date.now() / 1000);
        const targetTsSec = Math.floor(nowSec / 60) * 60 + 60; // próxima vela M1
        setTrade({
          direction: dir as "CALL" | "PUT",
          targetTsSec,
          phase: "ARMED",
          result: "UNKNOWN",
        });
      } else {
        setTrade(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao analisar confluências";
      const isNetwork = /fetch|rede|network|failed to fetch/i.test(msg);
      setError(isNetwork ? `${msg}. Verifique se a API está rodando (python run_api.py na porta 8000).` : msg);
    } finally {
      setLoadingSignal(false);
    }
  };

  const confidence = analyzeResult?.confidence ?? 50;
  const confluenceCount = analyzeResult?.confluences ? Object.keys(analyzeResult.confluences).length : 0;

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #060b14 0%, #0b1624 100%)" }}>
      {/* Overlay de desativação da aba de análise */}
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#020617] px-6 py-5 text-center shadow-2xl shadow-black/60">
          <h2 className="text-lg font-semibold text-[#e6edf3] mb-2">Aba de análise desativada</h2>
          <p className="text-sm text-[#8b9bb3] mb-4">
            Esta aba está temporariamente desativada. Use a aba Probabilísticas para acompanhar os sinais.
          </p>
          <a
            href="/probabilisticas"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-colors"
          >
            Ir para Probabilísticas
          </a>
        </div>
      </div>
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#3b82f6]/20 flex items-center justify-center flex-shrink-0 border border-[#3b82f6]/30">
            <span className="text-[#3b82f6] font-bold text-sm">AA</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#e6edf3]">ARAGON ANALYTICS</h1>
            <p className="text-xs text-[#8b9bb3]">Trading Intelligence Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
            <svg className="w-5 h-5 text-[#8b9bb3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <button type="button" className="p-2 rounded-xl hover:bg-white/5 transition-colors" aria-label="Sair">
            <svg className="w-5 h-5 text-[#8b9bb3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-[1200px] mx-auto w-full">
        <div className="w-full space-y-6">
          {(assetsError || error) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-200 text-sm text-center">
              {assetsError || error}
            </div>
          )}

          {/* Controles: par + CTA */}
          <section className="rounded-2xl p-5 border border-white/10 bg-white/[0.04] backdrop-blur-sm shadow-xl shadow-black/20">
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <div className="flex flex-wrap gap-3 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOpen}
                    onChange={(e) => setShowOpen(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-[#3b82f6] focus:ring-[#3b82f6]/50"
                  />
                  <span className="text-xs text-[#8b9bb3]">OPEN</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOtc}
                    onChange={(e) => setShowOtc(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-[#3b82f6] focus:ring-[#3b82f6]/50"
                  />
                  <span className="text-xs text-[#8b9bb3]">OTC</span>
                </label>
                <select
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm min-w-[11rem] text-[#e6edf3] focus:border-[#3b82f6]/50 focus:ring-1 focus:ring-[#3b82f6]/30 outline-none transition-all"
                  disabled={!visibleAssets.length}
                >
                  {visibleAssets.map((a) => (
                    <option key={a.symbol} value={a.symbol}>
                      {a.label} ({a.market === "otc" ? "OTC" : "OPEN"})
                    </option>
                  ))}
                </select>
                {asset && (
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      isOtc(asset)
                        ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                        : "bg-white/5 text-[#8b9bb3] border border-white/10"
                    }`}
                  >
                    {isOtc(asset) ? "OTC" : "OPEN"}
                  </span>
                )}
              </div>
              <button
                onClick={handleAnalisar}
                disabled={loadingSignal || !asset}
                className="bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#60a5fa] hover:to-[#3b82f6] disabled:from-[#1f2937] disabled:to-[#1f2937] disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-2xl text-sm flex items-center gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-[#3b82f6]/20 hover:-translate-y-0.5 active:translate-y-0"
              >
                {loadingSignal ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analisando…
                  </>
                ) : (
                  <>
                    Analisar
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#8b9bb3]">Fechamento da vela</span>
                <CountdownRing seconds={countdownSeconds} />
              </div>
              <p className="text-xs text-[#8b9bb3]">
                Clique em Analisar para gerar o sinal para a próxima vela.
              </p>
            </div>
          </section>

          {/* Card único: Sinal + resultado */}
          <section className="rounded-[18px] p-6 sm:p-8 border border-white/10 bg-white/[0.04] backdrop-blur-sm shadow-2xl shadow-black/30 transition-all duration-300">
            {!analyzeResult ? (
              <div className="text-center py-12">
                <p className="text-[#8b9bb3] text-sm mb-1">Sinal para próxima vela</p>
                <p className="text-[#8b9bb3] text-sm">Clique em <strong className="text-[#e6edf3]">Analisar</strong> para ver a direção (CALL/PUT) e confluências.</p>
                <p className="text-[#8b9bb3] text-xs mt-4 max-w-md mx-auto">
                  Baseado em análise probabilística e confluência de indicadores.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-[#8b9bb3] text-sm text-center">Sinal para próxima vela</p>
                <div
                  className={`relative rounded-2xl p-8 text-center transition-all duration-300 ${
                    analyzeResult.direction === "CALL"
                      ? "bg-[#22c55e]/10 border-2 border-[#22c55e]/30 shadow-[0_0_40px_rgba(34,197,94,0.15)]"
                      : "bg-[#ef4444]/10 border-2 border-[#ef4444]/30 shadow-[0_0_40px_rgba(239,68,68,0.15)]"
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    {analyzeResult.direction === "CALL" ? (
                      <svg className="w-12 h-12 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : (
                      <svg className="w-12 h-12 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-4xl sm:text-5xl font-bold tracking-tight ${analyzeResult.direction === "CALL" ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {analyzeResult.direction}
                  </p>
                  <div className="mt-4 max-w-xs mx-auto">
                    <div className="flex justify-between text-xs text-[#8b9bb3] mb-1">
                      <span>Confiança</span>
                      <span className="font-mono font-semibold text-[#e6edf3]">{confidence}%</span>
                    </div>
                    <ConfidenceBar value={confidence} />
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-[#8b9bb3]">
                    <span>{confluenceCount}</span>
                    <span>confluências ativas</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[#8b9bb3] text-xs text-center">
                    Motivo da entrada: CALL {analyzeResult.score_call.toFixed(1)} × PUT {analyzeResult.score_put.toFixed(1)} com {confluenceCount} confluências a favor.
                  </p>
                  {/* Aba flutuante de resultado / status do trade */}
                  {trade && (
                    <div className="mt-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      {trade.phase === "ARMED" && (
                        <>
                          <span className="text-[#8b9bb3]">
                            Sinal{" "}
                            <span className={trade.direction === "CALL" ? "text-[#22c55e] font-semibold" : "text-[#ef4444] font-semibold"}>
                              {trade.direction}
                            </span>{" "}
                            armado para vela que inicia em{" "}
                            <span className="font-mono text-[#e6edf3]">{tsToTime(trade.targetTsSec)}</span>.
                          </span>
                          <span className="font-mono text-[#e6edf3]">
                            Entrada em {String(Math.floor(countdownSeconds / 60)).padStart(2, "0")}:
                            {String(countdownSeconds % 60).padStart(2, "0")}
                          </span>
                        </>
                      )}
                      {trade.phase === "IN_TRADE" && (
                        <>
                          <span className="text-[#8b9bb3]">
                            Operando vela iniciada em{" "}
                            <span className="font-mono text-[#e6edf3]">{tsToTime(trade.targetTsSec)}</span>. Aguardando fechamento.
                          </span>
                          <span className="font-mono text-[#e6edf3]">
                            Fim em {String(Math.floor(countdownSeconds / 60)).padStart(2, "0")}:
                            {String(countdownSeconds % 60).padStart(2, "0")}
                          </span>
                        </>
                      )}
                      {trade.phase === "RESOLVED" && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
                          <span className="text-[#8b9bb3]">
                            Resultado:{" "}
                            <span
                              className={`font-semibold ${
                                trade.result === "WIN"
                                  ? "text-[#22c55e]"
                                  : trade.result === "LOSS"
                                  ? "text-[#ef4444]"
                                  : "text-[#8b9bb3]"
                              }`}
                            >
                              {trade.result}
                            </span>
                            .
                          </span>
                          <span className="text-[#8b9bb3]">
                            Vela: <span className="font-mono text-[#e6edf3]">{tsToTime(trade.targetTsSec)}</span>
                            {trade.candleOpen != null && trade.candleClose != null && (
                              <>
                                {" "}
                                ·{" "}
                                <span className="font-mono text-[#e6edf3]">
                                  {trade.candleOpen.toFixed(5)} → {trade.candleClose.toFixed(5)}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
          {/* Últimos candles (opcional, via botão) */}
          <section className="rounded-[18px] p-4 border border-white/10 bg-white/[0.03] backdrop-blur-sm shadow-xl shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-[#e6edf3]">Últimos candles</h2>
              <button
                type="button"
                onClick={() => setShowCandles((v) => !v)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/15 bg-white/5 text-[#e6edf3] hover:bg-white/10 transition-colors"
              >
                {showCandles ? "Esconder" : "Ver últimos candles"}
              </button>
            </div>
            {showCandles && (
              <div className="mt-3">
                <button
                  onClick={loadCandles}
                  disabled={loadingCandles || !asset}
                  className="mb-3 w-full bg-white/5 border border-white/10 hover:border-[#3b82f6]/40 hover:bg-white/[0.08] disabled:opacity-50 text-[#e6edf3] font-medium py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                >
                  {loadingCandles ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-[#3b82f6]/30 border-t-[#3b82f6] rounded-full animate-spin" />
                      Carregando…
                    </>
                  ) : (
                    <>
                      Atualizar Mercado
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </>
                  )}
                </button>
                {error && candles.length === 0 ? (
                  <div className="py-4 px-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex flex-col gap-2">
                    <span>Falha ao carregar candles: {error}</span>
                    <button
                      type="button"
                      onClick={loadCandles}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 hover:bg-red-500/30 text-white transition-colors"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : candles.length === 0 ? (
                  <p className="text-[#8b9bb3] text-sm mt-1">Nenhum candle.</p>
                ) : (
                  <div className="mt-1 overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[#0b1624]/95 backdrop-blur border-b border-white/10 z-10">
                        <tr className="text-[#8b9bb3]">
                          <th className="text-left py-3 px-3 font-medium">Hora</th>
                          <th className="text-right py-3 px-3 font-medium font-mono">O</th>
                          <th className="text-right py-3 px-3 font-medium font-mono">H</th>
                          <th className="text-right py-3 px-3 font-medium font-mono">L</th>
                          <th className="text-right py-3 px-3 font-medium font-mono">C</th>
                          <th className="text-center py-3 px-3 w-10">●</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...candles].reverse().map((c) => (
                          <tr key={c.ts} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                            <td className="py-2.5 px-3 text-[#e6edf3] font-mono">{tsToTime(c.ts)}</td>
                            <td className="text-right px-3 font-mono text-[#e6edf3]">{c.open.toFixed(5)}</td>
                            <td className="text-right px-3 font-mono text-[#e6edf3]">{c.high.toFixed(5)}</td>
                            <td className="text-right px-3 font-mono text-[#e6edf3]">{c.low.toFixed(5)}</td>
                            <td className="text-right px-3 font-mono text-[#e6edf3]">{c.close.toFixed(5)}</td>
                            <td className="text-center py-2.5">
                              {c.color === "green" ? (
                                <span className="inline-block w-2 h-2 rounded-full bg-[#22c55e]" title="Alta" />
                              ) : c.color === "red" ? (
                                <span className="inline-block w-2 h-2 rounded-full bg-[#ef4444]" title="Baixa" />
                              ) : (
                                <span className="inline-block w-2 h-2 rounded-full bg-[#8b9bb3]" title="Doji" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <nav className="flex items-center justify-around py-4 px-4 border-t border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <button type="button" className="flex flex-col items-center gap-1 text-[#8b9bb3] hover:text-[#e6edf3] transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
          <span className="text-xs">Planos</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1 text-[#3b82f6]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span className="text-xs">Análise</span>
        </button>
        <Link href="/probabilisticas" className="flex flex-col items-center gap-1 text-[#8b9bb3] hover:text-[#e6edf3] transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          <span className="text-xs">Probabilísticas</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center gap-1 text-[#8b9bb3] hover:text-[#e6edf3] transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          <span className="text-xs">Corretora</span>
        </Link>
      </nav>
    </div>
  );
}
