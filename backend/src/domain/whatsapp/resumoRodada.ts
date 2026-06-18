import { negrito } from "./formato.js";
import { nomeExibicao, type ParticipanteExibivel } from "./nomeExibicao.js";

/**
 * Linha do resumo da rodada: dados de exibição + pontos DA RODADA (só daquela
 * rodada). Distinto da classificação geral, que usa os pontos acumulados.
 */
export type LinhaResumoRodada = ParticipanteExibivel & {
  pontos: number;
};

/** Medalhas das 3 primeiras posições (§12.4); 4ª em diante não recebe medalha. */
const MEDALHAS = ["🥇", "🥈", "🥉"];

/**
 * Resumo da rodada para o WhatsApp — funcional §12.4:
 *
 *   🏁 *FIM DAS OITAVAS*
 *
 *   Pontos na rodada:
 *   🥇 Diego — 8 pts  🔥 destaque da rodada
 *   🥈 Lucas — 5 pts
 *   🥉 Ana — 3 pts
 *
 * Função PURA. Recebe a lista JÁ ORDENADA pelos pontos DA RODADA; não reordena
 * nem recalcula (CLAUDE.md §3.3, §10).
 *
 * SEM bloco monoespaçado e SEM padding: as linhas começam com emoji (largura
 * variável), que quebraria qualquer alinhamento por espaços — aqui os próprios
 * emojis estruturam (§12.4).
 *
 * DECISÃO (§15.4, marcada): mostramos TODOS os participantes — medalha nas 3
 * primeiras posições e linha simples da 4ª em diante (não só o pódio). O 🔥
 * "destaque da rodada" vai no 1º colocado.
 */
export function formatarResumoRodada(
  ranqueadosDaRodada: ReadonlyArray<LinhaResumoRodada>,
  faseLabel: string,
): string {
  const linhas = ranqueadosDaRodada.map((participante, indice) => {
    const nome = nomeExibicao(participante, ranqueadosDaRodada);
    const medalha = MEDALHAS[indice];
    const corpo = medalha
      ? `${medalha} ${nome} — ${participante.pontos} pts`
      : `${nome} — ${participante.pontos} pts`;
    return indice === 0 ? `${corpo}  🔥 destaque da rodada` : corpo;
  });

  return [`🏁 ${negrito(`FIM DAS ${faseLabel}`)}`, "", "Pontos na rodada:", ...linhas].join("\n");
}
