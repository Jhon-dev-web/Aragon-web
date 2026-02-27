"use client";

import { useState, useEffect } from "react";

type DebugBackend = {
  destination: string;
  configured: boolean;
  nodeEnv: string;
};

type HealthResponse = {
  status?: string;
  server_now?: string;
  asset_default?: string;
};

export default function HealthcheckFrontPage() {
  const [backendInfo, setBackendInfo] = useState<DebugBackend | null>(null);
  const [healthResult, setHealthResult] = useState<{
    ok: boolean;
    status: number;
    body: HealthResponse | string;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const base = typeof window !== "undefined" ? window.location.origin : "";
        const resBackend = await fetch(`${base}/debug-backend`);
        const dataBackend = (await resBackend.json()) as DebugBackend;
        if (!cancelled) setBackendInfo(dataBackend);

        const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";
        const healthUrl = apiBase.startsWith("http") ? `${apiBase}/health` : `${base}${apiBase}/health`;
        try {
          const resHealth = await fetch(healthUrl);
          const body = resHealth.ok
            ? ((await resHealth.json()) as HealthResponse)
            : await resHealth.text();
          if (!cancelled) {
            setHealthResult({
              ok: resHealth.ok,
              status: resHealth.status,
              body,
            });
          }
        } catch (err) {
          if (!cancelled) {
            setHealthResult({
              ok: false,
              status: 0,
              body: "",
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      } catch (e) {
        if (!cancelled) {
          setBackendInfo(null);
          setHealthResult({
            ok: false,
            status: 0,
            body: "",
            error: e instanceof Error ? e.message : String(e),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB] p-6">
        <h1 className="text-xl font-semibold mb-4">Healthcheck Frontend (debug)</h1>
        <p className="text-[#9CA3AF]">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB] p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-2">Healthcheck Frontend</h1>
      <p className="text-sm text-[#9CA3AF] mb-6">
        Debug: URL usada nos rewrites e resultado de GET /api/health.
      </p>

      <section className="mb-6 p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
        <h2 className="text-sm font-medium text-[#9CA3AF] mb-2">Backend (rewrite destination)</h2>
        {backendInfo ? (
          <ul className="text-sm space-y-1 font-mono">
            <li>
              <span className="text-[#9CA3AF]">URL final: </span>
              <span className="text-[#E5E7EB]">{backendInfo.destination}</span>
            </li>
            <li>
              <span className="text-[#9CA3AF]">API_BACKEND_URL configurado: </span>
              <span className={backendInfo.configured ? "text-green-400" : "text-amber-400"}>
                {backendInfo.configured ? "sim" : "não (usando fallback)"}
              </span>
            </li>
            <li>
              <span className="text-[#9CA3AF]">NODE_ENV: </span>
              <span className="text-[#E5E7EB]">{backendInfo.nodeEnv}</span>
            </li>
          </ul>
        ) : (
          <p className="text-amber-400 text-sm">Não foi possível obter /debug-backend</p>
        )}
      </section>

      <section className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
        <h2 className="text-sm font-medium text-[#9CA3AF] mb-2">GET /api/health</h2>
        {healthResult ? (
          <>
            <p className="text-sm mb-2">
              Status:{" "}
              <span className={healthResult.ok ? "text-green-400" : "text-red-400"}>
                {healthResult.status} {healthResult.ok ? "OK" : ""}
              </span>
              {healthResult.error && (
                <span className="text-red-400 block mt-1">{healthResult.error}</span>
              )}
            </p>
            <pre className="text-xs bg-[#0B1220] p-3 rounded-lg overflow-auto max-h-48">
              {typeof healthResult.body === "string"
                ? healthResult.body
                : JSON.stringify(healthResult.body, null, 2)}
            </pre>
          </>
        ) : (
          <p className="text-[#9CA3AF] text-sm">—</p>
        )}
      </section>
    </div>
  );
}
