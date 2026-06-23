import { z } from "zod";

/**
 * Validação da entrada do menu de Rodadas — na casca (CLAUDE.md §3.1), reusável pelo
 * HTTP na Entrega 2. Os enums espelham os de `schema.prisma` (FaseRodada/EstadoRodada);
 * o Zod precisa da lista literal para validar em runtime.
 */

export const faseRodadaSchema = z.enum([
  "DEZESSEIS_AVOS",
  "OITAVAS",
  "QUARTAS",
  "SEMIFINAIS",
  "FINAL",
]);

export const estadoRodadaSchema = z.enum([
  "MONTADA",
  "PALPITES_ABERTOS",
  "RESULTADOS_EM_ANDAMENTO",
  "ENCERRADA",
]);

/** Um jogo a montar: o par de seleções (ids). Posicional — sem mando de campo. */
const jogoSchema = z.object({
  selecaoEsquerdaId: z.string().min(1, "Selecione o time da esquerda."),
  selecaoDireitaId: z.string().min(1, "Selecione o time da direita."),
});

export const montarRodadaInputSchema = z.object({
  fase: faseRodadaSchema,
  jogos: z.array(jogoSchema).min(1, "A rodada precisa de pelo menos um jogo."),
});

export type MontarRodadaInput = z.infer<typeof montarRodadaInputSchema>;
