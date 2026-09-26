import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../src/db.ts";
import { ensureStaff, StaffError } from "../src/modules/admin/staff.ts";
import { app, bearer, resetDb, signUp } from "./helpers.ts";

beforeEach(resetDb);

describe("alta de staff por línea de comandos", () => {
  it("crea el primer superadmin, que entra en el panel", async () => {
    const r = await ensureStaff({ email: "Fundador@Example.com", name: "Juan", password: "Corazon2026!" });
    expect(r).toMatchObject({ outcome: "created", role: "superadmin" });

    const login = await request(app)
      .post("/api/auth/sign-in/email")
      .send({ email: "fundador@example.com", password: "Corazon2026!" });
    expect(login.status).toBe(200);
    const token = String(login.headers["set-auth-token"]);
    const users = await request(app).get("/api/admin/users").set(bearer(token));
    expect(users.status).toBe(200);

    const log = await prisma.adminAuditLog.findMany({ where: { entityId: r.userId } });
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ action: "staff.bootstrap", actorId: r.userId });
  });

  it("asciende una cuenta existente sin tocar su contraseña y la desbloquea", async () => {
    const u = await signUp();
    await prisma.user.update({ where: { id: u.userId }, data: { blocked: true } });

    const r = await ensureStaff({ email: u.email, role: "editor" });
    expect(r).toMatchObject({ outcome: "promoted", from: "user", role: "editor", unblocked: true });

    const login = await request(app).post("/api/auth/sign-in/email").send({ email: u.email, password: "Oracion2026!" });
    expect(login.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: u.userId } })).toMatchObject({ role: "editor", blocked: false });
  });

  it("es idempotente", async () => {
    await ensureStaff({ email: "admin@example.com", name: "Admin", password: "Corazon2026!" });
    const again = await ensureStaff({ email: "admin@example.com" });
    expect(again.outcome).toBe("unchanged");
    expect(await prisma.adminAuditLog.count()).toBe(1);
  });

  it("no crea cuentas sin contraseña ni baja de rol a un superadmin", async () => {
    await expect(ensureStaff({ email: "nuevo@example.com", name: "Nuevo" })).rejects.toBeInstanceOf(StaffError);
    await ensureStaff({ email: "admin@example.com", name: "Admin", password: "Corazon2026!" });
    await expect(ensureStaff({ email: "admin@example.com", role: "moderator" })).rejects.toBeInstanceOf(StaffError);
    expect(await prisma.user.findUnique({ where: { email: "admin@example.com" } })).toMatchObject({ role: "superadmin" });
  });

  it("rechaza contraseñas cortas y roles que no son de staff", async () => {
    await expect(ensureStaff({ email: "a@example.com", name: "A", password: "corta" })).rejects.toThrow();
    // @ts-expect-error: "user" no es un rol de staff
    await expect(ensureStaff({ email: "a@example.com", name: "A", password: "Corazon2026!", role: "user" })).rejects.toThrow();
    expect(await prisma.user.count({ where: { email: "a@example.com" } })).toBe(0);
  });
});
