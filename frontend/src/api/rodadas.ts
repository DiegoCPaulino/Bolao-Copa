import { api } from "./client";
import type { Selecao } from "./selecoes";

// Camada de API de Rodadas/Jogos — mesmo molde dos outros módulos. Consome SÓ os
// endpoints já provados na 8.3-A. Esta tela monta os CONFRONTOS; palpites, resultados e
// pontuação são a 8.4. Tudo passa pelo cliente central (credentials + 401 + ApiError).

export type Fase = "DEZESSEIS_AVOS" | "OITAVAS" | "QUARTAS" | "SEMIFINAIS" | "FINAL";
export type Estado = "MONTADA" | "PALPITES_ABERTOS" | "RESULTADOS_EM_ANDAMENTO" | "ENCERRADA";

/**
 * Jogo como a rodada detalhada devolve: posicional (esquerda/direita só importam para o
 * placar, 2×1 ≠ 1×2 — nunca mando de campo), já com as duas seleções resolvidas.
 */
export type Jogo = {
  id: string;
  ordem: number;
  selecaoEsquerdaId: string;
  selecaoDireitaId: string;
  golsEsquerdaReal: number | null;
  golsDireitaReal: number | null;
  selecaoEsquerda: Selecao;
  selecaoDireita: Selecao;
};

/** Rodada na listagem: com a contagem de jogos (para os cards). */
export type RodadaResumo = {
  id: string;
  fase: Fase;
  ordem: number;
  estado: Estado;
  _count: { jogos: number };
};

/** Rodada detalhada: com os jogos. É o que detalhar E toda mutação de jogo devolvem. */
export type RodadaDetalhada = {
  id: string;
  fase: Fase;
  ordem: number;
  estado: Estado;
  jogos: Jogo[];
};

/** PUT estado devolve a rodada SEM jogos (só o estado mudou) → o front faz MERGE do estado. */
export type Rodada = { id: string; fase: Fase; ordem: number; estado: Estado };

export const listarRodadas = () => api.get<RodadaResumo[]>("/rodadas");
export const detalharRodada = (id: string) => api.get<RodadaDetalhada>(`/rodadas/${id}`);

/** Cria a rodada VAZIA (corpo sem `jogos`) — montagem incremental; os jogos entram depois. */
export const criarRodada = (fase: Fase) => api.post<RodadaDetalhada>("/rodadas", { fase });

export const adicionarJogo = (rodadaId: string, selecaoEsquerdaId: string, selecaoDireitaId: string) =>
  api.post<RodadaDetalhada>(`/rodadas/${rodadaId}/jogos`, { selecaoEsquerdaId, selecaoDireitaId });

export const editarJogo = (jogoId: string, selecaoEsquerdaId: string, selecaoDireitaId: string) =>
  api.put<RodadaDetalhada>(`/jogos/${jogoId}`, { selecaoEsquerdaId, selecaoDireitaId });

/** DELETE → 200 + rodada detalhada (uniforme com add/editar). 409 (ApiError) se o jogo já tem palpites. */
export const removerJogo = (jogoId: string) => api.del<RodadaDetalhada>(`/jogos/${jogoId}`);

/** PUT estado (ciclo de vida = GUIA, §3.7). Devolve a rodada SEM jogos → atualizar só o estado. */
export const definirEstado = (id: string, estado: Estado) =>
  api.put<Rodada>(`/rodadas/${id}/estado`, { estado });

/** GET text/plain (artefato 13.1) — texto PRONTO do back; o front só copia. */
export const exportarMensagem = (id: string) => api.getTexto(`/rodadas/${id}/export/mensagem`);
