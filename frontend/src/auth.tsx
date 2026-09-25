import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { api, clearToken, loadToken, persistToken, setToken } from "@/src/api";

WebBrowser.maybeCompleteAuthSession();

export type User = {
  user_id: string;
  email?: string;
  name?: string;
  picture?: string;
  role: string;
  patron_saint_id?: string | null;
  secondary_saint_ids: string[];
  language: string;
  morning_time: string;
  angelus_time: string;
  night_time: string;
  onboarded: boolean;
  streak: number;
  blocked: boolean;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const Ctx = createContext<AuthCtx | null>(null);
const AUTH_BASE = "https://auth.emergentagent.com";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const processed = useRef<Set<string>>(new Set());

  const applyAuth = useCallback(async (token: string, u: User) => {
    await persistToken(token);
    setUserState(u);
  }, []);

  const exchangeSessionId = useCallback(
    async (sessionId: string) => {
      if (!sessionId || processed.current.has(sessionId)) return;
      processed.current.add(sessionId);
      try {
        const res = await api<{ session_token: string; user: User }>("/auth/session", {
          method: "POST",
          body: { session_id: sessionId },
          auth: false,
        });
        setToken(res.session_token);
        await applyAuth(res.session_token, res.user);
      } catch (e) {
        console.warn("session exchange failed", e);
      }
    },
    [applyAuth],
  );

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ user: User }>("/auth/me");
      setUserState(res.user);
    } catch {
      await clearToken();
      setUserState(null);
    }
  }, []);

  // Bootstrap: handle web session_id, then existing token
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") {
        const hash = window.location.hash || "";
        const search = window.location.search || "";
        const m = (hash + search).match(/[?#&]session_id=([^&#]+)/);
        if (m) {
          await exchangeSessionId(decodeURIComponent(m[1]));
          const url = new URL(window.location.href);
          url.hash = "";
          url.searchParams.delete("session_id");
          window.history.replaceState(window.history.state, "", url.toString());
          setLoading(false);
          return;
        }
      } else {
        const initial = await Linking.getInitialURL();
        if (initial) {
          const m = initial.match(/[?#&]session_id=([^&#]+)/);
          if (m) await exchangeSessionId(decodeURIComponent(m[1]));
        }
      }
      const token = await loadToken();
      if (token) await refresh();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mobile hot deep links
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Linking.addEventListener("url", ({ url }) => {
      const m = url.match(/[?#&]session_id=([^&#]+)/);
      if (m) exchangeSessionId(decodeURIComponent(m[1]));
    });
    return () => sub.remove();
  }, [exchangeSessionId]);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await api<{ session_token: string; user: User }>("/auth/register", {
        method: "POST",
        body: { email, password, name },
        auth: false,
      });
      setToken(res.session_token);
      await applyAuth(res.session_token, res.user);
    },
    [applyAuth],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ session_token: string; user: User }>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      setToken(res.session_token);
      await applyAuth(res.session_token, res.user);
    },
    [applyAuth],
  );

  const googleLogin = useCallback(async () => {
    if (Platform.OS === "web") {
      const redirectUrl = window.location.origin + "/";
      window.location.href = `${AUTH_BASE}/?redirect=${encodeURIComponent(redirectUrl)}`;
      return;
    }
    const redirectUrl = Linking.createURL("");
    const authUrl = `${AUTH_BASE}/?redirect=${encodeURIComponent(redirectUrl)}`;
    let captured: string | null = null;
    const sub = Linking.addEventListener("url", ({ url }) => {
      if (/session_id=/.test(url)) captured = url;
    });
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      let url: string | null = null;
      if (result.type === "success" && result.url) url = result.url;
      if (!url && captured) url = captured;
      if (!url) url = await Linking.getInitialURL();
      if (url) {
        const m = url.match(/[?#&]session_id=([^&#]+)/);
        if (m) await exchangeSessionId(decodeURIComponent(m[1]));
      }
    } finally {
      sub.remove();
    }
  }, [exchangeSessionId]);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    await clearToken();
    setUserState(null);
  }, []);

  return (
    <Ctx.Provider
      value={{ user, loading, register, login, googleLogin, logout, refresh, setUser: setUserState }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
