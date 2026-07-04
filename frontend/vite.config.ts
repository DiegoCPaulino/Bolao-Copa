import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vite + React + Tailwind v4 (plugin, sem postcss). Alias "@" → src/.
//
// Ligação front → API em dev: PROXY. O cliente usa base RELATIVA `/api` (ver api/client.ts),
// e o Vite (:5173) encaminha `/api/*` → http://localhost:3000 (o back). Assim o dev espelha
// a produção same-origin: o navegador só fala com :5173, o cookie de sessão (SameSite=Strict)
// passa, e o hot reload continua vivo. Em produção, o mesmo serviço serve o front + a API sob
// /api (sem proxy). O CORS do back segue ligado (inofensivo; só valeria se o front apontasse
// direto pra :3000 via VITE_API_URL).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
