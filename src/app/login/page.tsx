"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "aragon_users";

interface StoredUser {
  email: string;
  password: string;
}

function getStoredUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch {
    // localStorage cheio ou indisponível
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const em = email.trim().toLowerCase();
    const pw = password;
    if (!em || !pw) {
      setError("Preencha email e senha.");
      return;
    }
    setLoading(true);
    const users = getStoredUsers();
    const user = users.find((u) => u.email.toLowerCase() === em);
    setLoading(false);
    if (!user) {
      setError("Email não cadastrado. Faça seu cadastro.");
      return;
    }
    if (user.password !== pw) {
      setError("Senha incorreta.");
      return;
    }
    router.push("/probabilisticas");
  };

  const handleCadastro = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const em = email.trim().toLowerCase();
    const pw = password;
    const conf = confirmPassword;
    if (!em || !pw) {
      setError("Preencha email e senha.");
      return;
    }
    if (pw.length < 4) {
      setError("Senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (pw !== conf) {
      setError("Senha e confirmar senha não conferem.");
      return;
    }
    const users = getStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === em)) {
      setError("Este email já está cadastrado. Faça login.");
      return;
    }
    setLoading(true);
    saveUsers([...users, { email: em, password: pw }]);
    setLoading(false);
    setSuccess("Cadastro realizado. Redirecionando…");
    setTimeout(() => router.push("/probabilisticas"), 800);
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB] flex flex-col">
      <header className="shrink-0 flex items-center justify-center px-4 py-6 border-b border-[#1F2937]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center">
            <span className="text-white font-bold text-sm">AA</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#E5E7EB]">ARAGON ANALYTICS</h1>
            <p className="text-xs text-[#9CA3AF]">{isLogin ? "Login" : "Cadastro"}</p>
          </div>
        </Link>
      </header>

      <main className="flex-1 px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-[0_0_24px_rgba(37,99,235,0.08)]">
            <h2 className="text-lg font-semibold text-[#E5E7EB] mb-1">
              {isLogin ? "Entrar" : "Criar conta"}
            </h2>
            <p className="text-sm text-[#9CA3AF] mb-5">
              {isLogin
                ? "Use seu email e senha para acessar o ARAGON."
                : "Cadastre-se para acessar o ARAGON. Depois use o mesmo email e senha para entrar."}
            </p>
            <form
              onSubmit={isLogin ? handleLogin : handleCadastro}
              className="space-y-4"
            >
              <label className="block">
                <span className="block text-xs text-[#9CA3AF] mb-1">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearMessages(); }}
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
                  onChange={(e) => { setPassword(e.target.value); clearMessages(); }}
                  className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 focus:outline-none placeholder:text-[#6B7280]"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder="••••••••"
                />
              </label>
              {!isLogin && (
                <label className="block">
                  <span className="block text-xs text-[#9CA3AF] mb-1">Confirmar senha</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearMessages(); }}
                    className="w-full bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 focus:outline-none placeholder:text-[#6B7280]"
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                </label>
              )}
              {error && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-xs text-green-400 bg-green-900/20 border border-green-700/50 rounded-lg px-3 py-2">
                  {success}
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
                    {isLogin ? "Entrando…" : "Cadastrando…"}
                  </span>
                ) : (
                  isLogin ? "Entrar" : "Cadastrar"
                )}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-[#9CA3AF]">
              {isLogin ? (
                <>
                  Não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("cadastro"); clearMessages(); setConfirmPassword(""); }}
                    className="text-[#3B82F6] hover:underline font-medium"
                  >
                    Cadastre-se
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); clearMessages(); setConfirmPassword(""); }}
                    className="text-[#3B82F6] hover:underline font-medium"
                  >
                    Entrar
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
