import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Links das telas da Fase 8 (stubs por ora). `fim` marca a rota exata "/" (Painel).
const LINKS = [
  { para: "/", rotulo: "Painel", fim: true },
  { para: "/participantes", rotulo: "Participantes", fim: false },
  { para: "/pagamentos", rotulo: "Pagamentos", fim: false },
  { para: "/rodadas", rotulo: "Rodadas", fim: false },
];

/**
 * Shell do app: cabeçalho com título + navegação + sair, e a área de conteúdo (Outlet).
 * Responsivo (§16): a navegação usa flex-wrap, confortável no mobile e no desktop.
 */
export function AppLayout() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 p-4">
          <span className="font-bold">🏆 Bolão Copa 2026</span>
          <nav className="flex flex-wrap gap-1">
            {LINKS.map((l) => (
              <NavLink
                key={l.para}
                to={l.para}
                end={l.fim}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm hover:bg-accent",
                    isActive && "bg-accent font-medium",
                  )
                }
              >
                {l.rotulo}
              </NavLink>
            ))}
          </nav>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => logout()}>
            Sair
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
