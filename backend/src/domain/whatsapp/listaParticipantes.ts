import { negrito } from "./formato.js";
import { nomeExibicao, type ParticipanteExibivel } from "./nomeExibicao.js";

/**
 * Lista de participantes para o WhatsApp — funcional §12.6:
 *
 *   👥 *PARTICIPANTES (N)*
 *   Nome, Nome, Nome, ...
 *
 * Função PURA. Sem tabela: só header em negrito + nomes separados por vírgula.
 * Recebe a lista PRONTA — não busca nem calcula nada (CLAUDE.md §3.3). A
 * desambiguação de homônimos vive no helper compartilhado `nomeExibicao`.
 */
export function formatarListaParticipantes(
  participantes: ReadonlyArray<ParticipanteExibivel>,
): string {
  const nomes = participantes.map((participante) => nomeExibicao(participante, participantes));
  const header = `👥 ${negrito(`PARTICIPANTES (${participantes.length})`)}`;
  return `${header}\n${nomes.join(", ")}`;
}
