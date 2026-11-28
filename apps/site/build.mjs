// Copia la web estática de public/ a dist/. No hay transpilado: el HTML, el CSS y el JS se publican tal cual.
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

rmSync(here("./dist"), { recursive: true, force: true });
cpSync(here("./public"), here("./dist"), { recursive: true });
console.log("dist/ listo");
