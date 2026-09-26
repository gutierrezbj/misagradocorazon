// Tests de componentes (SDD-07: Jest + React Native Testing Library). Los tests estáticos de
// reglas (test/*.test.mjs) siguen con node --test.
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/test/components/**/*.test.tsx"],
  setupFiles: ["<rootDir>/test/components/setup.ts"],
};
