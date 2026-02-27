import { NextResponse } from "next/server";

const PRODUCTION_FALLBACK = "https://aragon-api.onrender.com";
const DEV_FALLBACK = "http://127.0.0.1:8000";

/**
 * Retorna a URL usada nos rewrites /api/* (para debug em /healthcheck-front).
 * Não fica sob /api para não ser reescrita para o backend.
 */
export function GET() {
  const isProduction = process.env.NODE_ENV === "production";
  const raw = process.env.API_BACKEND_URL?.trim() || "";
  const destination = raw
    ? raw.replace(/\/$/, "")
    : isProduction
      ? PRODUCTION_FALLBACK
      : DEV_FALLBACK;
  return NextResponse.json({
    destination,
    configured: !!raw,
    nodeEnv: process.env.NODE_ENV,
  });
}
