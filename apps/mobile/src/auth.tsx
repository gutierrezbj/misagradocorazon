import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api, authRequest, clearToken, loadToken, signOutRequest } from "@/src/api";
import type { User } from "@/src/types";

export type { User } from "@/src/types";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUserState(await api<User>("/me"));
    } catch {
      await clearToken();
      setUserState(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (await loadToken()) await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      await authRequest("/auth/sign-up/email", { email, password, name });
      await refresh();
    },
    [refresh],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      await authRequest("/auth/sign-in/email", { email, password });
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await signOutRequest();
    await clearToken();
    setUserState(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, register, login, logout, refresh, setUser: setUserState }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
