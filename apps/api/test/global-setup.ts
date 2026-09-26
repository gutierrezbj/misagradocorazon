import { execSync } from "node:child_process";

// Solo aplica migraciones pendientes (no destructivo). La limpieza entre tests la hace resetDb().
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5433/msc_test?host=/tmp";
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
