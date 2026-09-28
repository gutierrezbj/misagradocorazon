import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins/bearer";
import { emailOTP } from "better-auth/plugins/email-otp";

import { prisma } from "../../db.ts";
import { env } from "../../env.ts";
import { mailConfigured } from "../../lib/mail.ts";
import { CLIENT_IP_HEADER } from "../../middleware/limits.ts";
import { queuePasswordResetCode, RESET_CODE_MINUTES } from "./password-reset.ts";

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

// Recuperar contraseña con código por email (SDD-05 US-24), solo con email configurado. El plugin
// trae más rutas (entrar sin contraseña, verificar o cambiar el email) que no están en el alcance:
// se desactivan y solo quedan pedir el código y cambiar la contraseña.
const passwordReset = mailConfigured()
  ? [
      emailOTP({
        otpLength: 6,
        expiresIn: RESET_CODE_MINUTES * 60,
        allowedAttempts: 3,
        storeOTP: "hashed",
        disableSignUp: true,
        async sendVerificationOTP({ email, otp, type }) {
          if (type === "forget-password") queuePasswordResetCode(email, otp);
        },
      }),
    ]
  : [];

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins: env.TRUSTED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Al cambiar la contraseña con el código se cierran todas las sesiones abiertas (US-24).
  emailAndPassword: { enabled: true, minPasswordLength: 8, revokeSessionsOnPasswordReset: true },
  disabledPaths: [
    "/sign-in/email-otp",
    "/email-otp/send-verification-otp",
    "/email-otp/check-verification-otp",
    "/email-otp/verify-email",
    "/email-otp/request-email-change",
    "/email-otp/change-email",
    "/forget-password/email-otp", // obsoleta: la vigente es /email-otp/request-password-reset
  ],
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
  // IP real del cliente, resuelta por Express tras el proxy (ver middleware/limits.ts).
  advanced: { ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] } },
  // La app móvil envía la sesión como "Authorization: Bearer <token>" (cabecera set-auth-token).
  plugins: [bearer(), ...passwordReset],
});
