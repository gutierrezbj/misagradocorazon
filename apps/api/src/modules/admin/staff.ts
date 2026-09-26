// Alta de cuentas de staff desde la línea de comandos (src/cli/create-staff.ts).
// Resuelve el arranque: el panel solo lo puede usar un superadmin, así que el primero se crea aquí.
import { STAFF_ROLES } from "@msc/shared";
import { z } from "zod";

import { auth } from "../../auth.ts";
import { prisma } from "../../db.ts";
import { audit } from "../../lib/audit.ts";

export type StaffRole = (typeof STAFF_ROLES)[number];

export const staffInputSchema = z.object({
  email: z.email().transform((e) => e.trim().toLowerCase()),
  name: z.string().trim().min(1).max(80).optional(),
  // Solo hace falta si la cuenta no existe. Si existe, la contraseña no se toca.
  password: z.string().min(8).optional(),
  role: z.enum(STAFF_ROLES).default("superadmin"),
});

export type StaffInput = z.input<typeof staffInputSchema>;

export type StaffResult =
  | { outcome: "created"; userId: string; role: StaffRole }
  | { outcome: "promoted"; userId: string; role: StaffRole; from: string; unblocked: boolean }
  | { outcome: "unchanged"; userId: string; role: StaffRole };

export class StaffError extends Error {}

export async function ensureStaff(raw: StaffInput): Promise<StaffResult> {
  const input = staffInputSchema.parse(raw);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (!existing) {
    if (!input.password) throw new StaffError("La cuenta no existe: hace falta una contraseña para crearla");
    if (!input.name) throw new StaffError("La cuenta no existe: hace falta un nombre para crearla");
    // Alta por Better Auth para que la contraseña se guarde con su mismo hash.
    const { user } = await auth.api.signUpEmail({
      body: { email: input.email, password: input.password, name: input.name },
    });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { role: input.role } });
      await audit(tx, user.id, "staff.bootstrap", "user", user.id, { role: input.role, via: "cli", created: true });
    });
    return { outcome: "created", userId: user.id, role: input.role };
  }

  if (existing.role === input.role && !existing.blocked) {
    return { outcome: "unchanged", userId: existing.id, role: input.role };
  }
  // Bajar de rol a un superadmin se hace desde el panel, que protege al último superadmin.
  if (existing.role === "superadmin" && input.role !== "superadmin") {
    throw new StaffError("La cuenta ya es superadmin: los cambios a la baja se hacen desde el panel");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: existing.id }, data: { role: input.role, blocked: false } });
    await audit(tx, existing.id, "staff.bootstrap", "user", existing.id, {
      via: "cli",
      from: { role: existing.role, blocked: existing.blocked },
      to: { role: input.role, blocked: false },
    });
  });
  return { outcome: "promoted", userId: existing.id, role: input.role, from: existing.role, unblocked: existing.blocked };
}
