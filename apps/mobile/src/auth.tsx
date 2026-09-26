import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { applyAnalyticsConsent } from "@/src/analytics";

import { api, authRequest, clearToken, loadToken, signOutRequest } from "@/src/api";
import { unregisterPush } from "@/src/push";
import { queryClient } from "@/src/query-client";
import { signInWithApple, signInWithGoogle, socialSignOut, type SocialProvider } from "@/src/social";
import type { User } from "@/src/types";

export type { User } from "@/src/types";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  /** false si la persona cancela en la pantalla de Google o Apple. */
  loginWithProvider: (provider: SocialProvider) => Promise<boolean>;
  logout: () => Promise<void>;
  /** Borra la cuenta en el servidor y deja el dispositivo como recién instalado. */
  deleteAccount: () => Promise<void>;
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

  const loginWithProvider = useCallback(
    async (provider: SocialProvider) => {
      const cred = provider === "google" ? await signInWithGoogle() : await signInWithApple();
      if (!cred) return false;
      await authRequest("/auth/sign-in/social", cred);
      await refresh();
      return true;
    },
    [refresh],
  );

  // La analítica sigue al consentimiento del perfil; sin usuario se apaga y se olvida la identidad.
  useEffect(() => {
    void applyAnalyticsConsent(user ? { id: user.id, analyticsConsent: user.analyticsConsent } : null).catch(() => undefined);
  }, [user?.id, user?.analyticsConsent]); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(async () => {
    // Primero se da de baja el dispositivo: hace falta la sesión todavía válida.
    await unregisterPush();
    await signOutRequest();
    await socialSignOut();
    await clearToken();
    // Nada de la persona anterior debe quedar en caché (intenciones privadas, votos...).
    queryClient.clear();
    setUserState(null);
  }, []);
  const deleteAccount = useCallback(async () => {
    // Si falla, se lanza y la sesión sigue intacta.
    await api("/me", { method: "DELETE", body: { confirm: true } });
    // El servidor ya borró sesión y dispositivos; aquí solo se limpia lo local.
    await unregisterPush();
    await socialSignOut();
    await clearToken();
    queryClient.clear();
    setUserState(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, register, login, loginWithProvider, logout, deleteAccount, refresh, setUser: setUserState }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
