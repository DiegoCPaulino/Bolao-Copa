import { negrito } from "./formato.js";
import { nomeExibicao, type ParticipanteExibivel } from "./nomeExibicao.js";

/**
 * Lista de participantes para o WhatsApp — funcional §12.6:
 *
 *   👥 *PARTICIPANTES (N)*
 *   1. Ana
 *   2. Diego
 *   3. João
 *
 * Função PURA. Sem tabela: header em negrito + LISTA NUMERADA (um por linha), em
 * ordem ALFABÉTICA. Ordena AQUI (não depende da ordem de entrada): por nome e, como
 * critério secundário, apelido — consistente com a desambiguação de homônimos, que
 * vive no helper compartilhado `nomeExibicao`.
 */
export function formatarListaParticipantes(
  participantes: ReadonlyArray<ParticipanteExibivel>,
): string {
  const ordenados = [...participantes].sort(
    (a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR") ||
      (a.apelido ?? "").localeCompare(b.apelido ?? "", "pt-BR"),
  );
  const linhas = ordenados.map(
    (participante, indice) => `${indice + 1}. ${nomeExibicao(participante, ordenados)}`,
  );
  const header = `👥 ${negrito(`PARTICIPANTES (${ordenados.length})`)}`;
  return `${header}\n${linhas.join("\n")}`;
}
