// Crea o asciende una cuenta de staff. Uso:
//   pnpm --filter @msc/api staff:create --email tu@correo.com --name "Juan" [--role superadmin|editor|moderator]
// Si la cuenta no existe, pide la contraseña sin mostrarla (o la lee de STAFF_PASSWORD).
// La contraseña nunca va como argumento: quedaría en el historial de la shell.
import { parseArgs } from "node:util";

import { STAFF_ROLES } from "@msc/shared";
import { z } from "zod";

import { prisma } from "../db.ts";
import { ensureStaff, StaffError, type StaffRole } from "../modules/admin/staff.ts";

function askHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) return Promise.reject(new StaffError("Sin terminal interactiva: pasa la contraseña en STAFF_PASSWORD"));
  return new Promise((resolve) => {
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") process.exit(130); // Ctrl+C
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      role: { type: "string", default: "superadmin" },
    },
  });
  if (!values.email) throw new StaffError("Falta --email");
  if (!STAFF_ROLES.includes(values.role as StaffRole)) {
    throw new StaffError(`--role debe ser uno de: ${STAFF_ROLES.join(", ")}`);
  }
  const role = values.role as StaffRole;

  const exists = await prisma.user.findUnique({ where: { email: values.email.trim().toLowerCase() }, select: { id: true } });
  let password: string | undefined;
  if (!exists) {
    password = process.env.STAFF_PASSWORD;
    if (!password) {
      password = await askHidden("Contraseña (mínimo 8 caracteres): ");
      const repeat = await askHidden("Repite la contraseña: ");
      if (password !== repeat) throw new StaffError("Las contraseñas no coinciden");
    }
  }

  const result = await ensureStaff({ email: values.email, name: values.name, password, role });
  switch (result.outcome) {
    case "created":
      console.log(`Cuenta creada con rol ${result.role} (id ${result.userId}).`);
      break;
    case "promoted":
      console.log(
        `Cuenta existente: ${result.from} → ${result.role}${result.unblocked ? ", desbloqueada" : ""}. La contraseña no se ha tocado.`,
      );
      break;
    case "unchanged":
      console.log(`La cuenta ya tenía el rol ${result.role}. Sin cambios.`);
      break;
  }
}

main()
  .catch((err: unknown) => {
    const message =
      err instanceof z.ZodError ? z.prettifyError(err) : err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
