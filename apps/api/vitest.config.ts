import { defineConfig } from "vitest/config";

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
        "src/auth.ts": { lines: 80, statements: 80 },
        "src/middleware/{require-user,roles}.ts": { lines: 80, statements: 80 },
        "src/modules/users/**": { lines: 80, statements: 80 },
        "src/modules/candles/**": { lines: 80, statements: 80 },
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
    },
  },
});
