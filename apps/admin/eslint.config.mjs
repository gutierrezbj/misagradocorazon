// ESLint del panel (SDD-06: ESLint + Prettier; SDD-08: lint en las cuatro partes del monorepo).
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config({ ignores: ["dist/", "coverage/"] }, js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, {
  languageOptions: { globals: globals.browser },
});
