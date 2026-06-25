import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vite + React + Tailwind v4 (plugin, sem postcss). Alias "@" → src/.
//
// Ligação front → API: DIRETA, via VITE_API_URL (http://localhost:3000), NÃO por proxy.
// O CORS do backend já libera esta origem com `credentials: true`, e o cliente HTTP da
// 7.2 usará `fetch(..., { credentials: "include" })`. Em dev funciona porque :5173 e
// :3000 são o MESMO site (SameSite ignora porta), então o cookie de sessão (SameSite=
// Strict) atravessa. Em produção cross-site, a política de cookie é revisitada (7.2/9).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    port: 5173,
  },
});
