import { negrito } from "./formato.js";
import { nomeExibicao, type ParticipanteExibivel } from "./nomeExibicao.js";

/**
 * Pendências de palpite da rodada para o WhatsApp — funcional §12.8:
 *
 *   ⚠️ *FALTAM PALPITES — OITAVAS*
 *   Ainda não enviaram: Ana, João, Pedro
 *   Mandem antes do início dos jogos! ⏰
 *
 * Função PURA. Recebe a lista de quem AINDA NÃO palpitou já pronta (derivada por
 * `participantesSemPalpite` no domínio) e o rótulo da fase já formatado (ex.:
 * "OITAVAS"). Não busca nem calcula nada (CLAUDE.md §3.3).
 *
 * LIMITAÇÃO (§15.4, refinamento adiado para a Fase 5): a desambiguação usa o
 * próprio subconjunto de pendentes como universo. Dois homônimos do elenco
 * completo podem não ser distinguidos aqui se só um deles estiver pendente —
 * decidir o universo de comparação é papel do serviço. Ver `nomeExibicao`.
 */
export function formatarPendencias(
  pendentes: ReadonlyArray<ParticipanteExibivel>,
  faseLabel: string,
): string {
  const nomes = pendentes.map((participante) => nomeExibicao(participante, pendentes));
  return [
    `⚠️ ${negrito(`FALTAM PALPITES — ${faseLabel}`)}`,
    `Ainda não enviaram: ${nomes.join(", ")}`,
    "Mandem antes do início dos jogos! ⏰",
  ].join("\n");
}
