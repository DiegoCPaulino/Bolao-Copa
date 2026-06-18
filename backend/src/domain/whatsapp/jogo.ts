/**
 * Um lado de um jogo, como exibido nos artefatos: a seleção com seu nome e a
 * bandeira (emoji). Forma compartilhada pelos formatadores que mostram jogos
 * (mensagem da rodada §12.1 e resumo do jogo §12.3).
 *
 * Tipo de exibição, não o modelo físico de `Selecao`/`Jogo` (esse chega na Fase
 * 3). As posições esquerda/direita são POSICIONAIS (CLAUDE.md §3.5).
 */
export type LadoDoJogo = {
  nome: string;
  bandeira: string;
};
