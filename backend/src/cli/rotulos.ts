import type { EstadoRodada, FaseRodada } from "@prisma/client";

/**
 * Rótulos de apresentação compartilhados pelos menus (casca). Ficam aqui — e não
 * espalhados — porque mais de um menu precisa traduzir os enums de fase/estado para
 * um texto legível (CLAUDE.md §8.4: sem duplicação).
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
