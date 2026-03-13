"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { billingCheckout, fetchPublicSummary, getAuthToken, type PublicSummary } from "./api";
import { useAuth } from "./context/AuthContext";

type CheckoutPlan = "advanced" | "pro_plus";

const strategyItems = ["MHI", "3 Mosqueteiros", "Padrão 23", "Outras estratégias probabilísticas"];

const benefitItems = [
  {
    title: "Catalogação automática",
    description: "Centralize a leitura de estratégias sem depender de planilhas e buscas manuais.",
  },
  {
    title: "Ganho de tempo",
    description: "Chegue mais rápido ao que merece atenção e reduza o tempo gasto analisando ativo por ativo.",
  },
  {
    title: "Análise histórica rápida",
    description: "Veja padrões com base em histórico recente de forma simples e visual.",
  },
  {
    title: "Estratégias organizadas",
    description: "Compare MHI, 3 Mosqueteiros, Padrão 23 e outras abordagens em um só lugar.",
  },
  {
    title: "Interface simples",
    description: "Tela direta, com foco em leitura rápida para quem precisa decidir sem complicação.",
  },
  {
    title: "Mais praticidade para operar",
    description: "Menos tempo no operacional e mais clareza para identificar oportunidades.",
  },
];

const proofItems = [
  {
    eyebrow: "Demonstração do sistema",
    title: "Faça login e visualize a catalogação em segundos",
    caption: "Demonstração real do Aragon entregando os dados logo após o login, reforçando praticidade e rapidez.",
    image: "/media/aragon-catalogando.gif",
  },
  {
    eyebrow: "Método manual",
    title: "Catalogação manual toma tempo e ainda pode terminar em ativo fraco",
    caption: "Enquanto o processo manual consome minutos na tela, o Aragon entrega uma leitura muito mais rápida e organizada.",
    image: "/media/catalogacao-manual.png",
  },
];

const faqItems = [
  {
    question: "O que é o Aragon?",
    answer:
      "O Aragon é um sistema de catalogação estratégica para opções binárias que analisa histórico, organiza padrões e ajuda você a encontrar melhores oportunidades com mais rapidez.",
  },
  {
    question: "Preciso ter experiência?",
    answer:
      "Não. A página e o painel foram pensados para facilitar a leitura mesmo para quem ainda está ganhando prática com catalogação e estratégias probabilísticas.",
  },
  {
    question: "Quais estratégias o sistema analisa?",
    answer:
      "O sistema trabalha com estratégias como MHI, 3 Mosqueteiros, Padrão 23 e outras estratégias probabilísticas organizadas dentro da plataforma.",
  },
  {
    question: "O acesso vitalício inclui o robô futuro?",
    answer:
      "Sim. O plano vitalício já destaca o benefício futuro de acesso ao robô quando esse recurso for liberado.",
  },
  {
    question: "Como recebo acesso após a compra?",
    answer:
      "Depois da confirmação do pagamento, o acesso é liberado no fluxo da plataforma. Se você já estiver logado, segue direto para a etapa de pagamento.",
  },
];

