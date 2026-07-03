import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Paksa mode mock saat test, apa pun isi `.env` lokal (mis. VITE_SUPABASE_AUTH=true
    // di dev/prod). Tanpa ini, kehadiran `.env` membuat isAuthEnabled true → test
    // dual-mode mengambil cabang Supabase dan gagal.
    env: {
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
      VITE_SUPABASE_AUTH: "",
    },
  },
});
