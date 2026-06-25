import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "@/pages/Home";

/**
 * Roteador mínimo (Fatia 7.1) — uma rota de teste prova a base: React + Vite +
 * Tailwind + shadcn + roteamento. As telas de verdade (login, painel, ...) entram na
 * Fase 8; o cliente HTTP e o login, na 7.2. O front SÓ consome a API — não recalcula
 * regra nem formata texto de WhatsApp (CLAUDE.md §3.1).
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
