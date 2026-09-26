import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";

import { prisma } from "../src/db.ts";
import { app, bearer, resetDb, signUp, signUpAs } from "./helpers.ts";

beforeEach(resetDb);

describe("muro de intenciones", () => {
  test("una intención limpia se publica con nombre público y sin datos personales", async () => {
    const { token } = await signUpAs("user", "María Guadalupe Pérez");
    const post = await request(app).post("/api/intentions").set(bearer(token)).send({ text: "Por mi madre enferma", category: "salud" });
    expect(post.status).toBe(201);
    expect(post.body.data.status).toBe("approved");

    const list = await request(app).get("/api/intentions");
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ author: "María G.", text: "Por mi madre enferma", category: "salud", prayCount: 0 });
    const raw = JSON.stringify(list.body);
    expect(raw).not.toMatch(/userId|@example\.com/);
  });

  test("palabra filtrada, con o sin tilde, va a la cola y no se publica", async () => {
    const { token } = await signUp();
    const post = await request(app).post("/api/intentions").set(bearer(token)).send({ text: "Quitad la BRUJERÍA de mi casa" });
    expect(post.body.data.status).toBe("pending");
    const list = await request(app).get("/api/intentions");
    expect(list.body.data).toHaveLength(0);
  });

  test("filtro por categoría", async () => {
    const a = await signUp();
    const b = await signUp();
    await request(app).post("/api/intentions").set(bearer(a.token)).send({ text: "Por mi trabajo", category: "trabajo" });
    await request(app).post("/api/intentions").set(bearer(b.token)).send({ text: "Gracias", category: "agradecimiento" });
    const res = await request(app).get("/api/intentions?category=trabajo");
    expect(res.body.data.map((i: { text: string }) => i.text)).toEqual(["Por mi trabajo"]);
  });

  test("límite: una intención cada 30 s por persona", async () => {
    const { token } = await signUp();
    await request(app).post("/api/intentions").set(bearer(token)).send({ text: "Primera" });
    const second = await request(app).post("/api/intentions").set(bearer(token)).send({ text: "Segunda" });
    expect(second.status).toBe(429);
  });

  test("«Rezo por ti»: una vez por persona, contador correcto y marca propia", async () => {
    const author = await signUp();
    const a = await signUp();
    const b = await signUp();
    const post = await request(app).post("/api/intentions").set(bearer(author.token)).send({ text: "Por mi familia" });
    const id = post.body.data.id;
    const r1 = await request(app).post(`/api/intentions/${id}/pray`).set(bearer(a.token));
    const r2 = await request(app).post(`/api/intentions/${id}/pray`).set(bearer(a.token));
    const r3 = await request(app).post(`/api/intentions/${id}/pray`).set(bearer(b.token));
    expect([r1.body.data.prayCount, r2.body.data.prayCount, r3.body.data.prayCount]).toEqual([1, 1, 2]);

    const asA = await request(app).get("/api/intentions").set(bearer(a.token));
    const anon = await request(app).get("/api/intentions");
    expect(asA.body.data[0].alreadyPrayed).toBe(true);
    expect(anon.body.data[0].alreadyPrayed).toBe(false);
  });

  test("no se puede rezar por una intención no publicada", async () => {
    const author = await signUp();
    const other = await signUp();
    const post = await request(app).post("/api/intentions").set(bearer(author.token)).send({ text: "amuleto para la suerte" });
    const res = await request(app).post(`/api/intentions/${post.body.data.id}/pray`).set(bearer(other.token));
    expect(res.status).toBe(404);
  });
});

describe("intenciones privadas", () => {
  test("cifradas en la base, visibles solo para su autor", async () => {
    const a = await signUp();
    const b = await signUp();
    const post = await request(app).post("/api/me/intentions").set(bearer(a.token)).send({ text: "Por la conversión de mi hijo" });
    expect(post.status).toBe(201);

    const row = await prisma.privateIntention.findUniqueOrThrow({ where: { id: post.body.data.id } });
    expect(row.textEncrypted).not.toContain("hijo");

    const mine = await request(app).get("/api/me/intentions").set(bearer(a.token));
    const theirs = await request(app).get("/api/me/intentions").set(bearer(b.token));
    expect(mine.body.data[0].text).toBe("Por la conversión de mi hijo");
    expect(theirs.body.data).toHaveLength(0);

    const steal = await request(app).delete(`/api/me/intentions/${post.body.data.id}`).set(bearer(b.token));
    expect(steal.status).toBe(404);
    const del = await request(app).delete(`/api/me/intentions/${post.body.data.id}`).set(bearer(a.token));
    expect(del.status).toBe(200);
  });
});

describe("moderación", () => {
  test("permisos: user y editor no moderan; moderador y superadmin sí", async () => {
    const user = await signUpAs("user");
    const editor = await signUpAs("editor");
    const mod = await signUpAs("moderator");
    const sa = await signUpAs("superadmin");
    const codes = await Promise.all(
      [user, editor, mod, sa].map((u) => request(app).get("/api/admin/moderation/queue").set(bearer(u.token)).then((r) => r.status)),
    );
    expect(codes).toEqual([403, 403, 200, 200]);
  });

  test("aprobar desde la cola publica la intención y queda auditado", async () => {
    const author = await signUp();
    const mod = await signUpAs("moderator");
    const post = await request(app).post("/api/intentions").set(bearer(author.token)).send({ text: "Rezad contra la maldición" });
    const queue = await request(app).get("/api/admin/moderation/queue").set(bearer(mod.token));
    expect(queue.body.data.intentions).toHaveLength(1);

    const decide = await request(app)
      .post(`/api/admin/moderation/intentions/${post.body.data.id}`)
      .set(bearer(mod.token))
      .send({ action: "approve", reason: "Es una petición legítima" });
    expect(decide.body.data.status).toBe("approved");

    const list = await request(app).get("/api/intentions");
    expect(list.body.data).toHaveLength(1);
    const log = await prisma.adminAuditLog.findFirstOrThrow({ where: { entityId: post.body.data.id } });
    expect(log).toMatchObject({ actorId: mod.userId, action: "intention.approve" });
  });

  test("gestión de palabras: se normalizan y se aplican al momento", async () => {
    const mod = await signUpAs("moderator");
    const author = await signUp();
    const add = await request(app).post("/api/admin/moderation/words").set(bearer(mod.token)).send({ word: "Mal  Fario" });
    expect(add.body.data.word).toBe("mal fario");
    const post = await request(app).post("/api/intentions").set(bearer(author.token)).send({ text: "que se vaya el MAL FARIO" });
    expect(post.body.data.status).toBe("pending");
    const del = await request(app).delete("/api/admin/moderation/words/mal%20fario").set(bearer(mod.token));
    expect(del.status).toBe(200);
  });
});
