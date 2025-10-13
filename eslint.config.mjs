import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";
import tseslint from "typescript-eslint";

const nextRecommendedRules = nextPlugin.configs.recommended.rules ?? {};
const nextCoreRules = nextPlugin.configs["core-web-vitals"].rules ?? {};

export default tseslint.config(
  {
    ignores: ["node_modules/**", ".next/**", "tmp_export/**", "dump.sql", "dist/**"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextRecommendedRules,
      ...nextCoreRules,
      "@next/next/no-img-element": "off",
    },
  },
);
