import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.next/**", "**/coverage/**", "**/.pnpm/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    rules: {
      // Baseline TS rules (reasonable)
      ...tsPlugin.configs.recommended.rules,

      // Import ordering is nice, but shouldn't break your life
      "import/order": [
        "warn",
        {
          groups: [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]],
          "newlines-between": "always",
        },
      ],

      // ---- Relaxations for real-world TS libraries ----
      // These are the ones currently blocking you.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-unnecessary-type-constraint": "off",

      // Underscore-unused is a common pattern for interface conformance
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
