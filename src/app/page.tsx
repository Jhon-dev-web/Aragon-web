"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthToken, fetchPublicSummary, type PublicSummary } from "./api";
import { useAuth } from "./context/AuthContext";

function ToastRecursoEmBreve({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-[#1F2937] border border-[#374151] text-[#E5E7EB] text-sm shadow-xl flex items-center gap-3">
      <span>Recurso em breve.</span>
      <button type="button" onClick={onDismiss} className="p-1 rounded-lg hover:bg-white/10 text-[#9CA3AF]" aria-label="Fechar">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

function SkeletonMetric() {
  return (
    <div className="rounded-xl h-20 bg-[#1F2937]/80 animate-pulse border border-[#374151]/50" />
  );
}

function TrustCards({ summary }: { summary: PublicSummary | null | undefined }) {
  const loading = summary === undefined;
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
      </div>
    );
  }
  const s = summary ?? null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl px-5 py-4 bg-[#111827]/90 border border-[#1F2937] text-center backdrop-blur-sm">
        <p className="text-2xl sm:text-3xl font-bold text-[#E5E7EB] tabular-nums">
          {s?.assets_evaluated ?? "—"}
        </p>
        <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">Ativos avaliados</p>
      </div>
      <div className="rounded-xl px-5 py-4 bg-[#111827]/90 border border-[#1F2937] text-center backdrop-blur-sm">
        <p className="text-2xl sm:text-3xl font-bold text-[#E5E7EB] tabular-nums">
          {s?.cycles_total != null && s.cycles_total > 0 ? s.cycles_total.toLocaleString("pt-BR") : "—"}
        </p>
        <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">Ciclos totais</p>
      </div>
      <div className="rounded-xl px-5 py-4 bg-[#111827]/90 border border-[#1F2937] text-center backdrop-blur-sm">
        {s?.top_asset ? (
          <>
            <p className="text-lg sm:text-xl font-semibold text-[#22C55E]">{s.top_asset.label}</p>
            <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">
              {s.top_asset.win_rate_pct}% · {s.top_asset.cycles} ciclos
            </p>
            <p className="text-xs text-[#6B7280] mt-0.5">Top ativo agora</p>
          </>
        ) : (
          <>
            <p className="text-xl font-semibold text-[#6B7280]">—</p>
            <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">Top ativo agora</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [showToast, setShowToast] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [summary, setSummary] = useState<PublicSummary | null | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const toast = params.get("toast");
    if (toast === "recurso_em_breve") {
      setShowToast(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("toast");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPublicSummary()
      .then((data) => {
        if (!cancelled) setSummary(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => { cancelled = true; };
  }, []);

  const isLoggedIn = !!user || (!authLoading && !!getAuthToken());

  const handleAcessarAragon = () => {
    if (getAuthToken()) {
      router.push("/probabilisticas");
    } else {
      router.push("/login");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login?logout=1");
  };

  const planQuery = (plan: "free" | "advanced" | "pro_plus") => `/login?plan=${plan}`;

  const handlePlanCta = (plan: "free" | "advanced" | "pro_plus") => {
    if (getAuthToken()) {
      setShowUpgradeModal(true);
    } else {
      router.push(planQuery(plan));
    }
  };

  return (
    <div className="min-h-screen text-[#E5E7EB] flex flex-col relative overflow-hidden">
      {/* Background: gradiente + overlay sutil + candles faint */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: "linear-gradient(165deg, #030712 0%, #0B1220 35%, #111827 70%, #0B1220 100%)",
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath fill='%239CA3AF' d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-32 h-48 border-l border-[#2563EB]/30 rounded-t" />
        <div className="absolute bottom-0 right-1/3 w-24 h-36 border-l border-[#22C55E]/20 rounded-t" />
        <div className="absolute top-1/3 right-1/4 w-20 h-28 border-l border-[#2563EB]/20 rounded-t" />
      </div>

      {showToast && <ToastRecursoEmBreve onDismiss={() => setShowToast(false)} />}

      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">Upgrade em breve</h3>
            <p className="text-sm text-[#9CA3AF] mb-6">
              A assinatura de planos Avançado e PRO+ estará disponível em breve. Você já pode usar o plano Grátis em Probabilísticas.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] transition-colors"
              >
                Fechar
              </button>
              <Link
                href="/probabilisticas"
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white text-center transition-colors"
              >
                Ir ao painel
              </Link>
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#1F2937]/80 shrink-0 bg-[#0B1220]/50 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#2563EB]/20">
            <span className="text-white font-bold text-sm">AA</span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#E5E7EB]">ARAGON ANALYTICS</h1>
            <p className="text-xs text-[#9CA3AF] hidden sm:block">Trading Intelligence Platform</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link
                href="/probabilisticas"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors"
              >
                Ir ao painel
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] hover:border-[#4B5563] transition-colors"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] hover:border-[#4B5563] transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero centralizado */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#E5E7EB] tracking-tight mb-4">
            Trading Intelligence Platform
          </h2>
          <p className="text-[#9CA3AF] text-base sm:text-lg mb-8">
            Catalogação probabilística de estratégias com ranking por assertividade e ciclos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={handleAcessarAragon}
              className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-all shadow-lg shadow-[#2563EB]/25 hover:shadow-[#2563EB]/40"
            >
              Acessar Aragon
            </button>
            <a
              href="#planos"
              className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] hover:border-[#4B5563] transition-colors text-center"
            >
              Ver Planos
            </a>
          </div>
        </section>

        {/* Prova / Trust */}
        <section className="px-4 sm:px-6 py-8 sm:py-10 border-t border-[#1F2937]/80">
          <div className="max-w-4xl mx-auto">
            <TrustCards summary={summary} />
          </div>
        </section>

        {/* Como funciona */}
        <section className="px-4 sm:px-6 py-12 sm:py-16 border-t border-[#1F2937]/80">
          <h3 className="text-xl sm:text-2xl font-semibold text-[#E5E7EB] text-center mb-10">Como funciona</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="rounded-2xl p-6 bg-[#111827]/80 border border-[#1F2937] text-center backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-[#2563EB]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-[#2563EB] font-bold text-lg">1</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Escolha estratégia e timeframe</h4>
              <p className="text-sm text-[#9CA3AF]">Selecione MHI, 3 Mosqueteiros ou outra estratégia e a janela (2h, 4h, 24h).</p>
            </div>
            <div className="rounded-2xl p-6 bg-[#111827]/80 border border-[#1F2937] text-center backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-[#2563EB]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-[#2563EB] font-bold text-lg">2</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Catalogamos histórico e ciclos</h4>
              <p className="text-sm text-[#9CA3AF]">O motor processa candles e classifica cada ciclo (P, G1, H) por ativo.</p>
            </div>
            <div className="rounded-2xl p-6 bg-[#111827]/80 border border-[#1F2937] text-center backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-[#2563EB]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-[#2563EB] font-bold text-lg">3</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Ranking e consistência por ativo</h4>
              <p className="text-sm text-[#9CA3AF]">Você vê os ativos mais assertivos e pode filtrar por min ciclos e Top N.</p>
            </div>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="px-4 sm:px-6 py-12 sm:py-16 border-t border-[#1F2937]/80 scroll-mt-6">
          <h3 className="text-xl sm:text-2xl font-semibold text-[#E5E7EB] text-center mb-10">Planos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* GRÁTIS */}
            <div className="rounded-2xl p-6 bg-[#111827]/90 border border-[#1F2937] flex flex-col backdrop-blur-sm">
              <h4 className="text-lg font-semibold text-[#E5E7EB] mb-1">GRÁTIS</h4>
              <p className="text-[#9CA3AF] text-sm mb-4">Para começar</p>
              <ul className="space-y-3 text-sm text-[#D1D5DB] mb-6 flex-1">
                <li className="flex items-center gap-2"><span className="text-[#22C55E] font-bold">✓</span> 1 estratégia</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E] font-bold">✓</span> 1 ativo</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E] font-bold">✓</span> Ranking básico</li>
              </ul>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => handlePlanCta("free")}
                  className="w-full py-3 rounded-xl text-sm font-medium bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] transition-colors"
                >
                  Começar grátis
                </button>
              ) : (
                <Link
                  href={planQuery("free")}
                  className="block w-full py-3 rounded-xl text-sm font-medium text-center bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] transition-colors"
                >
                  Começar grátis
                </Link>
              )}
            </div>

            {/* AVANÇADO - Popular com glow */}
            <div className="rounded-2xl p-6 bg-[#111827]/90 flex flex-col relative backdrop-blur-sm border-2 border-[#2563EB]/60 shadow-[0_0_24px_rgba(37,99,235,0.15)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#2563EB] text-white text-xs font-semibold shadow-lg">
                Popular
              </div>
              <h4 className="text-lg font-semibold text-[#E5E7EB] mb-1">AVANÇADO</h4>
              <p className="text-[#9CA3AF] text-sm mb-4">Para evoluir</p>
              <ul className="space-y-3 text-sm text-[#D1D5DB] mb-6 flex-1">
                <li className="flex items-center gap-2"><span className="text-[#22C55E] font-bold">✓</span> 2 estratégias</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E] font-bold">✓</span> 3 ativos</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E] font-bold">✓</span> Ranking + filtros</li>
              </ul>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => handlePlanCta("advanced")}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-all shadow-lg shadow-[#2563EB]/25"
                >
                  Assinar Avançado
                </button>
              ) : (
                <Link
                  href={planQuery("advanced")}
                  className="block w-full py-3 rounded-xl text-sm font-semibold text-center bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-all shadow-lg shadow-[#2563EB]/25"
                >
                  Assinar Avançado
                </Link>
              )}
            </div>

            {/* PRO+ */}
            <div className="rounded-2xl p-6 bg-[#111827]/90 border border-[#1F2937] flex flex-col backdrop-blur-sm">
              <h4 className="text-lg font-semibold text-[#E5E7EB] mb-1">PRO+</h4>
              <p className="text-[#9CA3AF] text-sm mb-4">Máximo desempenho</p>
              <ul className="space-y-3 text-sm text-[#D1D5DB] mb-6 flex-1">
                <li className="flex items-center gap-2"><span className="text-[#22C55E] font-bold">✓</span> Todas as estratégias</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E] font-bold">✓</span> Todos os ativos</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E] font-bold">✓</span> Atualizações premium</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E] font-bold">✓</span> Acesso futuro ao robô grátis por 2 semanas</li>
              </ul>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => handlePlanCta("pro_plus")}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-[#7C3AED] hover:bg-[#8B5CF6] text-white transition-all shadow-lg shadow-[#7C3AED]/20"
                >
                  Assinar PRO+
                </button>
              ) : (
                <Link
                  href={planQuery("pro_plus")}
                  className="block w-full py-3 rounded-xl text-sm font-semibold text-center bg-[#7C3AED] hover:bg-[#8B5CF6] text-white transition-all shadow-lg shadow-[#7C3AED]/20"
                >
                  Assinar PRO+
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 sm:px-6 py-8 border-t border-[#1F2937]/80 text-center text-sm text-[#9CA3AF]">
          <p>ARAGON ANALYTICS — Trading Intelligence Platform</p>
          <p className="mt-1">
            <a href="#" className="hover:text-[#E5E7EB] transition-colors">Termos</a>
            {" · "}
            <a href="#" className="hover:text-[#E5E7EB] transition-colors">Contato</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
