import { z } from "zod";

/**
 * Validação de Palpites — na CASCA dos adaptadores (CLAUDE.md §3.1), em pasta NEUTRA
 * `schemas/` (fonte única CLI + HTTP). Gols = placar de 90 min: inteiros >= 0 (empate
 * é palpite válido, §8.1).
 */

const golsSchema = z
  .number()
  .int("Gols devem ser inteiros.")
  .min(0, "Gols não podem ser negativos.");

const palpiteJogoSchema = z.object({
  jogoId: z.string().min(1),
  golsEsquerda: golsSchema,
  golsDireita: golsSchema,
});

export const registrarPalpitesInputSchema = z.object({
  rodadaId: z.string().min(1, "Selecione uma rodada."),
  participanteId: z.string().min(1, "Selecione um participante."),
  palpites: z.array(palpiteJogoSchema).min(1, "Informe ao menos um palpite."),
});

export type RegistrarPalpitesInput = z.infer<typeof registrarPalpitesInputSchema>;

/**
 * Corpo do HTTP `PUT /participantes/:pid/rodadas/:rid/palpites`: os ids vêm da URL,
 * então o corpo traz só os palpites. Reusa o `palpiteJogoSchema` (mesma validação).
 */
export const registrarPalpitesBodySchema = z.object({
  palpites: z.array(palpiteJogoSchema).min(1, "Informe ao menos um palpite."),
});
