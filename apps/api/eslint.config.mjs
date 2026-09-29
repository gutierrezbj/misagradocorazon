// ESLint de la API (SDD-06: ESLint + Prettier; SDD-08: lint en las cuatro partes del monorepo).
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["coverage/", "dist/", "src/generated/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  // Un "_" delante marca lo que se descarta a propósito (p. ej. quitar un campo con desestructuración).
  { rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }] } },
);
