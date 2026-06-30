import { api } from "./client";

// Camada de API de Resultados/Pontuação (Rodada-detalhe 8.4) — só endpoints já provados
// na 8.4-A. A tela só CONSOME: registra placar cru e LÊ os derivados (pontuação/resumo)
// que o back recalcula sob demanda. Nunca soma ponto, nunca ordena, nunca formata texto.

/** Placar (90 min) posicional — esquerda/direita só importam para o placar (2×1 ≠ 1×2). */
export type Placar = { golsEsquerda: number; golsDireita: number };

/** Pontos de um palpite: 3 (placar exato) / 1 (resultado certo) / 0 — vêm prontos do back. */
export type Pontos = 0 | 1 | 3;

/** Uma linha da classificação DA RODADA (derivada no back, já ordenada pela cascata). */
export type LinhaPontuacao = {
  id: string;
  nome: string;
  apelido: string | null;
  pontos: number;
  placaresExatos: number;
  resultadosCertos: number;
};

/** Um palpite no resumo do jogo, com os pontos JÁ calculados no back. */
export type PalpiteResumo = {
  nome: string;
  apelido: string | null;
  palpite: Placar;
  pontos: Pontos;
};

/** Resumo de um jogo decidido (§13.3): confronto + placar real + palpites pontuados. */
export type ResumoJogo = {
  ordem: number;
  esquerda: { nome: string; bandeira: string };
  direita: { nome: string; bandeira: string };
  resultado: Placar;
  palpites: PalpiteResumo[];
};

/**
 * Registra (ou corrige, §8.6) o placar real de um jogo. A RESPOSTA É IGNORADA de
 * propósito: a pontuação NÃO volta daqui (recálculo sob demanda) — quem chama re-busca
 * `pontosDaRodada`/`detalharRodada` para refletir o recálculo.
 */
export const registrarResultado = (jogoId: string, golsEsquerda: number, golsDireita: number) =>
  api.put<unknown>(`/jogos/${jogoId}/resultado`, { golsEsquerda, golsDireita });

/** Classificação DA RODADA (derivada, já ordenada pela cascata no back). */
export const pontosDaRodada = (rodadaId: string) =>
  api.get<LinhaPontuacao[]>(`/rodadas/${rodadaId}/pontuacao`);

/** Resumo de UM jogo (JSON) — só para jogo DECIDIDO (sem placar o back devolve 400). */
export const resumoJogo = (jogoId: string) => api.get<ResumoJogo>(`/jogos/${jogoId}/resumo`);

/** Exports (text/plain) PRONTOS do back — o front só copia (§13.3 jogo / §13.4 rodada). */
export const exportarResumoJogo = (jogoId: string) =>
  api.getTexto(`/jogos/${jogoId}/export/resumo`);
export const exportarResumoRodada = (rodadaId: string) =>
  api.getTexto(`/rodadas/${rodadaId}/export/resumo`);
