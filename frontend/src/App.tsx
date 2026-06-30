import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { RotaProtegida } from "@/components/RotaProtegida";
import { Toaster } from "@/components/ui/sonner";
import { Login } from "@/pages/Login";
import { Pagamentos } from "@/pages/Pagamentos";
import { Painel } from "@/pages/Painel";
import { Participantes } from "@/pages/Participantes";
import { RodadaDetalhe } from "@/pages/RodadaDetalhe";
import { Rodadas } from "@/pages/Rodadas";

/**
 * Base do front (Fatia 7.2): /login pública + rotas do app sob o wrapper protegido
 * (sessão via cookie). As telas reais entram na Fase 8 (hoje são stubs). O front SÓ
 * consome a API — não recalcula regra nem formata WhatsApp (CLAUDE.md §3.1/§3.4).
 */
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RotaProtegida />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Painel />} />
              <Route path="/participantes" element={<Participantes />} />
              <Route path="/pagamentos" element={<Pagamentos />} />
              <Route path="/rodadas" element={<Rodadas />} />
              <Route path="/rodadas/:id" element={<RodadaDetalhe />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
      <Toaster />
    </BrowserRouter>
  );
}
