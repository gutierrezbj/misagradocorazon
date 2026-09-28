import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8001),
  DATABASE_URL: z.string().min(1),
  // Secreto de Better Auth: mínimo 32 caracteres, distinto por entorno.
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  // Orígenes web permitidos (panel, web de la app), separados por comas.
  TRUSTED_ORIGINS: z.string().default(""),
  // Clave AES-256 en base64 (32 bytes) para cifrar las intenciones (GDPR art. 9).
  INTENTIONS_KEY: z.string().refine((v) => Buffer.from(v, "base64").length === 32, "INTENTIONS_KEY debe ser 32 bytes en base64"),
  // Login con Google: ID de cliente OAuth de tipo "web". La app nativa pide el ID token con él,
  // así que es la audiencia que se verifica. El secreto no hace falta para el login nativo.
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  // Login con Apple nativo (iOS): bundle ID de la app, audiencia del ID token de Apple.
  APPLE_BUNDLE_ID: z.string().min(1).optional(),
  // Revocación de tokens de Apple al borrar la cuenta (guideline 5.1.1(v)): clave de Sign in with
  // Apple (.p8) de la cuenta Apple Developer del fundador. APPLE_PRIVATE_KEY es el contenido del
  // .p8 (PEM); se admiten los saltos de línea escritos como \n. Sin las tres, no se revoca nada.
  APPLE_TEAM_ID: z.string().min(1).optional(),
  APPLE_KEY_ID: z.string().min(1).optional(),
  APPLE_PRIVATE_KEY: z
    .string()
    .min(1)
    .transform((v) => v.replace(/\\n/g, "\n"))
    .optional(),
  // Push: token de acceso de Expo, solo si se activa "enhanced security" en la cuenta de Expo.
  EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
  // Cloudflare R2 (medios: imágenes y audio). Cuenta a nombre del fundador. Sin ellas, el panel
  // no sube ficheros (se pueden pegar URLs). R2_PUBLIC_BASE_URL: dominio público del bucket.
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
  R2_PUBLIC_BASE_URL: z.url().optional(),
  // Email (SDD-05 US-24: recuperar contraseña). SMTP de cualquier proveedor, con cuenta a nombre del
  // fundador, p. ej. smtps://usuario:clave@smtp.proveedor.com:465. Sin las dos, la opción no aparece.
  SMTP_URL: z
    .string()
    .regex(/^smtps?:\/\//, "Debe empezar por smtp:// o smtps://")
    .optional(),
  MAIL_FROM: z.string().min(3).optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
