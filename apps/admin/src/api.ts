// Cliente de la API. La sesión es un token Bearer (plugin bearer de Better Auth) guardado
// en sessionStorage: se pierde al cerrar la pestaña, a propósito, por ser un panel de gestión.
const BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "msc.admin.token";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sin almacenamiento: la sesión dura lo que la página */
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}/api${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const json = (await res.json().catch(() => null)) as { data: T; error: { code: string; message: string } | null } | null;
  if (!res.ok || !json || json.error) {
    if (res.status === 401) setToken(null);
    throw new ApiError(res.status, json?.error?.code ?? "http_error", json?.error?.message ?? res.statusText);
  }
  return json.data;
}

export async function signIn(email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const token = res.headers.get("set-auth-token");
  if (!res.ok || !token) throw new ApiError(res.status, "bad_credentials", "Credenciales no válidas");
  setToken(token);
}

export async function signOut(): Promise<void> {
  const token = getToken();
  setToken(null);
  if (token) {
    await fetch(`${BASE}/api/auth/sign-out`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
  }
}

export const formatUsd = (cents: number, lang: string) =>
  new Intl.NumberFormat(lang === "en" ? "en-US" : "es-MX", { style: "currency", currency: "USD" }).format(cents / 100);

export const formatNumber = (n: number, lang: string) => new Intl.NumberFormat(lang === "en" ? "en-US" : "es-MX").format(n);
