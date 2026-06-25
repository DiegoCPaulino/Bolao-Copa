import { z } from "zod";

/**
 * Validação de Rodadas — na CASCA dos adaptadores (CLAUDE.md §3.1), em pasta NEUTRA
 * `schemas/` (fonte única CLI + HTTP). Os enums espelham `schema.prisma`
 * (FaseRodada/EstadoRodada); o Zod precisa da lista literal para validar em runtime.
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

/**
 * Corpo do HTTP `PUT /rodadas/:id/estado`: o id vem da URL; o corpo traz o novo estado.
 * O estado é um GUIA, não uma trava (§3.7) — qualquer estado é aceito.
 */
export const definirEstadoInputSchema = z.object({
  estado: estadoRodadaSchema,
});
