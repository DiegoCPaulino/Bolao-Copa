/** Stub de tela: a Fase 8 preenche cada uma. */
export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <p className="text-muted-foreground">Tela em construção (Fase 8).</p>
    </section>
  );
}
