"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  fetchBrokerStatus,
  brokerConnect as apiBrokerConnect,
  brokerDisconnect as apiBrokerDisconnect,
  type BrokerStatus,
} from "../api";

export type BrokerStore = {
  connected: boolean;
  accountType?: string | null;
  balance?: number | null;
  loading: boolean;
  lastCheckedAt?: string | null;
  error: string | null;
  fetchStatus: () => Promise<void>;
  connect: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<void>;
};

const defaultStore: BrokerStore = {
  connected: false,
  loading: true,
  error: null,
  fetchStatus: async () => {},
  connect: async () => ({ success: false }),
  disconnect: async () => {},
};

const BrokerContext = createContext<BrokerStore>(defaultStore);

export function BrokerProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s: BrokerStatus = await fetchBrokerStatus();
      setConnected(s.connected ?? false);
      setAccountType(s.accountType ?? null);
      setBalance(s.balance ?? null);
      setLastCheckedAt(new Date().toISOString());
    } catch (e) {
      setConnected(false);
      setAccountType(null);
      setBalance(null);
      setError(e instanceof Error ? e.message : "Falha ao verificar status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const connect = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const res = await apiBrokerConnect({ email, password });
        setConnected(res.connected ?? true);
        setAccountType(res.accountType ?? null);
        setBalance(res.balance ?? null);
        setLastCheckedAt(new Date().toISOString());
        return { success: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Conexão falhou";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    []
  );

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await apiBrokerDisconnect();
      setConnected(false);
      setAccountType(null);
      setBalance(null);
      setLastCheckedAt(new Date().toISOString());
    } catch {
      setConnected(false);
      setAccountType(null);
      setBalance(null);
    }
  }, []);

  const value: BrokerStore = {
    connected,
    accountType,
    balance,
    loading,
    lastCheckedAt,
    error,
    fetchStatus,
    connect,
    disconnect,
  };

  return <BrokerContext.Provider value={value}>{children}</BrokerContext.Provider>;
}

export function useBroker(): BrokerStore {
  const ctx = useContext(BrokerContext);
  return ctx ?? defaultStore;
}
