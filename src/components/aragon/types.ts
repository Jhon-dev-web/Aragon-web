/**
 * Tipos e mock para o dashboard ARAGON.
 * A UI não inventa dados; tudo vem do mock (ou depois da API).
 */

export type MarketType = "OPEN" | "OTC";
export type SignalDirection = "CALL" | "PUT" | "NONE";
export type ValidFor = "NEXT_CANDLE" | "CURRENT_CANDLE";

export type ConfluencePolarity = "confirm" | "neutral" | "against";

export interface ConfluenceItem {
  id: string;
  name: string;
  description: string;
  polarity: ConfluencePolarity;
  weight: number; // 0..1
  value: string;
}

export interface CandleRow {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  color: "green" | "red" | "doji";
}

export interface DashboardSignalResponse {
  symbol: string;
  marketType: MarketType;
  timeframe: number; // segundos, ex: 60
  validFor: ValidFor;
  direction: SignalDirection;
  confidence: number; // 0..100
  score: number; // 0..100 força geral
  votes: { call: number; put: number };
  confluences: ConfluenceItem[];
  candles: CandleRow[];
  lastUpdatedAt?: string; // ISO
}

/** Estados do fluxo de análise */
export type DashboardState = "idle" | "loading" | "ready" | "cooldown" | "error";

/** Mock para desenvolvimento e validação visual */
export function mockDashboardSignal(): DashboardSignalResponse {
  return {
    symbol: "EURUSD",
    marketType: "OTC",
    timeframe: 60,
    validFor: "NEXT_CANDLE",
    direction: "CALL",
    confidence: 72,
    score: 68,
    votes: { call: 5, put: 2 },
    confluences: [
      { id: "ema", name: "EMA 9/21", description: "Média móvel exponencial: tendência de alta", polarity: "confirm", weight: 0.9, value: "CALL (EMA9 > EMA21)" },
      { id: "vwap", name: "VWAP", description: "Preço acima do volume-weighted average price", polarity: "confirm", weight: 0.85, value: "CALL (preço acima VWAP)" },
      { id: "rsi", name: "RSI 14", description: "Índice de força relativa: neutro", polarity: "neutral", weight: 0.5, value: "neutro RSI=54" },
      { id: "macd", name: "MACD", description: "Histograma positivo", polarity: "confirm", weight: 0.75, value: "CALL (histograma positivo)" },
      { id: "adx", name: "ADX", description: "Força da tendência", polarity: "confirm", weight: 0.7, value: "CALL (+DI > -DI)" },
      { id: "engulfing", name: "Engulfing", description: "Padrão de reversão", polarity: "against", weight: 0.3, value: "neutro" },
    ],
    candles: [
      { ts: Math.floor(Date.now() / 1000) - 300, open: 1.0842, high: 1.0845, low: 1.0840, close: 1.0844, color: "green" },
      { ts: Math.floor(Date.now() / 1000) - 240, open: 1.0844, high: 1.0848, low: 1.0842, close: 1.0843, color: "red" },
      { ts: Math.floor(Date.now() / 1000) - 180, open: 1.0843, high: 1.0847, low: 1.0841, close: 1.0846, color: "green" },
      { ts: Math.floor(Date.now() / 1000) - 120, open: 1.0846, high: 1.0850, low: 1.0844, close: 1.0849, color: "green" },
      { ts: Math.floor(Date.now() / 1000) - 60, open: 1.0849, high: 1.0852, low: 1.0846, close: 1.0850, color: "green" },
    ],
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function confidenceLabel(confidence: number): "Baixa" | "Média" | "Alta" {
  if (confidence < 40) return "Baixa";
  if (confidence < 70) return "Média";
  return "Alta";
}

export function strengthLabel(score: number): "Fraca" | "Moderada" | "Forte" {
  if (score < 40) return "Fraca";
  if (score < 65) return "Moderada";
  return "Forte";
}

// ----- Resultado automático (WIN/LOSS/DRAW) — fluxo travado -----

export type SignalResult = "WIN" | "LOSS" | "DRAW" | "UNKNOWN";

/** Status do trade atual: ARMED = countdown até entrada; IN_TRADE = operando; RESOLVED = fechado. */
export type TradeStatus = "ARMED" | "IN_TRADE" | "RESOLVED";

export interface TradeRecord {
  id: string;
  symbol: string;
  marketType: MarketType;
  timeframeSec: number;
  direction: SignalDirection;
  confidence: number;
  score: number;
  confluences: ConfluenceItem[];
  generatedAtMs: number;
  targetTsMs: number; // início da vela alvo (ms)
  status: TradeStatus;
  result: SignalResult;
  candleOpen?: number;
  candleClose?: number;
  resolvedAtMs?: number;
}

/** Próximo alinhamento do timeframe (início da próxima vela) em ms. */
export function nextAlignedTs(nowMs: number, timeframeSec: number): number {
  const intervalMs = timeframeSec * 1000;
  return (Math.floor(nowMs / intervalMs) + 1) * intervalMs;
}

/** Formata countdown em ms para "MM:SS". */
export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Resolve resultado: entry = open, closePrice = close da vela alvo. */
export function resolve(
  direction: SignalDirection,
  open: number,
  close: number
): SignalResult {
  if (direction === "NONE") return "UNKNOWN";
  if (close > open) return direction === "CALL" ? "WIN" : "LOSS";
  if (close < open) return direction === "PUT" ? "WIN" : "LOSS";
  return "DRAW";
}

/** Normaliza candle.ts para ms (API pode enviar em s ou ms). */
export function candleTsToMs(ts: number): number {
  return ts > 1e12 ? ts : ts * 1000;
}

/** Encontra candle com timestamp alvo (comparação em ms). */
export function findCandleByTsMs(candles: CandleRow[], targetTsMs: number): CandleRow | null {
  for (const c of candles) {
    if (candleTsToMs(c.ts) === targetTsMs) return c;
  }
  return null;
}

/** Gera id único para o record. */
export function createTradeRecordId(): string {
  return `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ----- Persistência (versionamento simples) -----

export const TRADE_CURRENT_KEY = "aragon_trade_current";
export const TRADE_HISTORY_KEY = "aragon_trade_history";
export const TRADE_STORAGE_VERSION = 1;
