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
  INTENTIONS_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "INTENTIONS_KEY debe ser 32 bytes en base64"),
  // Login con Google: ID de cliente OAuth de tipo "web". La app nativa pide el ID token con él,
  // así que es la audiencia que se verifica. El secreto no hace falta para el login nativo.
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  // Login con Apple nativo (iOS): bundle ID de la app, audiencia del ID token de Apple.
  APPLE_BUNDLE_ID: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
