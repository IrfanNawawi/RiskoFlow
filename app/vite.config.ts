import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vendor berat dipisah ke chunk sendiri agar di-cache lintas halaman & hanya
        // dimuat saat halaman yang memakainya diakses (lazy). `export-vendor`
        // (xlsx + jspdf) hanya ikut saat halaman ekspor dibuka.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // xlsx & jspdf di-`import()` dinamis dari @/lib/export → Rollup memisah otomatis,
          // dimuat hanya saat ekspor dijalankan. Tak perlu manualChunk khusus.
          if (/[\\/]node_modules[\\/](recharts|d3-|victory|internmap)/.test(id)) return "charts";
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|@tanstack)/.test(id)) return "react";
        },
      },
    },
  },
  server: { port: 5173 },
});
