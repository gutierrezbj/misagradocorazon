// Tokens de Apple para poder revocarlos al borrar la cuenta (guideline 5.1.1(v)).
// - Tras entrar con Apple, la app manda el código de autorización; se canjea por un refresh token
//   que se guarda en la cuenta vinculada de Apple (Account.refreshToken, como hace Better Auth).
// - Al borrar la cuenta, el token pasa a apple_revocation en la misma transacción y se revoca
//   después. Si Apple falla, el worker reintenta: el borrado nunca espera a un tercero.
import * as Sentry from "@sentry/node";

import { prisma } from "../../db.ts";
import { HttpError } from "../../http.ts";
import { appleRevocationConfigured, exchangeAppleCode, revokeAppleToken } from "../../lib/apple.ts";

/** Devuelve false si la revocación no está configurada (sin clave de Apple no se guarda nada). */
export async function storeAppleAuthorization(userId: string, code: string): Promise<boolean> {
  if (!appleRevocationConfigured()) return false;
  const account = await prisma.account.findFirst({ where: { userId, providerId: "apple" } });
  if (!account) throw new HttpError(409, "no_apple_account", "La cuenta no está vinculada con Apple");
  let result: Awaited<ReturnType<typeof exchangeAppleCode>>;
  try {
    result = await exchangeAppleCode(code);
  } catch {
    throw new HttpError(400, "invalid_apple_code", "Código de Apple no válido");
  }
  // El código tiene que ser de la misma persona de Apple que tiene vinculada esta cuenta.
  // No se revoca ese token: según Apple, revocar anula toda la autorización de esa persona con la app.
  if (result.sub !== account.accountId) {
    throw new HttpError(400, "invalid_apple_code", "Código de Apple no válido");
  }
  // Cada login con Apple da un código nuevo: se guarda el último. El anterior no se revoca, porque
  // la revocación anula toda la autorización de la persona con la app (también el token nuevo).
  await prisma.account.update({ where: { id: account.id }, data: { refreshToken: result.refreshToken } });
  return true;
}

/** Revoca los tokens pendientes. `ids` limita a unos concretos (justo después de un borrado). */
export async function processAppleRevocations(ids?: string[]) {
  const pending = await prisma.appleRevocation.findMany({
    where: ids ? { id: { in: ids } } : {},
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  const out = { revoked: 0, failed: 0 };
  if (pending.length === 0 || !appleRevocationConfigured()) return out;
  for (const row of pending) {
    try {
      await revokeAppleToken(row.token);
      await prisma.appleRevocation.delete({ where: { id: row.id } });
      out.revoked += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.appleRevocation.update({ where: { id: row.id }, data: { attempts: { increment: 1 }, lastError: message } });
      out.failed += 1;
    }
  }
  if (out.failed > 0) Sentry.captureMessage(`Revocación de Apple: ${out.failed} pendientes con error`, "warning");
  return out;
}
