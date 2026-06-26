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

/**
 * Um jogo: o par de seleções (ids). Posicional — sem mando de campo. EXPORTADO para ser
 * reusado pela montagem incremental (CLI agora; tela 8.3 e HTTP depois): é o corpo de
 * `adicionarJogo`/`editarJogo`, com os ids da rodada/jogo vindo da URL no HTTP.
 */
export const jogoInputSchema = z.object({
  selecaoEsquerdaId: z.string().min(1, "Selecione o time da esquerda."),
  selecaoDireitaId: z.string().min(1, "Selecione o time da direita."),
});

export type JogoInput = z.infer<typeof jogoInputSchema>;

/** Criação de rodada VAZIA (montagem incremental): só a fase; os jogos entram depois. */
export const criarRodadaInputSchema = z.object({
  fase: faseRodadaSchema,
});

export const montarRodadaInputSchema = z.object({
  fase: faseRodadaSchema,
  jogos: z.array(jogoInputSchema).min(1, "A rodada precisa de pelo menos um jogo."),
});

export type MontarRodadaInput = z.infer<typeof montarRodadaInputSchema>;

/**
 * Corpo do HTTP `PUT /rodadas/:id/estado`: o id vem da URL; o corpo traz o novo estado.
 * O estado é um GUIA, não uma trava (§3.7) — qualquer estado é aceito.
 */
export const definirEstadoInputSchema = z.object({
  estado: estadoRodadaSchema,
});
