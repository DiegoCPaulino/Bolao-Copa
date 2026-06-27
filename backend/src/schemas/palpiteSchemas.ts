import { z } from "zod";
import { golsSchema } from "./comuns.js";

/**
 * Validação de Palpites — na CASCA dos adaptadores (CLAUDE.md §3.1), em pasta NEUTRA
 * `schemas/` (fonte única CLI + HTTP). `golsSchema` (placar de 90 min, inteiro >= 0;
 * empate é válido, §8.1) vem de `comuns.js`, compartilhado com resultados.
 */

/** Um palpite (jogo + placar). EXPORTADO para ser reusado pelo registro SINGULAR
 *  (incremental) e pela futura tela, além do array do plural. */
export const palpiteJogoSchema = z.object({
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

/**
 * Registro SINGULAR (montagem incremental, jogo a jogo). O CLI valida a entrada inteira
 * (rodada + participante + 1 palpite); a futura tela usará o body abaixo (ids na URL).
 */
export const registrarPalpiteInputSchema = z.object({
  rodadaId: z.string().min(1, "Selecione uma rodada."),
  participanteId: z.string().min(1, "Selecione um participante."),
  jogoId: z.string().min(1, "Selecione um jogo."),
  golsEsquerda: golsSchema,
  golsDireita: golsSchema,
});

export type RegistrarPalpiteInput = z.infer<typeof registrarPalpiteInputSchema>;

/** Corpo do HTTP singular (futura tela): só o placar; rodada/participante/jogo na URL. */
export const registrarPalpiteBodySchema = z.object({
  golsEsquerda: golsSchema,
  golsDireita: golsSchema,
});
