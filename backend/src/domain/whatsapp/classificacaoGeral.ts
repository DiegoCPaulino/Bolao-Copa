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

/**
 * Classificação geral para o WhatsApp — funcional §12.5:
 *
 *   📊 *CLASSIFICAÇÃO GERAL* (após as Oitavas)
 *
 *   ```
 *   1º  Diego — 21 pts
 *   2º  Lucas — 18 pts
 *   3º  Ana   — 15 pts
 *   ```
 *
 * Função PURA. Recebe a lista JÁ ORDENADA (de `ordenarClassificacao`) com os
 * pontos acumulados; NÃO reordena nem recalcula (CLAUDE.md §3.3, §10).
 *
 * O header em negrito fica FORA do bloco monoespaçado (dentro do bloco o negrito
 * não renderiza). As linhas vão no `monoBloco`, onde o padding com espaços
 * realmente alinha o "—" (largura fixa, texto puro, sem emoji).
 *
 * DECISÃO/deferimento (§15.4): a numeração é sequencial por índice (1º, 2º, ...).
 * Posição COMPARTILHADA em empate total (§8.5, critério 4) e ajuste manual do
 * organizador ficam para a camada de serviço (Fase 5).
 *
 * `contextoLabel` é a frase de contexto sem parênteses (ex.: "após as Oitavas");
 * o formatador a envolve em "( )".
 */
export function formatarClassificacaoGeral(
  ordenados: ReadonlyArray<LinhaClassificacao>,
  contextoLabel: string,
): string {
  const linhas = ordenados.map((participante, indice) => ({
    posicao: `${indice + 1}º`,
    nome: nomeExibicao(participante, ordenados),
    pontos: participante.pontos,
  }));

  // Larguras fixas para alinhar o "—": tanto a posição (1º vs 63º) quanto o nome.
  const larguraPosicao = linhas.reduce((max, l) => Math.max(max, l.posicao.length), 0);
  const larguraNome = linhas.reduce((max, l) => Math.max(max, l.nome.length), 0);

  const rows = linhas.map(
    (l) =>
      `${preencherDireita(l.posicao, larguraPosicao)}  ${preencherDireita(l.nome, larguraNome)} — ${l.pontos} pts`,
  );

  const header = `📊 ${negrito("CLASSIFICAÇÃO GERAL")} (${contextoLabel})`;
  return `${header}\n\n${monoBloco(rows.join("\n"))}`;
}
