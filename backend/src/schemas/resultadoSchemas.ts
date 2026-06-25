import { z } from "zod";
import { golsSchema } from "./comuns.js";

/**
 * Validação do placar real — na CASCA dos adaptadores (CLAUDE.md §3.1), em pasta
 * NEUTRA `schemas/` (fonte única CLI + HTTP). `golsSchema` (placar de 90 min, inteiro
 * >= 0; prorrogação/pênaltis não contam, §3.6) vem de `comuns.js`, compartilhado com
 * palpites.
 */

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
