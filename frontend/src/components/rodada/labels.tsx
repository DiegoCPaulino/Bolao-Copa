import type { Estado, Fase } from "@/api/rodadas";
import { cn } from "@/lib/utils";

// Rótulos de apresentação da rodada (o domínio é em pt-BR; aqui só formatamos) +
// o EstadoBadge. Compartilhados pela tela de Rodadas (8.3) e pela Rodada-detalhe (8.4)
// — DRY real, mesmo vocabulário visual nas duas.

export const FASES: Fase[] = ["DEZESSEIS_AVOS", "OITAVAS", "QUARTAS", "SEMIFINAIS", "FINAL"];

export const FASE_LABEL: Record<Fase, string> = {
  DEZESSEIS_AVOS: "16-avos de final",
  OITAVAS: "Oitavas de final",
  QUARTAS: "Quartas de final",
  SEMIFINAIS: "Semifinais",
  FINAL: "Final (3º + final)",
};

/** Sequência do ciclo de vida (guia) — usada no avançar/retroceder do drawer (8.3). */
export const ESTADOS_ORDEM: Estado[] = [
  "MONTADA",
  "PALPITES_ABERTOS",
  "RESULTADOS_EM_ANDAMENTO",
  "ENCERRADA",
];

export const ESTADO_LABEL: Record<Estado, string> = {
  MONTADA: "Montada",
  PALPITES_ABERTOS: "Palpites abertos",
  RESULTADOS_EM_ANDAMENTO: "Resultados em andamento",
  ENCERRADA: "Encerrada",
};

/** Pill de estado da rodada — MESMO vocabulário visual do StatusBadge (tokens centrais),
 *  próprio do domínio de rodada. Estado é EXIBIDO; nunca trava a edição de jogos. */
export function EstadoBadge({ estado }: { estado: Estado }) {
  const tom: Record<Estado, string> = {
    MONTADA: "bg-muted text-muted-foreground",
    PALPITES_ABERTOS: "bg-info-soft text-info",
    RESULTADOS_EM_ANDAMENTO: "bg-warning-soft text-warning",
    ENCERRADA: "bg-success-soft text-success",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tom[estado],
      )}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}
