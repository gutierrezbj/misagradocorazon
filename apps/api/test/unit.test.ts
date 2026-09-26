import { describe, expect, test } from "vitest";

import { decryptText, encryptText } from "../src/lib/crypto.ts";
import { localDate, streakFromDates } from "../src/lib/dates.ts";

const KEY = Buffer.alloc(32, 7).toString("base64");

describe("racha de constancia", () => {
  test("cuenta días consecutivos hasta hoy", () => {
    expect(streakFromDates(["2026-09-26", "2026-09-25", "2026-09-24"], "2026-09-26")).toBe(3);
  });
  test("si hoy aún no ha rezado, la racha de ayer sigue viva", () => {
    expect(streakFromDates(["2026-09-25", "2026-09-24"], "2026-09-26")).toBe(2);
  });
  test("un día sin oración rompe la racha", () => {
    expect(streakFromDates(["2026-09-26", "2026-09-24"], "2026-09-26")).toBe(1);
  });
  test("sin oraciones la racha es 0", () => {
    expect(streakFromDates([], "2026-09-26")).toBe(0);
  });
  test("cruza meses", () => {
    expect(streakFromDates(["2026-10-01", "2026-09-30"], "2026-10-01")).toBe(2);
  });
});

describe("fecha local", () => {
  test("a las 03:00 UTC en Los Ángeles todavía es el día anterior", () => {
    expect(localDate(new Date("2026-09-26T03:00:00Z"), "America/Los_Angeles")).toBe("2026-09-25");
    expect(localDate(new Date("2026-09-26T03:00:00Z"), "Europe/Madrid")).toBe("2026-09-26");
  });
});

describe("cifrado de intenciones", () => {
  test("ida y vuelta", () => {
    const c = encryptText("Por la salud de mi madre", KEY);
    expect(c).not.toContain("madre");
    expect(decryptText(c, KEY)).toBe("Por la salud de mi madre");
  });
  test("dos cifrados del mismo texto son distintos", () => {
    expect(encryptText("a", KEY)).not.toBe(encryptText("a", KEY));
  });
  test("un texto manipulado no se descifra", () => {
    const [v, iv, tag, ct] = encryptText("Por mi familia", KEY).split(".");
    const tampered = [v, iv, tag, `${ct!.slice(0, -2)}AA`].join(".");
    expect(() => decryptText(tampered, KEY)).toThrow();
  });
});
