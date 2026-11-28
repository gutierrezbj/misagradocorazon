// CSV para descargar desde el panel. Lleva BOM para que Excel lea bien los acentos, y escapa
// comillas, comas y saltos de línea. Una celda que empieza por =, +, - o @ se prefija con ' para
// que la hoja de cálculo no la ejecute como fórmula.
export function toCsv(header: string[], rows: (string | null | undefined)[][]): string {
  const cell = (v: string | null | undefined) => {
    let s = v ?? "";
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
