// Sign in with Apple REST API: canje del código de autorización y revocación de tokens.
// Apple exige revocar los tokens al borrar la cuenta (guideline 5.1.1(v)). El login nativo solo
// entrega un ID token, que no sirve para revocar; por eso la app manda además el código de
// autorización, que aquí se canjea por un refresh token (no caduca) para revocarlo al final.
// Referencia: developer.apple.com, "Generate and validate tokens", "Revoke tokens" y
// "Creating a client secret".
import { decodeJwt, importPKCS8, SignJWT } from "jose";

import { env } from "../env.ts";

const TOKEN_URL = "https://appleid.apple.com/auth/token";
const REVOKE_URL = "https://appleid.apple.com/auth/revoke";

export function appleRevocationConfigured(): boolean {
  return Boolean(env.APPLE_BUNDLE_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY);
}

// El client_secret es un JWT ES256 firmado con la clave .p8. Apple admite hasta seis meses de
// validez; se genera uno de vida corta en cada llamada.
async function clientSecret(): Promise<string> {
  const key = await importPKCS8(env.APPLE_PRIVATE_KEY!, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID! })
    .setIssuer(env.APPLE_TEAM_ID!)
    .setSubject(env.APPLE_BUNDLE_ID!)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

async function post(url: string, fields: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.APPLE_BUNDLE_ID!, client_secret: await clientSecret(), ...fields }),
  });
  if (!res.ok) {
    // Apple responde { error: "invalid_grant" | "invalid_client" | ... }; nunca incluye datos del usuario.
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(`Apple ${res.status} ${body?.error ?? ""}`.trim());
  }
  return res;
}

/** Canjea el código (un solo uso, 5 minutos) por un refresh token y el `sub` de la persona. */
export async function exchangeAppleCode(code: string): Promise<{ refreshToken: string; sub: string }> {
  const res = await post(TOKEN_URL, { code, grant_type: "authorization_code" });
  const data = (await res.json()) as { refresh_token?: string; id_token?: string };
  if (!data.refresh_token || !data.id_token) throw new Error("Apple no devolvió refresh token");
  // El ID token llega directamente de Apple por TLS: basta con leer el sujeto.
  const sub = decodeJwt(data.id_token).sub;
  if (!sub) throw new Error("ID token de Apple sin sujeto");
  return { refreshToken: data.refresh_token, sub };
}

/** Revoca un refresh token. Apple responde 200 también si ya estaba revocado. */
export async function revokeAppleToken(refreshToken: string): Promise<void> {
  await post(REVOKE_URL, { token: refreshToken, token_type_hint: "refresh_token" });
}
