"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authLogin, authRegister, getAuthToken } from "../api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getAuthToken();
    if (token) {
      router.replace("/probabilisticas");
    }
  }, [router]);

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
      if (mode === "login") {
        await authLogin(em, pw);
      } else {
        await authRegister(em, pw);
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
      <header className="shrink-0 flex items-center justify-center px-4 py-6 border-b border-[#1F2937]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center">
            <span className="text-white font-bold text-sm">AA</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#E5E7EB]">ARAGON ANALYTICS</h1>
            <p className="text-xs text-[#9CA3AF]">Trading Intelligence Platform</p>
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
