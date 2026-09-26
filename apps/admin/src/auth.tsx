import { STAFF_ROLES, type Role } from "@msc/shared";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, getToken, signIn, signOut } from "./api.ts";
import type { Me } from "./types.ts";

type AuthState = { status: "loading" | "anonymous" | "ready"; me: Me | null };
type AuthCtx = AuthState & { login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> };

const Ctx = createContext<AuthCtx | null>(null);

export const isStaff = (role: Role | undefined) => !!role && (STAFF_ROLES as readonly Role[]).includes(role);
export const can = (me: Me | null, ...roles: Role[]) => !!me && (me.role === "superadmin" || roles.includes(me.role));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: getToken() ? "loading" : "anonymous", me: null });

  const loadMe = useCallback(async () => {
    try {
      const me = await api<Me>("/me");
      setState({ status: "ready", me });
    } catch {
      setState({ status: "anonymous", me: null });
    }
  }, []);

  useEffect(() => {
    if (getToken()) void loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      await signIn(email, password);
      await loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    await signOut();
    setState({ status: "anonymous", me: null });
  }, []);

  return <Ctx.Provider value={{ ...state, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
