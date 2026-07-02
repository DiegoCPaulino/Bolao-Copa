import { monoBloco, negrito, preencherDireita } from "./formato.js";
import { nomeExibicao, type ParticipanteExibivel } from "./nomeExibicao.js";

/**
 * Linha da classificação geral: dados de exibição + pontos ACUMULADOS (pontos
 * corridos do torneio inteiro). Distinto do resumo da rodada, que usa os pontos
 * só daquela rodada.
 */
export type LinhaClassificacao = ParticipanteExibivel & {
  pontos: number;
};

/** Medalhas do pódio — rótulo das 3 primeiras posições (pela ORDEM da lista). */
const MEDALHAS = ["🥇", "🥈", "🥉"];

/**
 * Classificação geral para o WhatsApp — funcional §12.5:
 *
 *   📊 *CLASSIFICAÇÃO GERAL*
 *
 *   ```
 *   🥇 Diego — 21 pts
 *   🥈 Lucas — 18 pts
 *   🥉 Ana   — 15 pts
 *   4º João  — 12 pts
 *   ```
 *
 * Função PURA. Recebe a lista JÁ ORDENADA (de `ordenarClassificacao`) com os
 * pontos acumulados; NÃO reordena nem recalcula (CLAUDE.md §3.3, §10) — só troca o
 * RÓTULO das 3 primeiras posições por medalhas (o resto segue "4º, 5º…").
 *
 * O header em negrito fica FORA do bloco monoespaçado (dentro do bloco o negrito
 * não renderiza). As linhas vão no `monoBloco`, onde o padding alinha o "—" pela
 * largura em caracteres. (A medalha é um emoji: no monoespaçado a coluna alinha por
 * contagem de caracteres; a largura VISUAL do emoji pode variar por fonte — custo
 * cosmético aceito em troca do pódio destacado.)
 *
 * DECISÃO/deferimento (§15.4): a numeração é sequencial por índice. Posição
 * COMPARTILHADA em empate total (§8.5, critério 4) e ajuste manual do organizador
 * ficam para a camada de serviço (Fase 5).
 */
export function formatarClassificacaoGeral(ordenados: ReadonlyArray<LinhaClassificacao>): string {
  const linhas = ordenados.map((participante, indice) => ({
    posicao: MEDALHAS[indice] ?? `${indice + 1}º`,
    nome: nomeExibicao(participante, ordenados),
    pontos: participante.pontos,
  }));

  // Larguras fixas para alinhar o "—": tanto a posição (🥇 vs 63º) quanto o nome.
  const larguraPosicao = linhas.reduce((max, l) => Math.max(max, l.posicao.length), 0);
  const larguraNome = linhas.reduce((max, l) => Math.max(max, l.nome.length), 0);

  const rows = linhas.map(
    (l) =>
      `${preencherDireita(l.posicao, larguraPosicao)}  ${preencherDireita(l.nome, larguraNome)} — ${l.pontos} pts`,
  );

  const header = `📊 ${negrito("CLASSIFICAÇÃO GERAL")}`;
  return `${header}\n\n${monoBloco(rows.join("\n"))}`;
}
