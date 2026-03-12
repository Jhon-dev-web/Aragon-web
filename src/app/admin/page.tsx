"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminCreatePromo,
  adminListPromoCodes,
  adminListUsers,
  adminRevokePromo,
  getAuthToken,
  type AdminPromoCode,
  type AdminUserItem,
} from "../api";
import { useAuth } from "../context/AuthContext";

const ADMIN_KEY_STORAGE = "aa_admin_key";

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [adminKey, setAdminKey] = useState("");
  const [codes, setCodes] = useState<AdminPromoCode[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [newCode, setNewCode] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    if (saved) setAdminKey(saved);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user && !getAuthToken()) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const loadData = useCallback(async () => {
    try {
      setFetching(true);
      setFeedback("");
      const [codesData, usersData] = await Promise.all([
        adminListPromoCodes(adminKey || undefined),
        adminListUsers(adminKey || undefined),
      ]);
      setCodes(codesData);
      setUsers(usersData);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Falha ao carregar dados administrativos.");
    } finally {
      setFetching(false);
    }
  }, [adminKey]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  const activeUsersCount = useMemo(
    () => users.filter((u) => (u.access_tier || "blocked") !== "blocked").length,
    [users]
  );

  const handleCreatePromo = async () => {
    const code = newCode.trim();
    if (!code) {
      setFeedback("Informe o código.");
      return;
    }
    try {
      setFetching(true);
      setFeedback("");
      await adminCreatePromo(
        {
          code,
          duration_days: Math.max(1, Number(durationDays) || 7),
          max_redemptions: maxRedemptions.trim() ? Math.max(1, Number(maxRedemptions)) : undefined,
          expires_at: expiresAt.trim() ? new Date(expiresAt).toISOString() : undefined,
        },
        adminKey || undefined
      );
      setFeedback("Código criado com sucesso.");
      setNewCode("");
      await loadData();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Falha ao criar código.");
    } finally {
      setFetching(false);
    }
  };

  const handleRevoke = async (codeId: string) => {
    try {
      setFetching(true);
      setFeedback("");
      await adminRevokePromo(codeId, adminKey || undefined);
      setFeedback("Código revogado com sucesso.");
      await loadData();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Falha ao revogar código.");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937]">
        <Link href="/probabilisticas" className="text-sm text-[#93C5FD] hover:underline">
          Voltar ao painel
        </Link>
        <h1 className="text-lg font-semibold">Administração</h1>
        <button
          type="button"
          onClick={loadData}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2563EB] hover:bg-[#3B82F6]"
        >
          Atualizar
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        <section className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-2">Acesso admin</h2>
          <p className="text-xs text-[#9CA3AF] mb-3">
            Se necessário, informe a chave no campo abaixo. Para seu e-mail admin, pode deixar vazio.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => {
                const v = e.target.value;
                setAdminKey(v);
                if (typeof window !== "undefined") window.localStorage.setItem(ADMIN_KEY_STORAGE, v);
              }}
              placeholder="X-ADMIN-KEY (opcional)"
              className="flex-1 bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1F2937] border border-[#374151] hover:bg-[#374151]"
            >
              Validar acesso
            </button>
          </div>
          {feedback && <p className="mt-3 text-xs text-[#93C5FD]">{feedback}</p>}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
            <p className="text-xs text-[#9CA3AF]">Total de usuários</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
            <p className="text-xs text-[#9CA3AF]">Usuários com acesso ativo</p>
            <p className="text-2xl font-bold">{activeUsersCount}</p>
          </div>
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
            <p className="text-xs text-[#9CA3AF]">Códigos promocionais</p>
            <p className="text-2xl font-bold">{codes.length}</p>
          </div>
        </section>

        <section className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Criar código promocional</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO_EXEMPLO"
              className="bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value) || 7)}
              placeholder="Dias de duração"
              className="bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder="Limite de resgates (opcional)"
              className="bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="bg-[#0B1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleCreatePromo}
            disabled={fetching}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-[#2563EB] hover:bg-[#3B82F6] disabled:opacity-60"
          >
            Criar código
          </button>
        </section>

        <section className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Códigos promocionais</h2>
          <div className="space-y-2">
            {codes.map((c) => (
              <div key={c.id} className="rounded-lg border border-[#1F2937] bg-[#0B1220] p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[#E5E7EB]">{c.id}</span>
                  <span className={`px-2 py-0.5 rounded ${c.is_active ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"}`}>
                    {c.is_active ? "ativo" : "revogado"}
                  </span>
                  <span className="text-[#9CA3AF]">Resgates: {c.redemptions_count}/{c.max_redemptions ?? "∞"}</span>
                  <span className="text-[#9CA3AF]">Duração: {c.duration_days ?? "—"} dias</span>
                  <span className="text-[#9CA3AF]">Expira: {fmtDate(c.expires_at)}</span>
                  {c.is_active && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(c.id)}
                      className="ml-auto px-2.5 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white"
                    >
                      Revogar
                    </button>
                  )}
                </div>
              </div>
            ))}
            {codes.length === 0 && <p className="text-xs text-[#9CA3AF]">Nenhum código encontrado.</p>}
          </div>
        </section>

        <section className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Usuários ativos e planos</h2>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#9CA3AF] border-b border-[#1F2937]">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Plano salvo</th>
                  <th className="py-2 pr-3">Acesso efetivo</th>
                  <th className="py-2 pr-3">Expiração plano</th>
                  <th className="py-2 pr-3">Entitlement</th>
                  <th className="py-2 pr-3">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#1F2937]/60">
                    <td className="py-2 pr-3">
                      {u.email}
                      {u.is_admin_override ? <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-300">admin unlock</span> : null}
                    </td>
                    <td className="py-2 pr-3">{u.saved_plan}</td>
                    <td className="py-2 pr-3">{u.access_tier}</td>
                    <td className="py-2 pr-3">{fmtDate(u.plan_expires_at)}</td>
                    <td className="py-2 pr-3">
                      {u.entitlement_source ? `${u.entitlement_source} (${fmtDate(u.entitlement_expires_at)})` : "—"}
                    </td>
                    <td className="py-2 pr-3">{fmtDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.length && <p className="text-xs text-[#9CA3AF] mt-2">Nenhum usuário encontrado.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

