import { cn } from "@/lib/utils";

/**
 * Card de estatística (número em destaque) — só APRESENTAÇÃO: recebe o valor JÁ
 * formatado (a tela nunca calcula). Extraído de Pagamentos para ser reusado no Painel
 * (DRY real: mesmo componente, mesmo vocabulário visual nas duas telas). `tom` dá a
 * cor semântica opcional (recebido = success, falta = warning).
 */
export function StatCard({
  titulo,
  valor,
  tom,
}: {
  titulo: string;
  valor: string;
  tom?: "success" | "warning";
}) {
  const cor = tom === "success" ? "text-success" : tom === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className={cn("font-display text-2xl font-bold tabular-nums", cor)}>{valor}</p>
    </div>
  );
}
