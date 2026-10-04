import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import pkg from "./package.json";

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // Relative asset URLs work under both app://gui/ and Capacitor's https://localhost/.
  base: "./",
  build: { outDir: "out/web", emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    // Capacitor copies index.html into android/, which would otherwise trigger a reload.
    watch: { ignored: ["**/android/**", "**/out/**", "**/release/**"] },
  },
});
