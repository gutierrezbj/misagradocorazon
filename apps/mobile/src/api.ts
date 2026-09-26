import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
export const TOKEN_KEY = "msc.session_token";

let memToken: string | null = null;

export function setToken(token: string | null) {
  memToken = token;
}
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
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(
  path: string,
  options: { method?: string; body?: any; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && memToken) headers.Authorization = `Bearer ${memToken}`;
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data && data.detail) || res.statusText || "Request failed";
    throw new ApiError(res.status, typeof detail === "string" ? detail : "Request failed");
  }
  return data as T;
}
