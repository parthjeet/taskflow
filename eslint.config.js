import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/mock-api",
              message: "Use '@/lib/api' and the adapter layer instead of direct mock-api imports.",
            },
            {
              name: "@/lib/mock-api.ts",
              message: "Use '@/lib/api' and the adapter layer instead of direct mock-api imports.",
            },
            {
              name: "@/lib/api/adapters/mock",
              message: "Use '@/lib/api' singleton instead of importing mock adapter directly in app code.",
            },
            {
              name: "@/lib/api/adapters/mock.ts",
              message: "Use '@/lib/api' singleton instead of importing mock adapter directly in app code.",
            },
          ],
          patterns: [
            {
              group: ["**/mock-api", "**/mock-api.ts"],
              message: "Use '@/lib/api' and the adapter layer instead of direct mock-api imports.",
            },
            {
              group: ["**/api/adapters/mock", "**/api/adapters/mock.ts"],
              message: "Use '@/lib/api' singleton instead of importing mock adapter directly in app code.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
);
