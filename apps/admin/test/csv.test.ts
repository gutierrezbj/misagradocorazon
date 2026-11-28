import { expect, test } from "vitest";

import { toCsv } from "../src/csv.ts";

test("CSV con BOM, escapado y sin fórmulas", () => {
  const csv = toCsv(
    ["Nombre", "Correo"],
    [
      ["Pérez, Ana", 'a"b@x.com'],
      ["=HYPERLINK(1)", null],
    ],
  );
  expect(csv).toBe('﻿Nombre,Correo\r\n"Pérez, Ana","a""b@x.com"\r\n\'=HYPERLINK(1),\r\n');
});
