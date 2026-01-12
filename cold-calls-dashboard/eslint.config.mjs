import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["scripts/**/*.js"], // Target JavaScript files in the scripts directory
    rules: {
      "@typescript-eslint/no-require-imports": "off", // Disable the rule
      "@typescript-eslint/no-unused-vars": "off" // Also disable unused vars for scripts as they might be utility.
    },
  }
]);

export default eslintConfig;
