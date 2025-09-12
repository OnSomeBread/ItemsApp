import pluginJs from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactRefresh from "eslint-plugin-react-refresh";
import tailwind from "eslint-plugin-tailwindcss";
import eslintReact from "@eslint-react/eslint-plugin";

// import prettier from "eslint-plugin-prettier";
import { FlatCompat } from "@eslint/eslintrc";


const compat = new FlatCompat();

export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...compat.config(nextPlugin.configs["core-web-vitals"]),
  //...compat.config(eslintReact.configs["recommended-typescript"]),
  {
    ignores: ["node_modules", "public", ".next"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "react-refresh": reactRefresh,
      "tailwindcss": tailwind,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      ...tailwind.configs.recommended.rules,

      "@next/next/no-styled-jsx-in-document": "error",
      "@next/next/no-typos": "error",
      "@next/next/inline-script-id": "error",
      //"@next/next/optimized-images": "error",

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-alert": "error",
      "no-duplicate-imports": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "always"],

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
    settings: {
      tailwindcss: {
        config: false,
      },
    },
  },
];
