import { z } from "zod";

/**
 * Validação do placar real — na casca (CLAUDE.md §3.1), reusável pelo HTTP na Entrega
 * 2. Gols são placar de 90 min: inteiros >= 0 (prorrogação/pênaltis não contam, §3.6).
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
