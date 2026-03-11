"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authLogin, authRegister, getAuthToken, billingCheckout, type BillingPlan } from "../api";
import { useAuth } from "../context/AuthContext";

const BULLEX_REGISTER_URL = "https://trade.bull-ex.com/register?aff=814493&aff_model=revenue&afftrack=";

export default function LoginPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [planAfterAuth, setPlanAfterAuth] = useState<BillingPlan | null>(null);
  const [showCpfForCheckout, setShowCpfForCheckout] = useState(false);
  const [cpfForCheckout, setCpfForCheckout] = useState("");
  const [installmentCountForCheckout, setInstallmentCountForCheckout] = useState(1);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logoutToast, setLogoutToast] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("logout") === "1") {
      setLogoutToast(true);
      const t = setTimeout(() => setLogoutToast(false), 5000);
      return () => clearTimeout(t);
    }
    const plan = params.get("plan");
    if (plan === "advanced" || plan === "pro_plus") {
      setPlanAfterAuth(plan);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getAuthToken();
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (token && !(plan === "advanced" || plan === "pro_plus")) {
      router.replace("/probabilisticas");
    }
  }, [router]);

  const LOGIN_TIMEOUT_MS = 28_000;
  const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, 11);
  const formatCpf = (v: string) => {
    const d = onlyDigits(v);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  };

  const handleCpfCheckout = async () => {
    if (!planAfterAuth) return;
    const digits = onlyDigits(cpfForCheckout);
    if (digits.length !== 11) {
      setError("Informe seu CPF (11 dígitos). O Asaas exige para gerar a cobrança.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const checkout = await billingCheckout(planAfterAuth, digits, "UNDEFINED", installmentCountForCheckout);
      const url = checkout.checkout_url ?? checkout.init_point;
      if (!url) throw new Error("Checkout sem URL de redirecionamento");
      if (typeof window !== "undefined") window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar checkout.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const em = email.trim();
    const pw = password;
    if (!em || !pw) {
      setError("Preencha email e senha.");
      return;
    }
    setLoading(true);
    try {
      const loginTask = (async () => {
        if (mode === "login") {
          await authLogin(em, pw);
        } else {
          await authRegister(em, pw, name.trim() || undefined, phone.trim() || undefined);
        }
        await fetchUser();
      })();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Tempo esgotado. Verifique sua conexão e tente novamente.")), LOGIN_TIMEOUT_MS);
      });
      await Promise.race([loginTask, timeoutPromise]);

      // Se veio de um clique em plano na landing (?plan=advanced|pro_plus),
      // pedir CPF (Asaas exige) e depois ir para o checkout.
      if (planAfterAuth && (planAfterAuth === "advanced" || planAfterAuth === "pro_plus")) {
        setShowCpfForCheckout(true);
        setLoading(false);
        return;
      }

      router.replace("/probabilisticas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar. Verifique email e senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB] flex flex-col">
      {showCpfForCheckout && planAfterAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">Identificação para pagamento</h3>
            <p className="text-sm text-[#9CA3AF] mb-4">
              O Asaas exige CPF para gerar a cobrança. Você não preenche isso na página do Asaas.
            </p>
            <label className="block mb-4">
              <span className="block text-xs text-[#9CA3AF] mb-1">CPF</span>
              <input
                type="text"
                value={formatCpf(cpfForCheckout)}
                onChange={(e) => { setCpfForCheckout(e.target.value); setError(""); }}
                placeholder="000.000.000-00"
                className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 focus:outline-none"
              />
            </label>
            <label className="block mb-4">
              <span className="block text-xs text-[#9CA3AF] mb-1">Parcelas (cartão de crédito)</span>
              <select
                value={installmentCountForCheckout}
                onChange={(e) => setInstallmentCountForCheckout(Number(e.target.value))}
                className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n === 1 ? "1x à vista" : `${n}x sem juros`}</option>
                ))}
              </select>
            </label>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowCpfForCheckout(false); setPlanAfterAuth(null); setError(""); router.replace("/probabilisticas"); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#1F2937] border border-[#374151] text-[#E5E7EB]"
              >
                Depois
              </button>
              <button
                type="button"
                onClick={handleCpfCheckout}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white disabled:opacity-70"
              >
                {loading ? "Abrindo..." : "Ir ao pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}
      {logoutToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-[#1F2937] border border-[#374151] text-[#E5E7EB] text-sm shadow-xl flex items-center gap-3">
          <span>Você saiu da conta.</span>
          <button type="button" onClick={() => setLogoutToast(false)} className="p-1 rounded-lg hover:bg-white/10 text-[#9CA3AF]" aria-label="Fechar">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      <header className="shrink-0 flex items-center justify-center px-4 py-6 border-b border-[#1F2937]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center">
            <span className="text-white font-bold text-sm">AA</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#E5E7EB]">ARAGON ANALYTICS</h1>
          </div>
        </Link>
      </header>

      <main className="flex-1 px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-[0_0_24px_rgba(37,99,235,0.08)]">
            <h2 className="text-lg font-semibold text-[#E5E7EB] mb-1">
              {mode === "login" ? "Entrar no ARAGON" : "Criar conta no ARAGON"}
            </h2>
            <p className="text-sm text-[#9CA3AF] mb-5">
              {mode === "login"
                ? "Use seu email e senha para acessar o painel de análises."
                : "Crie sua conta ARAGON para acessar o painel de análises."}
            </p>
            <div className="mb-5 rounded-xl border border-[#374151] bg-[#0B1220] px-3 py-3">
              <p className="text-xs text-[#D1D5DB]">
                Regra recomendada: use no ARAGON o mesmo email da sua conta na corretora Bullex.
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <label className="block">
                    <span className="block text-xs text-[#9CA3AF] mb-1">Nome</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setError(""); }}
                      className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 focus:outline-none placeholder:text-[#6B7280]"
                      autoComplete="name"
                      placeholder="Seu nome"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs text-[#9CA3AF] mb-1">Telefone</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setError(""); }}
                      className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 focus:outline-none placeholder:text-[#6B7280]"
                      autoComplete="tel"
                      placeholder="(00) 00000-0000"
                    />
                  </label>
                </>
              )}
              <label className="block">
                <span className="block text-xs text-[#9CA3AF] mb-1">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 focus:outline-none placeholder:text-[#6B7280]"
                  autoComplete="email"
                  placeholder="seu@email.com"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-[#9CA3AF] mb-1">Senha</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 focus:outline-none placeholder:text-[#6B7280]"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </label>
              {error && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 px-4 py-3 rounded-xl text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] disabled:bg-[#1F2937] disabled:text-[#6B7280] text-white transition-colors"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === "login" ? "Entrando…" : "Criando conta…"}
                  </span>
                ) : (
                  mode === "login" ? "Entrar" : "Criar conta"
                )}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-[#9CA3AF]">
              {mode === "login" ? (
                <>
                  Ainda não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setError("");
                      setName("");
                      setPhone("");
                    }}
                    className="text-[#3B82F6] hover:underline font-medium"
                  >
                    Criar conta
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                    className="text-[#3B82F6] hover:underline font-medium"
                  >
                    Fazer login
                  </button>
                </>
              )}
            </p>
            <p className="mt-4 text-center text-sm text-[#9CA3AF]">
              <Link href="/" className="text-[#3B82F6] hover:underline font-medium">
                Voltar para a Home
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
