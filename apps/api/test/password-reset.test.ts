// SDD-05 US-24: recuperar la contraseña con un código de 6 dígitos por email.
import request from "supertest";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { prisma } from "../src/db.ts";
import { env } from "../src/env.ts";
import { setMailTransport, type Mail } from "../src/lib/mail.ts";
import { app, bearer, resetDb, signUp } from "./helpers.ts";

let sent: Mail[] = [];
beforeEach(async () => {
  await resetDb();
  sent = [];
  setMailTransport({ send: async (m) => void sent.push(m) });
});
afterEach(() => setMailTransport(null));

// El envío no se espera en la petición (misma respuesta exista o no la cuenta): se espera aquí.
async function codeFor(email: string) {
  for (let i = 0; i < 50 && !sent.some((m) => m.to === email); i++) await new Promise((r) => setTimeout(r, 20));
  const mail = sent.find((m) => m.to === email);
  if (!mail) throw new Error("no llegó el email");
  return { mail, code: /: (\d{6})/.exec(mail.text)![1]! };
}

const requestCode = (email: string) => request(app).post("/api/auth/email-otp/request-password-reset").send({ email });
const reset = (email: string, otp: string, password: string) => request(app).post("/api/auth/email-otp/reset-password").send({ email, otp, password });
const signIn = (email: string, password: string) => request(app).post("/api/auth/sign-in/email").send({ email, password });

describe("recuperar contraseña (US-24)", () => {
  test("con el código de 6 dígitos cambia la contraseña y cierra las sesiones abiertas", async () => {
    const fiel = await signUp();
    const res = await requestCode(fiel.email);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    const { mail, code } = await codeFor(fiel.email);
    expect(mail.subject).toBe("Tu código para cambiar la contraseña");
    expect(mail.text).toContain("Caduca en 10 minutos");

    expect((await reset(fiel.email, code, "NuevaClave2026!")).status).toBe(200);
    // La sesión que había queda cerrada; la contraseña vieja ya no vale y la nueva sí.
    expect((await request(app).get("/api/me").set(bearer(fiel.token))).status).toBe(401);
    expect((await signIn(fiel.email, "Oracion2026!")).status).toBe(401);
    expect((await signIn(fiel.email, "NuevaClave2026!")).status).toBe(200);
    // El código es de un solo uso.
    expect((await reset(fiel.email, code, "OtraClave2026!")).status).toBe(400);
  });

  test("el email va en el idioma del fiel", async () => {
    const fiel = await signUp();
    await prisma.user.update({ where: { id: fiel.userId }, data: { language: "en" } });
    await requestCode(fiel.email);
    const { mail } = await codeFor(fiel.email);
    expect(mail.subject).toBe("Your code to change your password");
  });

  test("un email sin cuenta recibe la misma respuesta y no se envía nada", async () => {
    const res = await requestCode("nadie@example.com");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    await new Promise((r) => setTimeout(r, 200));
    expect(sent).toEqual([]);
  });

  test("tres intentos fallidos invalidan el código, aunque luego llegue el bueno", async () => {
    const fiel = await signUp();
    await requestCode(fiel.email);
    const { code } = await codeFor(fiel.email);
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 3; i++) expect((await reset(fiel.email, wrong, "NuevaClave2026!")).status).toBe(400);
    const blocked = await reset(fiel.email, code, "NuevaClave2026!");
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("TOO_MANY_ATTEMPTS");
    expect((await signIn(fiel.email, "Oracion2026!")).status).toBe(200);
  });

  test("la nueva contraseña cumple el mínimo de 8 caracteres", async () => {
    const fiel = await signUp();
    await requestCode(fiel.email);
    const { code } = await codeFor(fiel.email);
    const res = await reset(fiel.email, code, "corta");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("PASSWORD_TOO_SHORT");
  });

  test("el código se guarda cifrado con hash, nunca en claro", async () => {
    const fiel = await signUp();
    await requestCode(fiel.email);
    const { code } = await codeFor(fiel.email);
    const rows = await prisma.verification.findMany();
    expect(rows.length).toBe(1);
    expect(rows[0]!.value).not.toContain(code);
  });

  test("las demás rutas del plugin (entrar sin contraseña, verificar o cambiar el email) están desactivadas", async () => {
    const fiel = await signUp();
    for (const path of [
      "/api/auth/sign-in/email-otp",
      "/api/auth/email-otp/send-verification-otp",
      "/api/auth/email-otp/check-verification-otp",
      "/api/auth/email-otp/verify-email",
      "/api/auth/email-otp/request-email-change",
      "/api/auth/email-otp/change-email",
      "/api/auth/forget-password/email-otp",
    ]) {
      const res = await request(app).post(path).set(bearer(fiel.token)).send({ email: fiel.email, otp: "123456", type: "sign-in" });
      expect(res.status, path).toBe(404);
    }
    expect(sent).toEqual([]);
  });
});

describe("GET /api/features", () => {
  const saved = { ...env };
  afterEach(() => Object.assign(env, saved));

  test("dice si la app puede ofrecer recuperar la contraseña", async () => {
    expect((await request(app).get("/api/features")).body.data).toEqual({ passwordReset: true });
    Object.assign(env, { SMTP_URL: undefined });
    expect((await request(app).get("/api/features")).body.data).toEqual({ passwordReset: false });
  });
});
