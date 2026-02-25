"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  findCandleByTsMs,
  nextAlignedTs,
  resolve,
  TRADE_CURRENT_KEY,
  TRADE_HISTORY_KEY,
  TRADE_STORAGE_VERSION,
  createTradeRecordId,
  type CandleRow,
  type DashboardSignalResponse,
  type TradeRecord,
} from "./types";

const HISTORY_MAX = 500;

interface TradeStorage {
  version: number;
  current: TradeRecord | null;
  history: TradeRecord[];
}

function loadStorage(): TradeStorage {
  if (typeof window === "undefined") {
    return { version: TRADE_STORAGE_VERSION, current: null, history: [] };
  }
  try {
    const rawCurrent = localStorage.getItem(TRADE_CURRENT_KEY);
    const rawHistory = localStorage.getItem(TRADE_HISTORY_KEY);
    const current: TradeRecord | null = rawCurrent ? (JSON.parse(rawCurrent) as TradeRecord) : null;
    const history: TradeRecord[] = rawHistory ? (JSON.parse(rawHistory) as TradeRecord[]) : [];
    if (current?.id && ["ARMED", "IN_TRADE", "RESOLVED"].includes(current.status)) {
      return { version: TRADE_STORAGE_VERSION, current, history: Array.isArray(history) ? history.slice(0, HISTORY_MAX) : [] };
    }
    return { version: TRADE_STORAGE_VERSION, current: null, history: Array.isArray(history) ? history.slice(0, HISTORY_MAX) : [] };
  } catch {
    return { version: TRADE_STORAGE_VERSION, current: null, history: [] };
  }
}

function persist(current: TradeRecord | null, history: TradeRecord[]) {
  try {
    if (current) localStorage.setItem(TRADE_CURRENT_KEY, JSON.stringify(current));
    else localStorage.removeItem(TRADE_CURRENT_KEY);
    localStorage.setItem(TRADE_HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_MAX)));
  } catch {
    // ignore
  }
}

export interface UseTradeFlowArgs {
  candles: CandleRow[];
  currentSymbol: string;
  marketType: "OPEN" | "OTC";
  timeframeSec: number;
}

export interface UseTradeFlowReturn {
  currentTrade: TradeRecord | null;
  lastResolved: TradeRecord | null;
  countdownMs: number;
  startTrade: (signalResponse: DashboardSignalResponse) => void;
  isLocked: boolean;
}

/**
 * Fluxo travado: ao iniciar trade fica ARMED (countdown), depois IN_TRADE, ao fechar vela RESOLVED.
 * Botão Analisar desabilitado durante ARMED e IN_TRADE.
 * Candles em qualquer unidade (s/ms); comparação via targetTsMs.
 */
export function useTradeFlow({
  candles,
  currentSymbol,
  marketType,
  timeframeSec,
}: UseTradeFlowArgs): UseTradeFlowReturn {
  const [currentTrade, setCurrentTrade] = useState<TradeRecord | null>(() => loadStorage().current);
  const [lastResolved, setLastResolved] = useState<TradeRecord | null>(() => {
    const { history } = loadStorage();
    const resolved = history.filter((t) => t.status === "RESOLVED");
    return resolved.length ? resolved[resolved.length - 1] : null;
  });
  const [history, setHistory] = useState<TradeRecord[]>(() => loadStorage().history);
  const [countdownMs, setCountdownMs] = useState(0);
  const historyRef = useRef<TradeRecord[]>(history);
  historyRef.current = history;

  // startTrade: usa apenas symbol/marketType/direction do signal; timeframeSec sempre do args. Persist com history atual via ref.
  const startTrade = useCallback(
    (signalResponse: DashboardSignalResponse) => {
      const dir = (signalResponse.direction ?? "").toString().toUpperCase().trim();
      if (dir !== "CALL" && dir !== "PUT") return;
      const nowMs = Date.now();
      const targetTsMs = nextAlignedTs(nowMs, timeframeSec);
      const record: TradeRecord = {
        id: createTradeRecordId(),
        symbol: (signalResponse.symbol ?? currentSymbol).toString().trim(),
        marketType: signalResponse.marketType ?? marketType,
        timeframeSec,
        direction: dir as "CALL" | "PUT",
        confidence: Number(signalResponse.confidence) || 0,
        score: Number(signalResponse.score) || 0,
        confluences: Array.isArray(signalResponse.confluences) ? signalResponse.confluences : [],
        generatedAtMs: nowMs,
        targetTsMs,
        status: "ARMED",
        result: "UNKNOWN",
      };
      setCurrentTrade(record);
      persist(record, historyRef.current);
    },
    [currentSymbol, marketType, timeframeSec]
  );

  // Timer: countdown quando ARMED; transição ARMED -> IN_TRADE quando now >= targetTsMs. Sem history nas deps (usa ref).
  useEffect(() => {
    if (!currentTrade || currentTrade.status !== "ARMED") {
      setCountdownMs(0);
      return;
    }
    const targetTsMs = currentTrade.targetTsMs;
    const tick = () => {
      const now = Date.now();
      const remaining = targetTsMs - now;
      if (remaining <= 0) {
        setCurrentTrade((prev) => {
          if (!prev || prev.status !== "ARMED") return prev;
          const next: TradeRecord = { ...prev, status: "IN_TRADE" };
          persist(next, historyRef.current);
          return next;
        });
        setCountdownMs(0);
        return;
      }
      setCountdownMs(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentTrade?.id, currentTrade?.status, currentTrade?.targetTsMs]);

  // Resolver: quando candles contêm a vela alvo (ts == targetTsMs), resolve e persiste (incl. quando já entra em IN_TRADE com candle presente)
  useEffect(() => {
    if (!currentTrade || currentTrade.status !== "IN_TRADE") return;
    const candle = findCandleByTsMs(candles, currentTrade.targetTsMs);
    if (!candle) return;

    const result = resolve(currentTrade.direction, candle.open, candle.close);
    const resolvedAtMs = Date.now();
    const resolved: TradeRecord = {
      ...currentTrade,
      status: "RESOLVED",
      result,
      candleOpen: candle.open,
      candleClose: candle.close,
      resolvedAtMs,
    };

    setCurrentTrade(resolved);
    setHistory((prev) => {
      const next = [...prev, resolved];
      persist(resolved, next);
      return next;
    });
    setLastResolved(resolved);
  }, [candles, currentTrade]);

  const isLocked =
    currentTrade !== null && (currentTrade.status === "ARMED" || currentTrade.status === "IN_TRADE");

  return {
    currentTrade,
    lastResolved,
    countdownMs,
    startTrade,
    isLocked,
  };
}
