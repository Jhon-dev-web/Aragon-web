"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthToken } from "./api";

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

export default function HomePage() {
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);

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

  const handleAcessarAragon = () => {
    const token = getAuthToken();
    if (token) {
      router.push("/probabilisticas");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB] flex flex-col">
      {showToast && <ToastRecursoEmBreve onDismiss={() => setShowToast(false)} />}

      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#1F2937] shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">AA</span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#E5E7EB]">ARAGON ANALYTICS</h1>
            <p className="text-xs text-[#9CA3AF] hidden sm:block">Trading Intelligence Platform</p>
          </div>
        </Link>
        <Link
          href="/login"
          className="px-4 py-2 rounded-xl text-sm font-medium bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] hover:border-[#4B5563] transition-colors"
        >
          Entrar
        </Link>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 sm:px-6 py-16 sm:py-24 text-center max-w-3xl mx-auto">
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
              className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors shadow-lg shadow-[#2563EB]/20"
            >
              Acessar Aragon
            </button>
            <a
              href="#planos"
              className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] transition-colors"
            >
              Ver Planos
            </a>
          </div>
        </section>

        {/* Como funciona */}
        <section className="px-4 sm:px-6 py-12 sm:py-16 border-t border-[#1F2937]">
          <h3 className="text-xl sm:text-2xl font-semibold text-[#E5E7EB] text-center mb-10">Como funciona</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="rounded-2xl p-6 bg-[#111827] border border-[#1F2937] text-center">
              <div className="w-12 h-12 rounded-xl bg-[#2563EB]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-[#2563EB] font-bold text-lg">1</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Escolha estratégia e timeframe</h4>
              <p className="text-sm text-[#9CA3AF]">Selecione MHI, 3 Mosqueteiros ou outra estratégia e a janela (2h, 4h, 24h).</p>
            </div>
            <div className="rounded-2xl p-6 bg-[#111827] border border-[#1F2937] text-center">
              <div className="w-12 h-12 rounded-xl bg-[#2563EB]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-[#2563EB] font-bold text-lg">2</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Catalogamos histórico e ciclos</h4>
              <p className="text-sm text-[#9CA3AF]">O motor processa candles e classifica cada ciclo (P, G1, H) por ativo.</p>
            </div>
            <div className="rounded-2xl p-6 bg-[#111827] border border-[#1F2937] text-center">
              <div className="w-12 h-12 rounded-xl bg-[#2563EB]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-[#2563EB] font-bold text-lg">3</span>
              </div>
              <h4 className="font-semibold text-[#E5E7EB] mb-2">Ranking e consistência por ativo</h4>
              <p className="text-sm text-[#9CA3AF]">Você vê os ativos mais assertivos e pode filtrar por min ciclos e Top N.</p>
            </div>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="px-4 sm:px-6 py-12 sm:py-16 border-t border-[#1F2937]">
          <h3 className="text-xl sm:text-2xl font-semibold text-[#E5E7EB] text-center mb-10">Planos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* GRÁTIS */}
            <div className="rounded-2xl p-6 bg-[#111827] border border-[#1F2937] flex flex-col">
              <h4 className="text-lg font-semibold text-[#E5E7EB] mb-1">GRÁTIS</h4>
              <p className="text-[#9CA3AF] text-sm mb-4">Para começar</p>
              <ul className="space-y-2 text-sm text-[#D1D5DB] mb-6 flex-1">
                <li className="flex items-center gap-2"><span className="text-[#22C55E]">✓</span> 1 estratégia</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E]">✓</span> 1 ativo</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E]">✓</span> Ranking básico</li>
              </ul>
              <Link
                href="/login"
                className="block w-full py-3 rounded-xl text-sm font-medium text-center bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] transition-colors"
              >
                Começar grátis
              </Link>
            </div>

            {/* AVANÇADO */}
            <div className="rounded-2xl p-6 bg-[#111827] border-2 border-[#2563EB]/50 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#2563EB] text-white text-xs font-medium">Popular</div>
              <h4 className="text-lg font-semibold text-[#E5E7EB] mb-1">AVANÇADO</h4>
              <p className="text-[#9CA3AF] text-sm mb-4">Para evoluir</p>
              <ul className="space-y-2 text-sm text-[#D1D5DB] mb-6 flex-1">
                <li className="flex items-center gap-2"><span className="text-[#22C55E]">✓</span> 2 estratégias</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E]">✓</span> 3 ativos</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E]">✓</span> Ranking + filtros</li>
              </ul>
              <Link
                href="/login"
                className="block w-full py-3 rounded-xl text-sm font-medium text-center bg-[#2563EB] hover:bg-[#3B82F6] text-white transition-colors"
              >
                Assinar Avançado
              </Link>
            </div>

            {/* PRO+ */}
            <div className="rounded-2xl p-6 bg-[#111827] border border-[#1F2937] flex flex-col">
              <h4 className="text-lg font-semibold text-[#E5E7EB] mb-1">PRO+</h4>
              <p className="text-[#9CA3AF] text-sm mb-4">Máximo desempenho</p>
              <ul className="space-y-2 text-sm text-[#D1D5DB] mb-6 flex-1">
                <li className="flex items-center gap-2"><span className="text-[#22C55E]">✓</span> Todas as estratégias</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E]">✓</span> Todos os ativos</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E]">✓</span> Atualizações premium</li>
                <li className="flex items-center gap-2"><span className="text-[#22C55E]">✓</span> Acesso futuro ao robô grátis por 2 semanas</li>
              </ul>
              <Link
                href="/login"
                className="block w-full py-3 rounded-xl text-sm font-medium text-center bg-[#7C3AED] hover:bg-[#8B5CF6] text-white transition-colors"
              >
                Assinar PRO+
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 sm:px-6 py-8 border-t border-[#1F2937] text-center text-sm text-[#9CA3AF]">
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
