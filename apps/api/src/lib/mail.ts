// Envío de email intercambiable: SMTP en real (cualquier proveedor, cuenta del fundador) y uno falso
// en los tests. Hoy solo lo usa la recuperación de contraseña (SDD-05 US-24).
import { createTransport, type Transporter } from "nodemailer";

import { env } from "../env.ts";

export type Mail = { to: string; subject: string; text: string };

export interface MailTransport {
  send(mail: Mail): Promise<void>;
}

class SmtpTransport implements MailTransport {
  private readonly transporter: Transporter;
  constructor(url: string) {
    this.transporter = createTransport(url);
  }
  async send(mail: Mail) {
    await this.transporter.sendMail({ from: env.MAIL_FROM, ...mail });
  }
}

/** Con SMTP y remitente configurados. Sin ellos no se ofrece recuperar la contraseña. */
export const mailConfigured = () => !!env.SMTP_URL && !!env.MAIL_FROM;

let transport: MailTransport | null = null;

export function mailTransport(): MailTransport {
  if (!env.SMTP_URL) throw new Error("SMTP_URL no configurado");
  transport ??= new SmtpTransport(env.SMTP_URL);
  return transport;
}

/** Solo para tests. */
export function setMailTransport(t: MailTransport | null) {
  transport = t;
}
