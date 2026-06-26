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
 * Shell do app: top bar "placar" (faixa verde-escura + borda dourada) com título, navegação
 * e sair, e a área de conteúdo (Outlet). Compartilhado por todas as telas — a identidade
 * visual mora aqui e nos tokens, não em cada página.
 * Responsivo (§16): a navegação usa flex-wrap, confortável no mobile e no desktop.
 */
export function AppLayout() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b-4 border-gold bg-scoreboard text-scoreboard-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 p-4">
          <span className="font-display text-lg font-semibold uppercase tracking-wide">
            🏆 Bolão Copa 2026
          </span>
          <nav className="flex flex-wrap gap-1">
            {LINKS.map((l) => (
              <NavLink
                key={l.para}
                to={l.para}
                end={l.fim}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm text-scoreboard-foreground/80 transition-colors hover:bg-white/10 hover:text-scoreboard-foreground",
                    isActive && "bg-white/10 font-semibold text-gold hover:text-gold",
                  )
                }
              >
                {l.rotulo}
              </NavLink>
            ))}
          </nav>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto border-white/30 bg-transparent text-scoreboard-foreground hover:bg-white/10 hover:text-scoreboard-foreground"
            onClick={() => logout()}
          >
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
