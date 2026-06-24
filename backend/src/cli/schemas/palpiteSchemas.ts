import { z } from "zod";

/**
 * Validação da entrada de palpites — na casca (CLAUDE.md §3.1), reusável pelo HTTP na
 * Entrega 2. Gols são placar de 90 min: inteiros >= 0 (empate é palpite válido, §8.1).
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
