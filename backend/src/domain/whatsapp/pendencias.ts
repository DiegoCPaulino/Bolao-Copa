import { negrito } from "./formato.js";
import { nomeExibicao, type ParticipanteExibivel } from "./nomeExibicao.js";

/**
 * Pendências de palpite da rodada para o WhatsApp — funcional §13.8, em LISTA:
 *
 *   ⚠️ *FALTAM PALPITES — OITAVAS*
 *   • Ana
 *   • João
 *   • Pedro
 *   Mandem antes dos jogos! ⏰
 *
 * Função PURA. Recebe a lista de quem AINDA NÃO palpitou já pronta (derivada por
 * `participantesSemPalpite` no domínio) e o rótulo da fase já formatado (ex.:
 * "OITAVAS"). Não busca nem calcula nada (CLAUDE.md §3.3). Um nome por linha (marcador
 * "•"), em ordem ALFABÉTICA (apelido como desempate); apelido só desambigua homônimos
 * (via `nomeExibicao`).
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
  const ordenados = [...pendentes].sort(
    (a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR") ||
      (a.apelido ?? "").localeCompare(b.apelido ?? "", "pt-BR"),
  );
  const linhas = ordenados.map((p) => `• ${nomeExibicao(p, ordenados)}`);
  return [
    `⚠️ ${negrito(`FALTAM PALPITES — ${faseLabel}`)}`,
    ...linhas,
    "Mandem antes dos jogos! ⏰",
  ].join("\n");
}
