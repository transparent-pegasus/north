import { createRequire } from "node:module";

import perfectionist from "eslint-plugin-perfectionist";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

const require = createRequire(import.meta.url);
const nextPlugin = require("@next/eslint-plugin-next");

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/out-debug/**",
      "**/build/**",
      "**/dist/**",
      "backend/lib/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      perfectionist,
      "unused-imports": unusedImports,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", next: "*", prev: ["const", "let", "var"] },
        {
          blankLine: "any",
          next: ["const", "let", "var"],
          prev: ["const", "let", "var"],
        },
        { blankLine: "always", next: "return", prev: "*" },
        { blankLine: "always", next: "*", prev: "directive" },
        { blankLine: "any", next: "directive", prev: "directive" },
      ],
      "perfectionist/sort-imports": [
        "error",
        {
          groups: [
            "type",
            ["builtin", "external"],
            "type-internal",
            "internal",
            ["type-parent", "type-sibling", "type-index"],
            ["parent", "sibling", "index"],
            "side-effect",
            "style",
            "unknown",
          ],
          order: "asc",
          type: "alphabetical",
        },
      ],
      "perfectionist/sort-objects": [
        "error",
        {
          order: "asc",
          type: "alphabetical",
        },
      ],
      "perfectionist/sort-variable-declarations": [
        "error",
        {
          order: "asc",
          type: "alphabetical",
        },
      ],
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
