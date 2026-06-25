import { Button } from "@/components/ui/button";

/**
 * Página de teste da Fatia 7.1: só prova que o pipeline está de pé (Tailwind aplica
 * estilos; o Button do shadcn renderiza; o roteamento serve esta rota). Sem chamada de
 * API ainda — isso é da 7.2.
 */
export function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Bolão Copa 2026</h1>
      <p className="text-muted-foreground">
        Frontend no ar — Vite + React + Tailwind + shadcn/ui.
      </p>
      <Button>Botão do shadcn (Tailwind)</Button>
    </main>
  );
}
