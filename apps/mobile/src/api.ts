// Cliente de la API (apps/api). Respuesta estándar { data, error }; sesión como token Bearer
// (plugin bearer de Better Auth), guardado en el almacén seguro del dispositivo.
import { storage } from "@/src/utils/storage";

export const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
export const TOKEN_KEY = "msc.session_token";

let memToken: string | null = null;

export function getMemToken() {
  return memToken;
}

export async function loadToken(): Promise<string | null> {
  const t = await storage.secureGet<string>(TOKEN_KEY, "");
  memToken = t || null;
  return memToken;
}

export async function persistToken(token: string) {
  memToken = token;
  await storage.secureSet(TOKEN_KEY, token);
}

export async function clearToken() {
  memToken = null;
  await storage.secureRemove(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type Envelope<T> = { data: T; error: { code: string; message: string } | null };

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (memToken) headers.Authorization = `Bearer ${memToken}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json || json.error) {
    throw new ApiError(res.status, json?.error?.code ?? "http_error", json?.error?.message ?? res.statusText);
  }
  return json.data;
}

// Registro e inicio de sesión (Better Auth). El token llega en la cabecera set-auth-token.
// Google y Apple entran por /auth/sign-in/social con el ID token que da el sistema operativo.
export async function authRequest(
  path: "/auth/sign-in/email" | "/auth/sign-up/email" | "/auth/sign-in/social",
  body: Record<string, unknown>,
) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const token = res.headers.get("set-auth-token");
  if (!res.ok || !token) {
    const json = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new ApiError(res.status, json?.code ?? "auth_error", json?.message ?? res.statusText);
  }
  await persistToken(token);
}

export async function signOutRequest() {
  if (!memToken) return;
  await fetch(`${BASE}/api/auth/sign-out`, { method: "POST", headers: { Authorization: `Bearer ${memToken}` } }).catch(() => undefined);
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Mexico_City";
  } catch {
    return "America/Mexico_City";
  }
}
