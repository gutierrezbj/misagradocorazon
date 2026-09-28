import { createHash, createPublicKey, randomUUID } from "node:crypto";

import { exportJWK, generateKeyPair, jwtVerify, SignJWT, type JWK } from "jose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../src/db.ts";
import { env } from "../src/env.ts";
import { processAppleRevocations } from "../src/modules/auth/apple-tokens.ts";
import { app, bearer, resetDb, signUp } from "./helpers.ts";

// Apple se simula en fetch: claves públicas (login), /auth/token (canje) y /auth/revoke.
// Referencia de las peticiones: developer.apple.com, "Generate and validate tokens" y "Revoke tokens".
const BUNDLE = "com.misagradocorazon.app";
const realFetch = globalThis.fetch;

let signingKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let publicJwk: JWK;

type AppleCall = { url: string; form: URLSearchParams };
let calls: AppleCall[] = [];
// Lo que devolverá /auth/token: el sujeto del ID token y si falla.
let tokenSub = "";
let tokenFails = false;
let revokeFails = false;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  signingKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "RS256", use: "sig" };
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === "https://appleid.apple.com/auth/keys") return Response.json({ keys: [publicJwk] });
    if (url === "https://appleid.apple.com/auth/token" || url === "https://appleid.apple.com/auth/revoke") {
      const form = new URLSearchParams(String(init?.body));
      calls.push({ url, form });
      if (url.endsWith("/token")) {
        if (tokenFails) return Response.json({ error: "invalid_grant" }, { status: 400 });
        const idToken = await sign({ sub: tokenSub });
        return Response.json({ access_token: "at", token_type: "Bearer", expires_in: 3600, refresh_token: `rt-${form.get("code")}`, id_token: idToken });
      }
      return revokeFails ? Response.json({ error: "server_error" }, { status: 503 }) : new Response(null, { status: 200 });
    }
    return realFetch(input, init);
  });
});
afterAll(() => vi.unstubAllGlobals());

beforeEach(async () => {
  await resetDb();
  calls = [];
  tokenFails = false;
  revokeFails = false;
});

function sign(claims: Record<string, unknown>) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer("https://appleid.apple.com")
    .setAudience(BUNDLE)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(signingKey);
}

/** Entra con Apple (ID token nativo) y devuelve la sesión y el `sub` de Apple. */
async function appleUser(sub = `apple-${randomUUID()}`, email = `${randomUUID()}@privaterelay.appleid.com`) {
  const nonce = randomUUID();
  const token = await sign({
    sub,
    email,
    email_verified: "true",
    nonce: createHash("sha256").update(nonce).digest("hex"),
  });
  const res = await request(app).post("/api/auth/sign-in/social").send({ provider: "apple", idToken: { token, nonce } });
  expect(res.status).toBe(200);
  return { token: String(res.headers["set-auth-token"]), sub, email, userId: String(res.body.user.id) };
}

const sendCode = (session: string, code: string) => request(app).post("/api/me/apple-authorization").set(bearer(session)).send({ code });

