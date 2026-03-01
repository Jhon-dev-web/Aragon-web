"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { billingCheckout, getAuthToken, fetchPublicSummary, type PublicSummary } from "./api";
import { useAuth } from "./context/AuthContext";

function ToastInfo({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-[#1F2937] border border-[#374151] text-[#E5E7EB] text-sm shadow-xl flex items-center gap-3">
      <span>{message}</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
      </div>
    );
  }
  const s = summary ?? null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="rounded-2xl px-6 py-7 bg-[#0F172A] border border-[#2563EB]/35 text-center backdrop-blur-sm shadow-[0_0_26px_rgba(37,99,235,0.12)] min-h-[150px] flex flex-col justify-center">
        <p className="text-2xl sm:text-3xl font-bold text-[#E5E7EB] tabular-nums">
          {s?.assets_evaluated ?? "—"}
        </p>
        <p className="text-sm text-[#94A3B8] mt-2">Ativos avaliados</p>
      </div>
      <div className="rounded-2xl px-6 py-7 bg-[#0F172A] border border-[#2563EB]/35 text-center backdrop-blur-sm shadow-[0_0_26px_rgba(37,99,235,0.12)] min-h-[150px] flex flex-col justify-center">
        <p className="text-2xl sm:text-3xl font-bold text-[#E5E7EB] tabular-nums">
          {s?.cycles_total != null && s.cycles_total > 0 ? s.cycles_total.toLocaleString("pt-BR") : "—"}
        </p>
        <p className="text-sm text-[#94A3B8] mt-2">Ciclos catalogados</p>
      </div>
      <div className="rounded-2xl px-6 py-7 bg-[#0F172A] border border-[#2563EB]/35 text-center backdrop-blur-sm shadow-[0_0_26px_rgba(37,99,235,0.12)] min-h-[150px] flex flex-col justify-center">
        {s?.top_asset ? (
          <>
            <p className="text-lg sm:text-xl font-semibold text-[#22C55E]">{s.top_asset.label}</p>
            <p className="text-sm text-[#94A3B8] mt-2">
              {s.top_asset.win_rate_pct}% · {s.top_asset.cycles} ciclos
            </p>
            <p className="text-xs text-[#6B7280] mt-1">Top ativo</p>
          </>
        ) : (
          <>
            <p className="text-xl font-semibold text-[#6B7280]">—</p>
            <p className="text-sm text-[#9CA3AF] mt-1">Top ativo</p>
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
  const [toastMessage, setToastMessage] = useState("Recurso em breve.");
  const [checkoutPlanLoading, setCheckoutPlanLoading] = useState<"advanced" | "pro_plus" | null>(null);
  const [summary, setSummary] = useState<PublicSummary | null | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const toast = params.get("toast");
    if (toast === "recurso_em_breve") {
      setToastMessage("Recurso em breve.");
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

  const handlePlanCta = async (plan: "free" | "advanced" | "pro_plus") => {
    const token = getAuthToken();
    if (!token) {
      router.push(planQuery(plan));
      return;
    }
    if (plan === "free") {
      router.push("/probabilisticas");
      return;
    }
    try {
      setCheckoutPlanLoading(plan);
      const checkout = await billingCheckout(plan);
      if (!checkout.init_point) {
        throw new Error("Checkout sem URL de redirecionamento");
      }
      window.location.href = checkout.init_point;
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Falha ao iniciar pagamento.");
      setShowToast(true);
    } finally {
      setCheckoutPlanLoading(null);
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

      {showToast && <ToastInfo message={toastMessage} onDismiss={() => setShowToast(false)} />}

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
        {/* Hero premium com preview do sistema */}
        <section className="px-4 sm:px-6 py-16 sm:py-24 lg:py-28">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#E5E7EB] tracking-tight leading-tight">
                Descubra quais ativos realmente funcionam
              </h2>
              <p className="text-[#94A3B8] text-lg sm:text-xl mt-5">
                Ranking probabilístico baseado em ciclos reais de mercado, para você decidir com dados e não com achismo.
              </p>
              <ul className="mt-7 space-y-3 text-[#CBD5E1] text-sm sm:text-base">
                <li className="flex items-start gap-2"><span className="text-[#60A5FA]">•</span>Leitura objetiva dos ativos com melhor desempenho</li>
                <li className="flex items-start gap-2"><span className="text-[#60A5FA]">•</span>Mais consistência na escolha das operações</li>
                <li className="flex items-start gap-2"><span className="text-[#60A5FA]">•</span>Interface direta para agir rápido no mercado</li>
              </ul>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={handleAcessarAragon}
                  className="min-w-[250px] px-8 py-4 rounded-xl text-sm font-semibold text-white transition-all bg-gradient-to-r from-[#4F46E5] to-[#2563EB] shadow-[0_0_32px_rgba(79,70,229,0.35)] hover:brightness-110 hover:shadow-[0_0_42px_rgba(37,99,235,0.5)]"
                >
                  Acessar Aragon
                </button>
                <a
                  href="#planos"
                  className="min-w-[210px] px-8 py-4 rounded-xl text-sm font-semibold border border-[#3B82F6]/60 text-[#E5E7EB] hover:bg-[#1E293B]/60 transition-colors text-center"
                >
                  Ver planos
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2563EB]/35 bg-[#0F172A]/85 p-4 sm:p-5 shadow-[0_0_38px_rgba(37,99,235,0.2)] backdrop-blur-sm">
              <div className="rounded-xl border border-[#1E293B] bg-[#0B1224] p-4 sm:p-5 min-h-[280px] sm:min-h-[340px] flex flex-col">
                <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-4">
                  <span>Preview da plataforma</span>
                  <span className="px-2 py-1 rounded-full bg-[#2563EB]/20 text-[#93C5FD]">Live Ranking</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg bg-[#0F172A] border border-[#1E293B] p-3">
                    <p className="text-xs text-[#94A3B8]">Top ativo</p>
                    <p className="text-sm font-semibold text-[#22C55E] mt-1">{summary?.top_asset?.label ?? "EURUSD-OTC"}</p>
                  </div>
                  <div className="rounded-lg bg-[#0F172A] border border-[#1E293B] p-3">
                    <p className="text-xs text-[#94A3B8]">Win rate</p>
                    <p className="text-sm font-semibold text-[#E5E7EB] mt-1">
                      {summary?.top_asset?.win_rate_pct != null ? `${summary.top_asset.win_rate_pct}%` : "71.8%"}
                    </p>
                  </div>
                </div>
                <div className="flex-1 rounded-lg bg-[#0F172A] border border-[#1E293B] p-4">
                  <div className="space-y-2">
                    <div className="h-2.5 rounded-full bg-[#1E293B] overflow-hidden">
                      <div className="h-full w-[78%] bg-gradient-to-r from-[#4F46E5] to-[#2563EB]" />
                    </div>
                    <div className="h-2.5 rounded-full bg-[#1E293B] overflow-hidden">
                      <div className="h-full w-[65%] bg-gradient-to-r from-[#4F46E5] to-[#2563EB]" />
                    </div>
                    <div className="h-2.5 rounded-full bg-[#1E293B] overflow-hidden">
                      <div className="h-full w-[59%] bg-gradient-to-r from-[#4F46E5] to-[#2563EB]" />
                    </div>
                    <div className="h-2.5 rounded-full bg-[#1E293B] overflow-hidden">
                      <div className="h-full w-[52%] bg-gradient-to-r from-[#4F46E5] to-[#2563EB]" />
                    </div>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-4">Espaço reservado para screenshot real do sistema</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Prova / Trust */}
        <section className="px-4 sm:px-6 py-12 sm:py-16 border-t border-[#1E293B]/80">
          <div className="max-w-6xl mx-auto rounded-2xl border border-[#2563EB]/35 shadow-[0_0_34px_rgba(37,99,235,0.18)] p-5 sm:p-7 bg-[#0B1224]/30">
            <TrustCards summary={summary} />
          </div>
        </section>

        {/* Como funciona */}
        <section className="px-4 sm:px-6 py-16 sm:py-24 border-t border-[#1E293B]/80">
          <h3 className="text-xl sm:text-2xl font-semibold text-[#E5E7EB] text-center mb-14">Como funciona</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <div className="rounded-2xl p-8 sm:p-9 bg-[#0F172A] border border-[#1E293B] text-center backdrop-blur-sm">
              <div className="w-20 h-20 rounded-2xl bg-[#2563EB]/25 flex items-center justify-center mx-auto mb-7">
                <span className="text-[#60A5FA] font-bold text-3xl">1</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Escolha estratégia e timeframe</h4>
              <p className="text-sm text-[#94A3B8]">Selecione MHI, 3 Mosqueteiros ou outra estratégia e a janela (2h, 4h, 24h).</p>
            </div>
            <div className="rounded-2xl p-8 sm:p-9 bg-[#0F172A] border border-[#1E293B] text-center backdrop-blur-sm">
              <div className="w-20 h-20 rounded-2xl bg-[#2563EB]/25 flex items-center justify-center mx-auto mb-7">
                <span className="text-[#60A5FA] font-bold text-3xl">2</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Catalogamos histórico e ciclos</h4>
              <p className="text-sm text-[#94A3B8]">O motor processa candles e classifica cada ciclo (P, G1, H) por ativo.</p>
            </div>
            <div className="rounded-2xl p-8 sm:p-9 bg-[#0F172A] border border-[#1E293B] text-center backdrop-blur-sm">
              <div className="w-20 h-20 rounded-2xl bg-[#2563EB]/25 flex items-center justify-center mx-auto mb-7">
                <span className="text-[#60A5FA] font-bold text-3xl">3</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Ranking e consistência por ativo</h4>
              <p className="text-sm text-[#94A3B8]">Você vê os ativos mais assertivos e pode filtrar por min ciclos e Top N.</p>
            </div>
          </div>
        </section>

        {/* Diferencial */}
        <section className="px-4 sm:px-6 py-14 sm:py-16 border-t border-[#1E293B]/80">
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#0F172A] border border-[#1E293B] p-6 sm:p-8">
            <h3 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] mb-4">Pare de escolher ativos no achismo</h3>
            <p className="text-[#94A3B8] text-sm sm:text-base leading-relaxed">
              O Aragon transforma dados de mercado em um ranking claro de desempenho por ativo. Em vez de operar no escuro,
              você enxerga quais cenários têm maior consistência e direciona suas decisões para o que realmente entrega resultado.
            </p>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="px-4 sm:px-6 py-14 sm:py-18 border-t border-[#1E293B]/80 scroll-mt-6">
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
                  className="w-full py-3 rounded-xl text-sm font-medium bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] transition-all shadow-md shadow-black/20 hover:shadow-lg hover:shadow-black/30"
                >
                  Começar grátis
                </button>
              ) : (
                <Link
                  href={planQuery("free")}
                  className="block w-full py-3 rounded-xl text-sm font-medium text-center bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] transition-all shadow-md shadow-black/20 hover:shadow-lg hover:shadow-black/30"
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
                  disabled={checkoutPlanLoading === "advanced"}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all bg-gradient-to-r from-[#4F46E5] to-[#2563EB] shadow-[0_10px_28px_rgba(37,99,235,0.38)] hover:scale-[1.02] hover:shadow-[0_14px_34px_rgba(37,99,235,0.48)]"
                >
                  {checkoutPlanLoading === "advanced" ? "Redirecionando..." : "Assinar Avançado"}
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
                  disabled={checkoutPlanLoading === "pro_plus"}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-[#7C3AED] hover:bg-[#8B5CF6] text-white transition-all shadow-lg shadow-[#7C3AED]/20 hover:shadow-xl hover:shadow-[#7C3AED]/30"
                >
                  {checkoutPlanLoading === "pro_plus" ? "Redirecionando..." : "Assinar PRO+"}
                </button>
              ) : (
                <Link
                  href={planQuery("pro_plus")}
                  className="block w-full py-3 rounded-xl text-sm font-semibold text-center bg-[#7C3AED] hover:bg-[#8B5CF6] text-white transition-all shadow-lg shadow-[#7C3AED]/20 hover:shadow-xl hover:shadow-[#7C3AED]/30"
                >
                  Assinar PRO+
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="px-4 sm:px-6 py-14 sm:py-16 border-t border-[#1E293B]/80">
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#0F172A] border border-[#1E293B] p-6 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-semibold text-[#E5E7EB] mb-5">O que vem por aí</h3>
            <ul className="space-y-3 text-[#94A3B8] text-sm sm:text-base">
              <li className="flex items-start gap-2"><span className="text-[#60A5FA] mt-0.5">•</span>Alertas inteligentes de mudança de ranking em tempo real</li>
              <li className="flex items-start gap-2"><span className="text-[#60A5FA] mt-0.5">•</span>Comparador avançado entre estratégias e janelas de operação</li>
              <li className="flex items-start gap-2"><span className="text-[#60A5FA] mt-0.5">•</span>Execução assistida com automações e recursos premium no painel</li>
              <li className="flex items-start gap-2"><span className="text-[#60A5FA] mt-0.5">•</span>Histórico pessoal de performance com insights de melhoria</li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 sm:px-6 py-10 border-t border-[#1E293B]/80">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#94A3B8]">
            <p>ARAGON ANALYTICS</p>
            <p className="flex items-center gap-3">
              <a href="#" className="hover:text-[#E5E7EB] transition-colors">Termos</a>
              <span>•</span>
              <a href="#" className="hover:text-[#E5E7EB] transition-colors">Privacidade</a>
              <span>•</span>
              <a href="#" className="hover:text-[#E5E7EB] transition-colors">Contato</a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
