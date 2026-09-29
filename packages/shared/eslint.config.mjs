// ESLint del paquete compartido (SDD-06: ESLint + Prettier; SDD-08: lint en las cuatro partes del monorepo).
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, tseslint.configs.recommended, { languageOptions: { globals: globals.node } });
