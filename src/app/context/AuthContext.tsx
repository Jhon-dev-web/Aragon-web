"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchMe, getAuthToken, setAuthToken, setStoredPlan, getStoredPlan, type MeResponse } from "../api";

export type AuthUser = MeResponse;

export type PlanLimits = {
  maxStrategies: number;
  maxAssets: number;
};

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { maxStrategies: 1, maxAssets: 1 },
  advanced: { maxStrategies: 2, maxAssets: 3 },
  pro_plus: { maxStrategies: 999, maxAssets: 999 },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

type AuthStore = {
  user: AuthUser | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  logout: () => void;
  planLimits: PlanLimits;
};

const AuthContext = createContext<AuthStore>({
  user: null,
  loading: true,
  fetchUser: async () => {},
  logout: () => {},
  planLimits: PLAN_LIMITS.free,
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

  const planLimits = getPlanLimits(user?.plan ?? "free");

  return (
    <AuthContext.Provider value={{ user, loading, fetchUser, logout, planLimits }}>
      {children}
    </AuthContext.Provider>
  );
}
