"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthToken } from "../../api";
import { useAuth } from "../../context/AuthContext";

type BillingReturnStatus = "success" | "pending" | "failure";

function normalizeStatus(raw: string | null): BillingReturnStatus {
  const v = (raw || "").toLowerCase();
  if (v === "success" || v === "approved") return "success";
  if (v === "pending" || v === "in_process") return "pending";
  return "failure";
}

export default function BillingReturnPage() {
  const router = useRouter();
  const { user, fetchUser } = useAuth();
  const [status, setStatus] = useState<BillingReturnStatus>("pending");
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setStatus(normalizeStatus(params.get("status")));
    setRefreshing(true);
    fetchUser().finally(() => setRefreshing(false));
  }, [fetchUser, router]);

  const message = useMemo(() => {
    if (status === "success") {
      return "Pagamento recebido. Seu plano será ativado automaticamente em instantes.";
    }
    if (status === "pending") {
      return "Pagamento pendente. Assim que for aprovado, o plano será ativado automaticamente.";
    }
    return "O pagamento não foi concluído. Você pode tentar novamente quando quiser.";
  }, [status]);

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB] px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-[#1F2937] bg-[#111827] p-6 sm:p-8">
        <h1 className="text-2xl font-semibold mb-2">Retorno do pagamento</h1>
        <p className="text-sm text-[#9CA3AF] mb-6">{message}</p>

        <div className="rounded-xl border border-[#1F2937] bg-[#0B1220] p-4 mb-6">
          <p className="text-xs text-[#94A3B8]">Status</p>
          <p className="text-sm font-medium mt-1">
            {status === "success" ? "Aprovado" : status === "pending" ? "Pendente" : "Falhou/Cancelado"}
          </p>
          <p className="text-xs text-[#94A3B8] mt-3">Plano atual</p>
          <p className="text-sm font-medium mt-1">
            {refreshing ? "Atualizando..." : (user?.plan || "free")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/probabilisticas"
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white text-center transition-colors"
          >
            Ir ao painel
          </Link>
          <Link
            href="/#planos"
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-[#1F2937] border border-[#374151] text-[#E5E7EB] hover:bg-[#374151] text-center transition-colors"
          >
            Voltar aos planos
          </Link>
        </div>
      </div>
    </div>
  );
}