function ToastInfo({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[#374151] bg-[#111827] px-4 py-3 text-sm text-[#E5E7EB] shadow-2xl">
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-[#9CA3AF] transition-colors hover:bg-white/10"
        aria-label="Fechar"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="inline-flex rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl">{title}</h2>
      <p className="mt-4 text-sm leading-6 text-[#94A3B8] sm:text-base">{description}</p>
    </div>
  );
}

function SkeletonMetric() {
  return <div className="h-28 animate-pulse rounded-2xl border border-[#1E293B] bg-[#0F172A]" />;
}

function SocialProofCards({ summary }: { summary: PublicSummary | null | undefined }) {
  if (summary === undefined) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A]/90 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[#64748B]">Base analisada</p>
        <p className="mt-4 text-3xl font-bold text-[#F8FAFC]">{summary?.assets_evaluated ?? "Vários"}</p>
        <p className="mt-2 text-sm text-[#94A3B8]">Ativos avaliados para leitura probabilística e comparação.</p>
      </div>
      <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A]/90 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[#64748B]">Histórico processado</p>
        <p className="mt-4 text-3xl font-bold text-[#F8FAFC]">
          {summary?.cycles_total ? summary.cycles_total.toLocaleString("pt-BR") : "Em análise"}
        </p>
        <p className="mt-2 text-sm text-[#94A3B8]">Ciclos catalogados para poupar análise manual no operacional.</p>
      </div>
      <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A]/90 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[#64748B]">Leitura em destaque</p>
        <p className="mt-4 text-2xl font-bold text-[#22C55E]">{summary?.top_asset?.label ?? "Top ranking"}</p>
        <p className="mt-2 text-sm text-[#94A3B8]">
          {summary?.top_asset
            ? `${summary.top_asset.win_rate_pct}% de assertividade em ${summary.top_asset.cycles} ciclos.`
            : "Visualize rapidamente os cenários que merecem sua atenção."}
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Recurso em breve.");
  const [checkoutPlanLoading, setCheckoutPlanLoading] = useState<CheckoutPlan | null>(null);
  const [showCpfModal, setShowCpfModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<CheckoutPlan | null>(null);
  const [cpfInput, setCpfInput] = useState("");
  const [summary, setSummary] = useState<PublicSummary | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    fetchPublicSummary()
      .then((data) => {
        if (!cancelled) setSummary(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isLoggedIn = !!user || (!authLoading && !!getAuthToken());
  const planQuery = (plan: CheckoutPlan) => `/login?plan=${plan}`;

  const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 11);

  const formatCpf = (value: string) => {
    const digits = onlyDigits(value);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const handleAcessarAragon = () => {
    router.push(getAuthToken() ? "/probabilisticas" : "/login");
  };

  const handleConfirmCpfCheckout = async () => {
    if (!pendingPlan) return;

    const digits = onlyDigits(cpfInput);
    if (digits.length !== 11) {
      setToastMessage("Informe seu CPF com 11 dígitos para gerar a cobrança.");
      setShowToast(true);
      return;
    }

    try {
      setCheckoutPlanLoading(pendingPlan);
      const checkout = await billingCheckout(pendingPlan, digits, "UNDEFINED");
      const url = checkout.checkout_url ?? checkout.init_point;
      if (!url) throw new Error("Checkout sem URL de redirecionamento");
      setShowCpfModal(false);
      setPendingPlan(null);
      window.location.href = url;
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Falha ao iniciar pagamento.");
      setShowToast(true);
    } finally {
      setCheckoutPlanLoading(null);
    }
  };

  const handlePlanCta = (plan: CheckoutPlan) => {
    if (!getAuthToken()) {
      router.push(planQuery(plan));
      return;
    }
    setPendingPlan(plan);
    setShowCpfModal(true);
  };

  const renderPlanButton = ({
    plan,
    label,
    microcopy,
    variant,
    fullWidth = false,
  }: {
    plan: CheckoutPlan;
    label: string;
    microcopy: string;
    variant: "primary" | "secondary";
    fullWidth?: boolean;
  }) => {
    const loading = checkoutPlanLoading === plan;
    const className =
      variant === "primary"
        ? "inline-flex min-h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#2563EB] px-6 py-4 text-center text-sm font-semibold text-white shadow-[0_14px_45px_rgba(124,58,237,0.38)] transition-all hover:-translate-y-0.5 hover:brightness-110"
        : "inline-flex min-h-14 items-center justify-center rounded-2xl border border-[#3B82F6]/40 bg-[#0F172A] px-6 py-4 text-center text-sm font-semibold text-[#E5E7EB] shadow-[0_10px_30px_rgba(37,99,235,0.12)] transition-all hover:-translate-y-0.5 hover:border-[#60A5FA] hover:bg-[#111C33]";

    const wrapperClass = fullWidth ? "w-full" : "w-full sm:w-auto";

    return (
      <div className={wrapperClass}>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => handlePlanCta(plan)}
            disabled={loading}
            className={`${className} ${fullWidth ? "w-full" : "w-full sm:w-auto"} disabled:cursor-not-allowed disabled:opacity-70`}
          >
            {loading ? "Redirecionando..." : label}
          </button>
        ) : (
          <Link href={planQuery(plan)} className={`${className} ${fullWidth ? "w-full" : "w-full sm:w-auto"}`}>
            {label}
          </Link>
        )}
        <p className="mt-2 text-center text-xs text-[#94A3B8]">{microcopy}</p>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden text-[#E5E7EB]">
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at top, rgba(59,130,246,0.16), transparent 28%), radial-gradient(circle at 80% 20%, rgba(124,58,237,0.16), transparent 22%), linear-gradient(180deg, #050816 0%, #09101E 45%, #050816 100%)",
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)',
          backgroundSize: "70px 70px",
        }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[8%] top-24 h-48 w-48 rounded-full bg-[#2563EB]/10 blur-3xl" />
        <div className="absolute bottom-20 right-[6%] h-56 w-56 rounded-full bg-[#7C3AED]/10 blur-3xl" />
      </div>

      {showToast && <ToastInfo message={toastMessage} onDismiss={() => setShowToast(false)} />}

      {showCpfModal && pendingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-[#1F2937] bg-[#0B1220] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#F8FAFC]">Identificação para pagamento</h3>
            <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
              Informe seu CPF para gerar a cobrança com PIX ou cartão sem precisar preencher novamente na próxima etapa.
            </p>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#64748B]">CPF</span>
              <input
                type="text"
                value={formatCpf(cpfInput)}
                onChange={(e) => setCpfInput(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full rounded-2xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-sm text-[#E5E7EB] outline-none transition-colors focus:border-[#3B82F6] focus:ring-2 focus:ring-[#2563EB]/20"
              />
            </label>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCpfModal(false);
                  setPendingPlan(null);
                }}
                className="flex-1 rounded-2xl border border-[#374151] bg-[#111827] px-4 py-3 text-sm font-medium text-[#E5E7EB] transition-colors hover:bg-[#1F2937]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCpfCheckout}
                disabled={checkoutPlanLoading !== null}
                className="flex-1 rounded-2xl bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3B82F6] disabled:cursor-not-allowed disabled:bg-[#1F2937] disabled:text-[#6B7280]"
              >
                {checkoutPlanLoading ? "Abrindo..." : "Continuar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-[#1E293B]/80 bg-[#08101D]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-sm font-bold text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
              AR
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#64748B]">Sistema estratégico</p>
              <h1 className="text-base font-semibold text-[#F8FAFC] sm:text-lg">Aragon</h1>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <a
              href="#planos"
              className="hidden rounded-xl border border-[#334155] px-4 py-2 text-sm font-medium text-[#CBD5E1] transition-colors hover:border-[#60A5FA] hover:text-white sm:inline-flex"
            >
              Ver planos
            </a>
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleAcessarAragon}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3B82F6]"
              >
                Ir ao painel
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2 text-sm font-medium text-[#E2E8F0] transition-colors hover:border-[#475569] hover:bg-[#111827]"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:pb-24">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
            <div>
              <span className="inline-flex rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#93C5FD]">
                Leitura pronta em segundos
              </span>

              <div className="mt-5 flex flex-wrap gap-2">
                {strategyItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#1E293B] bg-[#0F172A]/90 px-3 py-2 text-xs font-medium text-[#CBD5E1]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <h2 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-[#F8FAFC] sm:text-5xl lg:text-6xl">
                Encontre estratégias probabilísticas sem perder tempo na catalogação manual.
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[#94A3B8] sm:text-lg">
                O Aragon organiza dados históricos, reúne estratégias como MHI, 3 Mosqueteiros e Padrão 23 e entrega
                uma leitura prática para você decidir mais rápido.
              </p>

              <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#1E293B] bg-[#0B1220]/90 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Plano mensal</p>
                  <p className="mt-2 text-2xl font-bold text-[#F8FAFC]">R$47,90</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">Comece hoje.</p>
                </div>
                <div className="rounded-2xl border border-[#7C3AED]/40 bg-[#140F25]/90 p-4 shadow-[0_0_30px_rgba(124,58,237,0.18)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#C4B5FD]">Plano vitalício</p>
                  <p className="mt-2 text-2xl font-bold text-[#F8FAFC]">R$199</p>
                  <p className="mt-1 text-xs text-[#C4B5FD]">Pagamento único.</p>
                </div>
                <div className="rounded-2xl border border-[#22C55E]/30 bg-[#08150E]/90 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#86EFAC]">Benefício futuro</p>
                  <p className="mt-2 text-sm font-semibold text-[#F8FAFC]">Robô incluído</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">No vitalício, quando for liberado.</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:max-w-xl sm:grid-cols-2">
                {renderPlanButton({
                  plan: "advanced",
                  label: "Assinar agora",
                  microcopy: "Acesso rápido e liberação após confirmação.",
                  variant: "secondary",
                })}
                {renderPlanButton({
                  plan: "pro_plus",
                  label: "Quero acesso vitalício",
                  microcopy: "Plano vitalício com benefício futuro do robô.",
                  variant: "primary",
                })}
              </div>

              <div className="mt-6 grid gap-3 text-sm text-[#CBD5E1] sm:max-w-2xl sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-[#1E293B] bg-[#0B1220]/80 px-4 py-3">
                  <span className="mt-0.5 text-[#60A5FA]">•</span>
                  <p>Entenda o produto rápido, mesmo sem conhecer catalogação.</p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-[#1E293B] bg-[#0B1220]/80 px-4 py-3">
                  <span className="mt-0.5 text-[#60A5FA]">•</span>
                  <p>Veja quais estratégias e cenários merecem sua atenção.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-4 top-10 hidden h-28 w-28 rounded-full bg-[#2563EB]/20 blur-3xl sm:block" />
              <div className="absolute -right-4 bottom-10 hidden h-32 w-32 rounded-full bg-[#7C3AED]/20 blur-3xl sm:block" />

              <div className="relative overflow-hidden rounded-[28px] border border-[#1E293B] bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(9,16,30,0.92))] p-4 shadow-[0_20px_70px_rgba(2,6,23,0.65)] sm:p-6">
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#64748B]">Preview da plataforma</p>
                    <p className="mt-1 text-sm font-semibold text-[#F8FAFC]">Veja o Aragon em ação</p>
                  </div>
                  <span className="rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 px-3 py-1 text-[11px] font-semibold text-[#86EFAC]">
                    Demonstração real
                  </span>
                </div>

                <div className="mt-5 grid items-start gap-4 sm:grid-cols-[1.3fr_0.7fr]">
                  <div className="self-start rounded-3xl border border-[#334155] bg-[linear-gradient(180deg,rgba(17,24,39,0.95),rgba(15,23,42,0.9))] p-5 shadow-[0_20px_40px_rgba(2,6,23,0.35)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Demonstração principal</p>
                        <p className="mt-1 text-base font-semibold text-[#F8FAFC]">Login, leitura pronta e decisão mais rápida</p>
                      </div>
                      <span className="rounded-full bg-[#1D4ED8]/20 px-3 py-1 text-[11px] font-medium text-[#93C5FD]">
                        MHI | 3 Mosqueteiros | Padrão 23
                      </span>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-2xl border border-[#334155] bg-[#020617]/70">
                      <div className="relative aspect-[16/9] w-full bg-[#020617]">
                        <img
                          src="/media/aragon-catalogando.gif"
                          alt="Demonstração do Aragon catalogando e entregando os dados após o login"
                          className="h-full w-full object-cover object-top"
                        />
                        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-[#020617]/90 via-[#020617]/40 to-transparent px-4 py-3">
                          <span className="rounded-full border border-[#2563EB]/30 bg-[#08101D]/90 px-3 py-1 text-[11px] font-semibold text-[#93C5FD]">
                            Dashboard real
                          </span>
                          <span className="rounded-full border border-[#22C55E]/30 bg-[#08150E]/90 px-3 py-1 text-[11px] font-semibold text-[#86EFAC]">
                            Leitura imediata
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-[#1E293B] bg-[#08101D]/95 px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-[#1E293B] bg-[#0B1220] px-3 py-1 text-[11px] font-medium text-[#CBD5E1]">
                            Sem catalogar na mão
                          </span>
                          <span className="rounded-full border border-[#1E293B] bg-[#0B1220] px-3 py-1 text-[11px] font-medium text-[#CBD5E1]">
                            Menos tempo no operacional
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-[#F8FAFC]">Só fazer login e o sistema já entrega os dados</p>
                        <p className="mt-1 text-sm leading-6 text-[#94A3B8]">Entre, visualize os dados e foque no que importa.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#1E293B] bg-[#0B1220]/90 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">O que o usuário vê</p>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-[#1F2937] bg-[#111827] p-3">
                          <p className="text-xs text-[#94A3B8]">Estratégia em foco</p>
                          <p className="mt-1 font-semibold text-[#F8FAFC]">MHI</p>
                        </div>
                        <div className="rounded-2xl border border-[#1F2937] bg-[#111827] p-3">
                          <p className="text-xs text-[#94A3B8]">Leitura rápida</p>
                          <p className="mt-1 font-semibold text-[#22C55E]">
                            {summary?.top_asset?.win_rate_pct ? `${summary.top_asset.win_rate_pct}%` : "Histórico organizado"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-[#1F2937] bg-[#111827] p-3">
                          <p className="text-xs text-[#94A3B8]">Objetivo</p>
                          <p className="mt-1 font-semibold text-[#F8FAFC]">Decidir com mais clareza</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#7C3AED]/35 bg-[#140F25]/80 p-4 shadow-[0_0_30px_rgba(124,58,237,0.15)]">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#C4B5FD]">Oferta em destaque</p>
                      <p className="mt-2 text-lg font-bold text-white">Vitalício R$199</p>
                      <p className="mt-2 text-sm leading-6 text-[#DDD6FE]">
                        Inclui acesso ao robô futuramente quando for liberado.
                      </p>
                      <a
                        href="#planos"
                        className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#E5E7EB]"
                      >
                        Comparar planos
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#1E293B]/80 px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SocialProofCards summary={summary} />
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Como funciona"
              title="Como o Aragon acelera sua análise"
              description="Uma rotina mais simples para encontrar oportunidades com mais clareza."
            />

            <div className="mt-12 grid gap-5 lg:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "O sistema analisa dados históricos",
                  description: "Você começa com uma base já organizada, sem partir do zero.",
                },
                {
                  step: "02",
                  title: "Encontra padrões e estratégias probabilísticas",
                  description: "O foco é mostrar cenários que fazem sentido para sua leitura.",
                },
                {
                  step: "03",
                  title: "Organiza as melhores oportunidades",
                  description: "Tudo aparece de forma visual para facilitar comparação e decisão.",
                },
                {
                  step: "04",
                  title: "Economiza tempo no operacional",
                  description: "Menos tempo filtrando manualmente e mais praticidade para operar.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-3xl border border-[#1E293B] bg-[#0F172A]/80 p-6 shadow-[0_10px_30px_rgba(2,6,23,0.35)]"
                >
                  <span className="inline-flex rounded-2xl bg-[#2563EB]/15 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[#93C5FD]">
                    {item.step}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-[#F8FAFC]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#94A3B8]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#1E293B]/80 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Comparativo"
              title="O método manual demora e ainda pode levar você para um ativo fraco"
              description="Enquanto o processo manual consome tempo e atenção, o Aragon encurta o caminho até a leitura."
            />

            <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="overflow-hidden rounded-[28px] border border-[#7F1D1D]/40 bg-[linear-gradient(180deg,rgba(34,8,8,0.92),rgba(12,10,18,0.96))] shadow-[0_20px_60px_rgba(127,29,29,0.18)]">
                <div className="border-b border-[#7F1D1D]/30 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#FCA5A5]">Manual</p>
                  <h3 className="mt-2 text-xl font-bold text-white">Mais tempo gasto, mais esforço e mais incerteza</h3>
                </div>

                <div className="p-5">
                  <div className="overflow-hidden rounded-3xl border border-[#7F1D1D]/30">
                    <img
                      src="/media/catalogacao-manual.png"
                      alt="Exemplo de catalogação manual em gráfico, exigindo tempo e esforço visual"
                      className="h-full w-full object-cover object-center"
                    />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#7F1D1D]/30 bg-[#1F1113]/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#FCA5A5]">Tempo</p>
                      <p className="mt-2 text-sm font-semibold text-white">Cerca de 10 minutos</p>
                    </div>
                    <div className="rounded-2xl border border-[#7F1D1D]/30 bg-[#1F1113]/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#FCA5A5]">Operacional</p>
                      <p className="mt-2 text-sm font-semibold text-white">Leitura cansativa e manual</p>
                    </div>
                    <div className="rounded-2xl border border-[#7F1D1D]/30 bg-[#1F1113]/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#FCA5A5]">Risco</p>
                      <p className="mt-2 text-sm font-semibold text-white">Ativo pode seguir fraco</p>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-7 text-[#FECACA]">
                    Fazer isso manualmente consome tempo, exige atenção total na tela e mesmo assim pode terminar em um
                    ativo com baixa assertividade.
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#1E293B] bg-[linear-gradient(180deg,rgba(9,16,30,0.96),rgba(15,23,42,0.92))] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)] sm:p-8">
                <p className="text-xs uppercase tracking-[0.22em] text-[#93C5FD]">Com Aragon</p>
                <h3 className="mt-3 text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl">
                  Você encurta esse processo e recebe a leitura muito mais rápido
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#94A3B8] sm:text-base">
                  Em vez de perder tempo catalogando na mão, o Aragon organiza os dados e ajuda você a chegar mais rápido
                  no que realmente merece atenção.
                </p>

                <div className="mt-6 space-y-3">
                  {[
                    "Menos tempo preso em análise manual",
                    "Mais clareza para filtrar oportunidades",
                    "Leitura prática logo após entrar no sistema",
                    "Mais organização para operar com método",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-[#1E293B] bg-[#0B1220]/80 px-4 py-3">
                      <span className="mt-0.5 text-[#22C55E]">✓</span>
                      <p className="text-sm text-[#E2E8F0]">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-3xl border border-[#2563EB]/30 bg-[#0B1220]/90 p-5">
                  <p className="text-sm font-semibold text-[#F8FAFC]">
                    O objetivo não é prometer mágica. É tirar peso do operacional e acelerar sua análise.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
                    Menos esforço manual, mais organização e mais rapidez para encontrar o que realmente vale sua atenção.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[#1E293B]/80 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Benefícios"
              title="Mais praticidade e menos tempo perdido no operacional"
              description="Tudo pensado para você analisar melhor e operar com mais clareza."
            />

            <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {benefitItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-[#1E293B] bg-[#0B1220]/85 p-6 shadow-[0_8px_28px_rgba(2,6,23,0.28)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D4ED8]/30 to-[#7C3AED]/30 text-lg text-[#BFDBFE]">
                    +
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[#F8FAFC]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#94A3B8]">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <div className="w-full max-w-3xl rounded-[28px] border border-[#1E293B] bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(8,15,30,0.95))] p-6 text-center shadow-[0_20px_60px_rgba(2,6,23,0.45)] sm:p-8">
                <p className="text-xs uppercase tracking-[0.22em] text-[#64748B]">Escolha seu acesso</p>
                <h3 className="mt-3 text-2xl font-bold text-[#F8FAFC] sm:text-3xl">
                  Entre agora no plano mensal ou garanta o vitalício com benefício futuro.
                </h3>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#94A3B8] sm:text-base">
                  Comece no mensal ou aproveite o vitalício para garantir acesso permanente e o benefício futuro do robô.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {renderPlanButton({
                    plan: "advanced",
                    label: "Assinar agora",
                    microcopy: "Acesso rápido com liberação após confirmação.",
                    variant: "secondary",
                    fullWidth: true,
                  })}
                  {renderPlanButton({
                    plan: "pro_plus",
                    label: "Quero acesso vitalício",
                    microcopy: "Plano vitalício com benefício futuro incluso.",
                    variant: "primary",
                    fullWidth: true,
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[#1E293B]/80 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Veja na prática"
              title="Entenda em segundos o que o Aragon entrega"
              description="Veja a diferença entre depender do método manual e usar uma leitura organizada dentro da plataforma."
            />

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              {proofItems.map((item) => (
                <div
                  key={item.title}
                  className="overflow-hidden rounded-[28px] border border-[#1E293B] bg-[#0B1220]/85 shadow-[0_20px_50px_rgba(2,6,23,0.4)]"
                >
                  <div className="border-b border-[#1E293B] p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#64748B]">{item.eyebrow}</p>
                    <h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">{item.title}</h3>
                  </div>
                  <div className="p-5">
                    {item.image ? (
                      <div className="overflow-hidden rounded-3xl border border-[#334155] bg-[linear-gradient(180deg,rgba(2,6,23,0.8),rgba(15,23,42,0.75))]">
                        <div className="relative aspect-[16/10] w-full">
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover object-top" />
                        </div>
                        <div className="border-t border-[#1E293B] bg-[#08101D]/95 px-4 py-4">
                          <p className="text-sm leading-6 text-[#94A3B8]">{item.caption}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid min-h-[250px] place-items-center rounded-3xl border border-dashed border-[#334155] bg-[linear-gradient(180deg,rgba(2,6,23,0.8),rgba(15,23,42,0.75))] px-6 text-center">
                        <div>
                          <p className="text-sm font-semibold text-[#F8FAFC]">Visual da plataforma</p>
                          <p className="mt-2 text-sm leading-6 text-[#94A3B8]">{item.caption}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#1E293B]/80 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Estratégias"
              title="Estratégias organizadas em um só lugar"
              description="Compare estratégias conhecidas do mercado com muito mais praticidade."
            />

            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  name: "MHI",
                  text: "Leitura organizada para quem busca velocidade na identificação de oportunidades.",
                },
                {
                  name: "3 Mosqueteiros",
                  text: "Estratégia apresentada com leitura visual para facilitar a comparação no histórico.",
                },
                {
                  name: "Padrão 23",
                  text: "Mais uma abordagem estratégica centralizada dentro do mesmo ambiente.",
                },
                {
                  name: "Outras probabilísticas",
                  text: "Tenha outras leituras estratégicas organizadas dentro de uma rotina mais simples e objetiva.",
                },
              ].map((item) => (
                <div
                  key={item.name}
                  className="rounded-3xl border border-[#1E293B] bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(11,18,32,0.92))] p-6"
                >
                  <div className="inline-flex rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-3 py-1 text-xs font-semibold text-[#93C5FD]">
                    Estratégia
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-[#F8FAFC]">{item.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#94A3B8]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="scroll-mt-24 border-t border-[#1E293B]/80 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Planos"
              title="Escolha como quer entrar no Aragon"
              description="Escolha o plano ideal para você e comece a usar a plataforma após a confirmação."
            />

            <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[28px] border border-[#1E293B] bg-[#0B1220]/90 p-6 sm:p-8">
                <p className="text-xs uppercase tracking-[0.22em] text-[#64748B]">Plano mensal</p>
                <h3 className="mt-3 text-3xl font-bold text-[#F8FAFC]">R$47,90</h3>
                <p className="mt-2 text-sm text-[#94A3B8]">Assinatura para começar rápido e acessar a plataforma agora.</p>

                <ul className="mt-6 space-y-3 text-sm text-[#CBD5E1]">
                  <li className="flex gap-3"><span className="text-[#22C55E]">✓</span><span>Acesso ao sistema de catalogação</span></li>
                  <li className="flex gap-3"><span className="text-[#22C55E]">✓</span><span>Estratégias probabilísticas organizadas</span></li>
                  <li className="flex gap-3"><span className="text-[#22C55E]">✓</span><span>Análise histórica prática para leitura rápida</span></li>
                  <li className="flex gap-3"><span className="text-[#22C55E]">✓</span><span>Ideal para quem quer testar e entrar hoje</span></li>
                </ul>

                <div className="mt-8">
                  {renderPlanButton({
                    plan: "advanced",
                    label: "Assinar agora",
                    microcopy: "Acesso rápido e liberação após confirmação.",
                    variant: "secondary",
                    fullWidth: true,
                  })}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[32px] border border-[#7C3AED]/40 bg-[linear-gradient(180deg,rgba(31,14,58,0.95),rgba(9,16,30,0.96))] p-6 shadow-[0_25px_70px_rgba(124,58,237,0.28)] sm:p-8">
                <div className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#111827]">
                  Mais escolhido
                </div>

                <p className="text-xs uppercase tracking-[0.22em] text-[#C4B5FD]">Plano vitalício</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-4xl font-black text-white">R$199</h3>
                    <p className="mt-2 text-sm text-[#DDD6FE]">Pagamento único com o melhor custo de entrada da oferta.</p>
                  </div>
                  <div className="rounded-2xl border border-[#22C55E]/30 bg-[#08150E]/80 px-4 py-3 text-sm text-[#D1FAE5]">
                    Inclui acesso ao robô futuramente
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#C4B5FD]">Inclui</p>
                    <p className="mt-2 text-sm leading-6 text-white">Acesso vitalício ao sistema sem renovação mensal.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#C4B5FD]">Diferencial</p>
                    <p className="mt-2 text-sm leading-6 text-white">
                      Melhor oportunidade para quem já quer entrar com visão de longo prazo.
                    </p>
                  </div>
                </div>

                <ul className="mt-8 space-y-3 text-sm text-[#F5F3FF]">
                  <li className="flex gap-3"><span className="text-[#86EFAC]">✓</span><span>Tudo do plano mensal</span></li>
                  <li className="flex gap-3"><span className="text-[#86EFAC]">✓</span><span>Acesso vitalício sem renovação</span></li>
                  <li className="flex gap-3"><span className="text-[#86EFAC]">✓</span><span>Benefício futuro do robô quando for liberado</span></li>
                  <li className="flex gap-3"><span className="text-[#86EFAC]">✓</span><span>Melhor custo-benefício para quem quer entrar de vez</span></li>
                </ul>

                <div className="mt-8">
                  {renderPlanButton({
                    plan: "pro_plus",
                    label: "Quero acesso vitalício",
                    microcopy: "Plano vitalício com benefício futuro e pagamento único.",
                    variant: "primary",
                    fullWidth: true,
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[#1E293B]/80 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              eyebrow="FAQ"
              title="Respostas rápidas para remover objeções"
              description="Veja as dúvidas mais comuns antes de assinar."
            />

            <div className="mt-12 space-y-4">
              {faqItems.map((item) => (
                <div key={item.question} className="rounded-3xl border border-[#1E293B] bg-[#0B1220]/90 p-6">
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#94A3B8]">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#1E293B]/80 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-[#1E293B] bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(7,12,24,1))] p-6 text-center shadow-[0_25px_70px_rgba(2,6,23,0.55)] sm:p-10">
            <span className="inline-flex rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#C4B5FD]">
              Acesso ao sistema
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Tenha acesso a uma leitura mais prática, organizada e rápida.
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-[#94A3B8] sm:text-base">
              Se a sua prioridade é praticidade e velocidade para encontrar oportunidades, o Aragon foi feito para isso.
              E se você quer a melhor relação entre valor e benefício futuro, o vitalício é a escolha mais forte.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {renderPlanButton({
                plan: "advanced",
                label: "Assinar agora",
                microcopy: "Acesso rápido com liberação após confirmação.",
                variant: "secondary",
                fullWidth: true,
              })}
              {renderPlanButton({
                plan: "pro_plus",
                label: "Quero acesso vitalício",
                microcopy: "Plano vitalício com benefício futuro do robô.",
                variant: "primary",
                fullWidth: true,
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1E293B]/80 px-4 py-10 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 text-center text-sm text-[#94A3B8] sm:flex-row sm:text-left">
          <div>
            <p className="font-semibold text-[#E2E8F0]">Aragon</p>
            <p className="mt-1">Catalogação estratégica para opções binárias.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <a href="#" className="transition-colors hover:text-[#E5E7EB]">
              Termos
            </a>
            <span>•</span>
            <a href="#" className="transition-colors hover:text-[#E5E7EB]">
              Privacidade
            </a>
            <span>•</span>
            <a
              href="https://t.me/aragoncatalogador"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#60A5FA] transition-colors hover:text-[#93C5FD]"
            >
              Telegram @aragoncatalogador
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
