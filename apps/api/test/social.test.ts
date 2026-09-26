import { createHash, randomUUID } from "node:crypto";

import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../src/db.ts";
import { app, bearer, resetDb, signUp } from "./helpers.ts";

// Google y Apple publican sus claves en estas URLs. Los tests sirven las suyas y firman
// ID tokens reales con ellas: se ejercita la verificación completa de Better Auth.
const GOOGLE_KEYS = "https://www.googleapis.com/oauth2/v3/certs";
const APPLE_KEYS = "https://appleid.apple.com/auth/keys";
const GOOGLE_AUD = "msc-test.apps.googleusercontent.com";
const APPLE_AUD = "com.misagradocorazon.app";

let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let publicJwk: JWK;
const realFetch = globalThis.fetch;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "RS256", use: "sig" };
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(GOOGLE_KEYS) || url.startsWith(APPLE_KEYS)) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { "Content-Type": "application/json" } });
    }
    return realFetch(input, init);
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(resetDb);

type Claims = Record<string, unknown> & { sub: string; email: string };

function sign(claims: Claims, iss: string, aud: string) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(privateKey);
}

const googleToken = (claims: Partial<Claims> = {}, aud = GOOGLE_AUD) =>
  sign({ sub: randomUUID(), email: `g_${randomUUID()}@gmail.com`, email_verified: true, name: "María Guadalupe", ...claims }, "https://accounts.google.com", aud);

const appleToken = (claims: Partial<Claims> = {}) =>
  sign({ sub: randomUUID(), email: `${randomUUID()}@privaterelay.appleid.com`, email_verified: "true", ...claims }, "https://appleid.apple.com", APPLE_AUD);

const social = (body: Record<string, unknown>) => request(app).post("/api/auth/sign-in/social").send(body);

describe("login con Google (ID token nativo)", () => {
  it("crea la cuenta, devuelve el token Bearer y pasa por el onboarding", async () => {
    const res = await social({ provider: "google", idToken: { token: await googleToken() } });
    expect(res.status).toBe(200);
    const token = String(res.headers["set-auth-token"]);
    const me = await request(app).get("/api/me").set(bearer(token));
    expect(me.status).toBe(200);
    expect(me.body.data).toMatchObject({ name: "María Guadalupe", role: "user", onboarded: false });
  });

  it("la misma cuenta de Google vuelve a la misma cuenta", async () => {
    const sub = randomUUID();
    const email = `g_${sub}@gmail.com`;
    const a = await social({ provider: "google", idToken: { token: await googleToken({ sub, email }) } });
    const b = await social({ provider: "google", idToken: { token: await googleToken({ sub, email }) } });
    expect(a.body.user.id).toBe(b.body.user.id);
    expect(await prisma.user.count()).toBe(1);
  });

  it("rechaza tokens emitidos para otra app", async () => {
    const res = await social({ provider: "google", idToken: { token: await googleToken({}, "otra-app.apps.googleusercontent.com") } });
    expect(res.status).toBe(401);
    expect(await prisma.user.count()).toBe(0);
  });

  it("no enlaza con una cuenta de contraseña cuyo email no está verificado", async () => {
    const u = await signUp();
    const res = await social({ provider: "google", idToken: { token: await googleToken({ email: u.email }) } });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("OAUTH_LINK_ERROR");
    expect(await prisma.account.count({ where: { userId: u.userId, providerId: "google" } })).toBe(0);
  });

  it("una cuenta bloqueada entra por Google pero la API la frena", async () => {
    const sub = randomUUID();
    const email = `g_${sub}@gmail.com`;
    const first = await social({ provider: "google", idToken: { token: await googleToken({ sub, email }) } });
    await prisma.user.update({ where: { id: first.body.user.id }, data: { blocked: true } });
    const again = await social({ provider: "google", idToken: { token: await googleToken({ sub, email }) } });
    const me = await request(app).get("/api/me").set(bearer(String(again.headers["set-auth-token"])));
    expect(me.status).toBe(403);
  });
});

describe("login con Apple (ID token nativo, iOS)", () => {
  it("verifica el nonce y guarda el nombre que Apple solo da la primera vez", async () => {
    const nonce = randomUUID();
    const hashed = createHash("sha256").update(nonce).digest("hex");
    const res = await social({
      provider: "apple",
      idToken: { token: await appleToken({ nonce: hashed }), nonce, user: { name: { firstName: "José", lastName: "López" } } },
    });
    expect(res.status).toBe(200);
    const me = await request(app).get("/api/me").set(bearer(String(res.headers["set-auth-token"])));
    expect(me.body.data.name).toBe("José López");
  });

  it("rechaza un nonce que no coincide", async () => {
    const res = await social({
      provider: "apple",
      idToken: { token: await appleToken({ nonce: createHash("sha256").update("uno").digest("hex") }), nonce: "otro" },
    });
    expect(res.status).toBe(401);
  });

  it("rechaza tokens de Google presentados como de Apple", async () => {
    const res = await social({ provider: "apple", idToken: { token: await googleToken() } });
    expect(res.status).toBe(401);
  });
});
