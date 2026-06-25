import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

/**
 * Guarda das rotas do app: sem sessão (`deslogado`) → manda pro /login; com sessão →
 * libera (Outlet). Enquanto o /me do boot não respondeu, mostra um estado de carga —
 * assim não pisca o login antes de saber se já há sessão.
 */
export function RotaProtegida() {
  const { estado } = useAuth();

  if (estado === "carregando") {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (estado === "deslogado") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
