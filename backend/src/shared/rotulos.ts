import type { EstadoRodada, FaseRodada } from "@prisma/client";

/**
 * Rótulos de apresentação de fase/estado — NEUTROS (sem nada de terminal/HTTP), por
 * isso moram em `shared/` e são reusados pelos dois adaptadores: o CLI exibe nos menus
 * e o HTTP injeta o rótulo da fase nos formatadores de exportação (§12.x). Fonte ÚNICA
 * (CLAUDE.md §8.4): traduzir os enums num só lugar.
 */

export const FASE_LABEL: Record<FaseRodada, string> = {
  DEZESSEIS_AVOS: "16-avos de final",
  OITAVAS: "Oitavas de final",
  QUARTAS: "Quartas de final",
  SEMIFINAIS: "Semifinais",
  FINAL: "Rodada final (3º lugar + final)",
};

export const ESTADO_LABEL: Record<EstadoRodada, string> = {
  MONTADA: "Montada",
  PALPITES_ABERTOS: "Palpites abertos",
  RESULTADOS_EM_ANDAMENTO: "Resultados em andamento",
  ENCERRADA: "Encerrada",
};
