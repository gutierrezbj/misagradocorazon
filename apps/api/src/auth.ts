import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins/bearer";

import { prisma } from "./db.ts";
import { env } from "./env.ts";

// Solo se activan los proveedores con credenciales. Los dos entran por ID token nativo
// (POST /api/auth/sign-in/social con idToken): sin redirecciones ni cookies, encaja con el token Bearer.
const socialProviders = {
  ...(env.GOOGLE_CLIENT_ID && {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      ...(env.GOOGLE_CLIENT_SECRET && { clientSecret: env.GOOGLE_CLIENT_SECRET }),
    },
  }),
  ...(env.APPLE_BUNDLE_ID && {
    apple: { clientId: env.APPLE_BUNDLE_ID, appBundleIdentifier: env.APPLE_BUNDLE_ID },
  }),
};

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins: env.TRUSTED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  socialProviders,
  account: {
    accountLinking: {
      enabled: true,
      // Google y Apple verifican el email. Aun así, Better Auth solo enlaza con una cuenta
      // de email y contraseña si esa cuenta tiene el email verificado (evita el secuestro
      // de cuentas pre-registradas). Sin verificación de email en el MVP, esa persona
      // recibe OAUTH_LINK_ERROR y entra con su contraseña.
      trustedProviders: ["google", "apple"],
    },
  },
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
