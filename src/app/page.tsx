"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthToken, fetchPublicSummary, type PublicSummary } from "./api";
import { useAuth } from "./context/AuthContext";

const BULLEX_REGISTER_URL = "https://trade.bull-ex.com/register?aff=814493&aff_model=revenue&afftrack=";

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
    <div className="rounded-xl h-24 bg-[#0F172A] animate-pulse border border-[#1E293B]" />
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
      <div className="rounded-xl px-5 py-5 bg-[#0F172A] border border-[#1E293B] text-center backdrop-blur-sm">
        <p className="text-2xl sm:text-3xl font-bold text-[#E5E7EB] tabular-nums">
          {s?.assets_evaluated ?? "—"}
        </p>
        <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">Ativos avaliados</p>
      </div>
      <div className="rounded-xl px-5 py-5 bg-[#0F172A] border border-[#1E293B] text-center backdrop-blur-sm">
        <p className="text-2xl sm:text-3xl font-bold text-[#E5E7EB] tabular-nums">
          {s?.cycles_total != null && s.cycles_total > 0 ? s.cycles_total.toLocaleString("pt-BR") : "—"}
        </p>
        <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">Ciclos totais</p>
      </div>
      <div className="rounded-xl px-5 py-5 bg-[#0F172A] border border-[#1E293B] text-center backdrop-blur-sm">
        {s?.top_asset ? (
          <>
            <p className="text-lg sm:text-xl font-semibold text-[#22C55E]">{s.top_asset.label}</p>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
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
  const { user, loading: authLoading } = useAuth();
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
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: "linear-gradient(165deg, #060B17 0%, #0B1224 100%)",
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

      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#1E293B]/80 shrink-0 bg-[#0B1224]/70 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#2563EB]/20">
            <span className="text-white font-bold text-sm">AA</span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#E5E7EB]">ARAGON ANALYTICS</h1>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link
              href="/probabilisticas"
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors"
            >
              Ir ao painel
            </Link>
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
        <section className="px-4 sm:px-6 py-20 sm:py-24 text-center max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#E5E7EB] tracking-tight mb-5">
            Descubra quais ativos realmente funcionam
          </h2>
          <p className="text-[#94A3B8] text-lg sm:text-xl mb-10">
            Ranking probabilístico baseado em ciclos reais de mercado.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={handleAcessarAragon}
              className="min-w-[240px] px-8 py-4 rounded-xl text-sm font-semibold text-white transition-all bg-gradient-to-r from-[#4F46E5] to-[#2563EB] shadow-[0_0_28px_rgba(79,70,229,0.35)] hover:brightness-110 hover:shadow-[0_0_36px_rgba(37,99,235,0.45)]"
            >
              Acessar Aragon
            </button>
            <a
              href="#planos"
              className="min-w-[200px] px-8 py-4 rounded-xl text-sm font-semibold border border-[#3B82F6]/60 text-[#E5E7EB] hover:bg-[#1E293B]/60 transition-colors text-center"
            >
              Ver Planos
            </a>
          </div>
          <div className="mt-8 mx-auto max-w-2xl rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-3 text-left">
            <p className="text-sm text-[#D1D5DB]">
              Regra recomendada: use no ARAGON o mesmo email da sua conta na corretora Bullex.
            </p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Ainda não tem conta na Bullex?{" "}
              <a
                href={BULLEX_REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3B82F6] hover:underline font-medium"
              >
                Criar conta na Bullex
              </a>
            </p>
          </div>
        </section>

        {/* Prova / Trust */}
        <section className="px-4 sm:px-6 py-10 sm:py-12 border-t border-[#1E293B]/80">
          <div className="max-w-4xl mx-auto rounded-2xl border border-[#2563EB]/35 shadow-[0_0_30px_rgba(37,99,235,0.16)] p-4 sm:p-6 bg-[#0B1224]/30">
            <TrustCards summary={summary} />
          </div>
        </section>

        {/* Como funciona */}
        <section className="px-4 sm:px-6 py-14 sm:py-20 border-t border-[#1E293B]/80">
          <h3 className="text-xl sm:text-2xl font-semibold text-[#E5E7EB] text-center mb-12">Como funciona</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <div className="rounded-2xl p-8 bg-[#0F172A] border border-[#1E293B] text-center backdrop-blur-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#2563EB]/25 flex items-center justify-center mx-auto mb-6">
                <span className="text-[#60A5FA] font-bold text-2xl">1</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Escolha estratégia e timeframe</h4>
              <p className="text-sm text-[#94A3B8]">Selecione MHI, 3 Mosqueteiros ou outra estratégia e a janela (2h, 4h, 24h).</p>
            </div>
            <div className="rounded-2xl p-8 bg-[#0F172A] border border-[#1E293B] text-center backdrop-blur-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#2563EB]/25 flex items-center justify-center mx-auto mb-6">
                <span className="text-[#60A5FA] font-bold text-2xl">2</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Catalogamos histórico e ciclos</h4>
              <p className="text-sm text-[#94A3B8]">O motor processa candles e classifica cada ciclo (P, G1, H) por ativo.</p>
            </div>
            <div className="rounded-2xl p-8 bg-[#0F172A] border border-[#1E293B] text-center backdrop-blur-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#2563EB]/25 flex items-center justify-center mx-auto mb-6">
                <span className="text-[#60A5FA] font-bold text-2xl">3</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Ranking e consistência por ativo</h4>
              <p className="text-sm text-[#94A3B8]">Você vê os ativos mais assertivos e pode filtrar por min ciclos e Top N.</p>
            </div>
          </div>
        </section>

        {/* Por que usar */}
        <section className="px-4 sm:px-6 py-12 sm:py-14 border-t border-[#1E293B]/80">
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#0F172A] border border-[#1E293B] p-6 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-semibold text-[#E5E7EB] mb-5">Por que usar o Aragon?</h3>
            <ul className="space-y-3 text-[#94A3B8] text-sm sm:text-base">
              <li className="flex items-start gap-2"><span className="text-[#60A5FA]">•</span>Ranking baseado em dados reais</li>
              <li className="flex items-start gap-2"><span className="text-[#60A5FA]">•</span>Identificação de ativos com maior probabilidade</li>
              <li className="flex items-start gap-2"><span className="text-[#60A5FA]">•</span>Interface simples e objetiva</li>
            </ul>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="px-4 sm:px-6 py-12 sm:py-16 border-t border-[#1E293B]/80 scroll-mt-6">
          <h3 className="text-xl sm:text-2xl font-semibold text-[#E5E7EB] text-center mb-10">Planos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* GRÁTIS */}
            <div className="rounded-2xl p-6 bg-[#0F172A] border border-[#1E293B] flex flex-col backdrop-blur-sm">
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
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all bg-gradient-to-r from-[#4F46E5] to-[#2563EB] shadow-[0_10px_28px_rgba(37,99,235,0.38)] hover:scale-[1.02] hover:shadow-[0_14px_34px_rgba(37,99,235,0.48)]"
                >
                  Assinar Avançado
                </button>
              ) : (
                <Link
                  href={planQuery("advanced")}
                  className="block w-full py-3 rounded-xl text-sm font-semibold text-center text-white transition-all bg-gradient-to-r from-[#4F46E5] to-[#2563EB] shadow-[0_10px_28px_rgba(37,99,235,0.38)] hover:scale-[1.02] hover:shadow-[0_14px_34px_rgba(37,99,235,0.48)]"
                >
                  Assinar Avançado
                </Link>
              )}
            </div>

            {/* PRO+ */}
            <div className="rounded-2xl p-6 bg-[#0F172A] border border-[#1E293B] flex flex-col backdrop-blur-sm">
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
        <footer className="px-4 sm:px-6 py-8 border-t border-[#1E293B]/80 text-center text-sm text-[#94A3B8]">
          <p>ARAGON ANALYTICS</p>
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
