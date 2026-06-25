import { z } from "zod";

/**
 * Validação do placar real — na CASCA dos adaptadores (CLAUDE.md §3.1), em pasta
 * NEUTRA `schemas/` (fonte única CLI + HTTP). Gols = placar de 90 min: inteiros >= 0
 * (prorrogação/pênaltis não contam, §3.6).
 */

const golsSchema = z
  .number()
  .int("Gols devem ser inteiros.")
  .min(0, "Gols não podem ser negativos.");

export const registrarResultadoInputSchema = z.object({
  jogoId: z.string().min(1, "Selecione um jogo."),
  golsEsquerda: golsSchema,
  golsDireita: golsSchema,
});

export type RegistrarResultadoInput = z.infer<typeof registrarResultadoInputSchema>;

/**
 * Corpo do HTTP `PUT /jogos/:id/resultado`: o jogoId vem da URL, então o corpo traz só
 * o placar. Reusa o `golsSchema` (mesma regra de validação do CLI).
 */
export const resultadoBodySchema = z.object({
  golsEsquerda: golsSchema,
  golsDireita: golsSchema,
});