describe("código de autorización de Apple", () => {
  it("se canjea con un client_secret ES256 firmado con la clave .p8 y se guarda el refresh token", async () => {
    const u = await appleUser();
    tokenSub = u.sub;
    const res = await sendCode(u.token, "code-1");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ stored: true });

    const [call] = calls;
    expect(call?.url).toBe("https://appleid.apple.com/auth/token");
    expect(call?.form.get("client_id")).toBe(BUNDLE);
    expect(call?.form.get("grant_type")).toBe("authorization_code");
    expect(call?.form.get("code")).toBe("code-1");
    // El client_secret cumple lo que pide Apple: ES256, kid, iss = Team ID, sub = client_id, aud.
    const publicKey = createPublicKey(env.APPLE_PRIVATE_KEY!);
    const { payload, protectedHeader } = await jwtVerify(call!.form.get("client_secret")!, publicKey, {
      issuer: env.APPLE_TEAM_ID,
      audience: "https://appleid.apple.com",
      subject: BUNDLE,
    });
    expect(protectedHeader).toEqual({ alg: "ES256", kid: env.APPLE_KEY_ID });
    expect(payload.exp! - payload.iat!).toBeLessThanOrEqual(15_777_000);

    const account = await prisma.account.findFirstOrThrow({ where: { userId: u.userId, providerId: "apple" } });
    expect(account.refreshToken).toBe("rt-code-1");
  });

  it("volver a entrar sin código conserva el token; un código nuevo lo sustituye sin revocar nada", async () => {
    const u = await appleUser();
    tokenSub = u.sub;
    await sendCode(u.token, "code-a").expect(200);
    const again = await appleUser(u.sub, u.email);
    expect(again.userId).toBe(u.userId);
    const where = { userId: u.userId, providerId: "apple" };
    expect((await prisma.account.findFirstOrThrow({ where })).refreshToken).toBe("rt-code-a");

    calls = [];
    await sendCode(again.token, "code-b").expect(200);
    expect((await prisma.account.findFirstOrThrow({ where })).refreshToken).toBe("rt-code-b");
    expect(calls.map((c) => c.url)).toEqual(["https://appleid.apple.com/auth/token"]);
  });

  it("rechaza un código de otra persona de Apple sin guardar ni revocar nada", async () => {
    const u = await appleUser();
    tokenSub = "apple-otra-persona";
    const res = await sendCode(u.token, "code-ajeno");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_apple_code");
    expect(calls.map((c) => c.url)).toEqual(["https://appleid.apple.com/auth/token"]);
    const account = await prisma.account.findFirstOrThrow({ where: { userId: u.userId, providerId: "apple" } });
    expect(account.refreshToken).toBeNull();
  });

  it("un código que Apple no acepta → 400", async () => {
    const u = await appleUser();
    tokenFails = true;
    const res = await sendCode(u.token, "caducado");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_apple_code");
  });

  it("una cuenta sin Apple vinculado → 409; sin sesión → 401; sin código → 400", async () => {
    const u = await signUp();
    expect((await sendCode(u.token, "x")).status).toBe(409);
    expect((await request(app).post("/api/me/apple-authorization").send({ code: "x" })).status).toBe(401);
    expect((await request(app).post("/api/me/apple-authorization").set(bearer(u.token)).send({})).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("sin la clave de Apple configurada no se contacta con Apple", async () => {
    const u = await appleUser();
    const keyId = env.APPLE_KEY_ID;
    env.APPLE_KEY_ID = undefined;
    try {
      const res = await sendCode(u.token, "code-1");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ stored: false });
      expect(calls).toHaveLength(0);
    } finally {
      env.APPLE_KEY_ID = keyId;
    }
  });
});

describe("revocación al borrar la cuenta (Apple 5.1.1(v))", () => {
  afterEach(() => {
    revokeFails = false;
  });

  it("revoca el refresh token y no deja nada pendiente", async () => {
    const u = await appleUser();
    tokenSub = u.sub;
    await sendCode(u.token, "code-2").expect(200);
    calls = [];

    const res = await request(app).delete("/api/me").set(bearer(u.token)).send({ confirm: true });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://appleid.apple.com/auth/revoke");
    expect(calls[0]?.form.get("token")).toBe("rt-code-2");
    expect(calls[0]?.form.get("token_type_hint")).toBe("refresh_token");
    expect(calls[0]?.form.get("client_id")).toBe(BUNDLE);
    expect(await prisma.appleRevocation.count()).toBe(0);
    expect(await prisma.account.count({ where: { userId: u.userId } })).toBe(0);
  });

  it("si Apple falla, el borrado sigue adelante y el worker reintenta", async () => {
    const u = await appleUser();
    tokenSub = u.sub;
    await sendCode(u.token, "code-3").expect(200);
    revokeFails = true;

    const res = await request(app).delete("/api/me").set(bearer(u.token)).send({ confirm: true });
    expect(res.status).toBe(200);
    const pending = await prisma.appleRevocation.findMany();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ token: "rt-code-3", attempts: 1 });
    expect(pending[0]?.lastError).toContain("503");
    // La fila pendiente no guarda nada de la persona.
    expect(Object.keys(pending[0]!).sort()).toEqual(["attempts", "createdAt", "id", "lastError", "token"]);

    revokeFails = false;
    expect(await processAppleRevocations()).toEqual({ revoked: 1, failed: 0 });
    expect(await prisma.appleRevocation.count()).toBe(0);
  });

  it("una cuenta de Apple sin refresh token guardado se borra sin llamar a Apple", async () => {
    const u = await appleUser();
    const res = await request(app).delete("/api/me").set(bearer(u.token)).send({ confirm: true });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(0);
    expect(await processAppleRevocations()).toEqual({ revoked: 0, failed: 0 });
  });
});
