import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // `supabase/functions` = kode Deno (runtime Edge), bukan bagian build TS klien — lint terpisah.
  { ignores: ["dist", "node_modules", "*.config.{js,ts}", "supabase/functions"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  // Entry app: bukan modul komponen HMR — aturan fast-refresh tak relevan.
  { files: ["src/main.tsx"], rules: { "react-refresh/only-export-components": "off" } },
  prettier,
);
