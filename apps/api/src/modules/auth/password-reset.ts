// Recuperar contraseña con un código por email (SDD-05 US-24). El código lo genera y verifica Better
// Auth (plugin email-otp); aquí solo se redacta el email en el idioma del fiel y se envía.
import * as Sentry from "@sentry/node";

import { prisma } from "../../db.ts";
import { mailTransport } from "../../lib/mail.ts";

export const RESET_CODE_MINUTES = 10;

const COPY = {
  es: {
    subject: "Tu código para cambiar la contraseña",
    text: (code: string) =>
      `Tu código para cambiar la contraseña de Mi Sagrado Corazón es: ${code}\n\n` +
      `Caduca en ${RESET_CODE_MINUTES} minutos. Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambia.`,
  },
  en: {
    subject: "Your code to change your password",
    text: (code: string) =>
      `Your code to change your Mi Sagrado Corazón password is: ${code}\n\n` +
      `It expires in ${RESET_CODE_MINUTES} minutes. If you did not request it, ignore this message: your password stays the same.`,
  },
} as const;

export async function sendPasswordResetCode(email: string, code: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { language: true } });
  const copy = COPY[user?.language === "en" ? "en" : "es"];
  await mailTransport().send({ to: email, subject: copy.subject, text: copy.text(code) });
}

// No se espera al envío: responder igual de rápido exista o no la cuenta (recomendación del plugin).
export function queuePasswordResetCode(email: string, code: string) {
  void sendPasswordResetCode(email, code).catch((err: unknown) => {
    console.error("email: no se pudo enviar el código", err);
    Sentry.captureException(err);
  });
}
