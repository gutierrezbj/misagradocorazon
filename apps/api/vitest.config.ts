import { defineConfig } from "vitest/config";

// Tests de integración contra PostgreSQL real (msc_test). Nada de mocks de base de datos.
export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5433/msc_test?host=/tmp",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0123",
      BETTER_AUTH_URL: "http://localhost:8001",
      TRUSTED_ORIGINS: "http://localhost:8081",
      INTENTIONS_KEY: Buffer.alloc(32, 7).toString("base64"),
    },
  },
});
