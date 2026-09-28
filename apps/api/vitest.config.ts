import { generateKeyPairSync } from "node:crypto";

import { defineConfig } from "vitest/config";

// Clave .p8 de Apple de pega, generada en cada ejecución: nunca hay una clave real en el repo.
const appleTestKey = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();

// Tests de integración contra PostgreSQL real (msc_test). Nada de mocks de base de datos.
export default defineConfig({
  test: {
    // SDD-07: 80 % en autenticación y pagos, 60 % en el resto. Fuera quedan los puntos de
    // arranque (servidor, worker, consola): solo cablean módulos que sí se prueban.
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/generated/**", "src/server.ts", "src/jobs/worker.ts", "src/cli/**"],
      reporter: ["text-summary"],
      thresholds: {
        lines: 60,
        statements: 60,
        "src/middleware/{require-user,roles}.ts": { lines: 80, statements: 80 },
        "src/modules/auth/**": { lines: 80, statements: 80 },
        "src/modules/ritual/candles.ts": { lines: 80, statements: 80 },
        "src/modules/payments/**": { lines: 80, statements: 80 },
      },
    },
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5433/msc_test?host=/tmp",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0123",
      BETTER_AUTH_URL: "http://localhost:8001",
      TRUSTED_ORIGINS: "http://localhost:8081",
      INTENTIONS_KEY: Buffer.alloc(32, 7).toString("base64"),
      // Login social: los tests firman sus propios ID tokens y sirven sus claves (test/social.test.ts).
      GOOGLE_CLIENT_ID: "msc-test.apps.googleusercontent.com",
      APPLE_BUNDLE_ID: "com.misagradocorazon.app",
      // Revocación de tokens de Apple (test/apple-revocation.test.ts): Apple se simula con fetch.
      APPLE_TEAM_ID: "TEAMTEST01",
      APPLE_KEY_ID: "KEYTEST001",
      APPLE_PRIVATE_KEY: appleTestKey.replace(/\n/g, "\\n"),
    },
  },
});
