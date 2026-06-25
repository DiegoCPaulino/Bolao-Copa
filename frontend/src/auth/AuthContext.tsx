import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import * as authApi from "@/api/auth";
import { aoReceber401 } from "@/api/client";

/**
 * Estado de autenticação derivado do backend (cookie httpOnly — o JS não lê o cookie):
 * o boot consulta GET /me (200 = logado; 401 = deslogado). O 401 também é tratado
 * centralmente (qualquer chamada que receba 401 marca "deslogado" → o wrapper de rota
 * redireciona). O front SÓ consome (CLAUDE.md §3.1).
 */
type Estado = "carregando" | "logado" | "deslogado";

type ContextoAuth = {
  estado: Estado;
  login: (senha: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Contexto = createContext<ContextoAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>("carregando");

  useEffect(() => {
    // 401 em QUALQUER requisição (sessão ausente/expirada) → deslogado, num só lugar.
    aoReceber401(() => setEstado("deslogado"));
    authApi
      .me()
      .then(() => setEstado("logado"))
      .catch(() => setEstado("deslogado"));
  }, []);

  async function login(senha: string) {
    await authApi.login(senha);
    setEstado("logado");
  }

  async function logout() {
    await authApi.logout();
    setEstado("deslogado");
  }

  return <Contexto.Provider value={{ estado, login, logout }}>{children}</Contexto.Provider>;
}

export function useAuth(): ContextoAuth {
  const ctx = useContext(Contexto);
  if (!ctx) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  }
  return ctx;
}
