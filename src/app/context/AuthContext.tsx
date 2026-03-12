"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchMe, getAuthToken, setAuthToken, setStoredPlan, getStoredPlan, type MeResponse } from "../api";
import { clearAll as authStoreClearAll } from "../util/AuthStore";

export type AuthUser = MeResponse;

export type PlanLimits = {
  maxStrategies: number;
  maxAssets: number;
};

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  blocked: { maxStrategies: 0, maxAssets: 0 },
  advanced: { maxStrategies: 2, maxAssets: 3 },
  avancado: { maxStrategies: 2, maxAssets: 3 },
  pro_plus: { maxStrategies: 999, maxAssets: 999 },
  vitalicio: { maxStrategies: 999, maxAssets: 999 },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.blocked;
}

type AuthStore = {
  user: AuthUser | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  logout: () => void;
  planLimits: PlanLimits;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthStore>({
  user: null,
  loading: true,
  fetchUser: async () => {},
  logout: () => {},
  planLimits: PLAN_LIMITS.blocked,
  isAdmin: false,
});

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await fetchMe();
      if (me) {
        setUser(me);
        setStoredPlan(me.plan);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    authStoreClearAll();
    setUser(null);
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    const stored = getStoredPlan();
    if (stored) {
      setUser((prev) => (prev ? { ...prev, plan: stored } : { id: "", email: "", plan: stored }));
    }
    fetchUser();
  }, [fetchUser]);

  const planLimits = getPlanLimits(user?.plan ?? "blocked");
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, loading, fetchUser, logout, planLimits, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
