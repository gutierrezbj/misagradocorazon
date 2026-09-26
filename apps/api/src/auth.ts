import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins/bearer";

import { prisma } from "./db.ts";
import { env } from "./env.ts";

const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
}
if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
  socialProviders.apple = { clientId: env.APPLE_CLIENT_ID, clientSecret: env.APPLE_CLIENT_SECRET };
}

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins: env.TRUSTED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  socialProviders,
  user: {
    additionalFields: {
      // input: false → el cliente no puede fijar su propio rol ni desbloquearse.
      role: { type: "string", defaultValue: "user", input: false },
      blocked: { type: "boolean", defaultValue: false, input: false },
    },
  },
  // La app móvil envía la sesión como "Authorization: Bearer <token>" (cabecera set-auth-token).
  plugins: [bearer()],
});
