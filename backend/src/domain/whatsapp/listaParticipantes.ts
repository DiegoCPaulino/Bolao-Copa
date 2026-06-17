import { negrito } from "./formato.js";

/**
 * Participante na forma mínima que este artefato precisa: nome e, opcionalmente,
 * apelido. Recebe a lista PRONTA — o formatador não busca nem calcula nada
 * (CLAUDE.md §3.3).
 */
export type ParticipanteListavel = {
  nome: string;
  apelido?: string;
};

/**
 * Lista de participantes para o WhatsApp — funcional §12.6:
 *
 *   👥 *PARTICIPANTES (N)*
 *   Nome, Nome, Nome, ...
 *
 * Função PURA. Sem tabela: só header em negrito + nomes separados por vírgula.
 *
 * DECISÃO DE EXIBIÇÃO (lacuna do documento — CLAUDE.md §15.4): o apelido existe
 * para diferenciar homônimos (funcional §27), então só aparece quando há >= 2
 * participantes com o MESMO nome. Nome único é exibido sozinho. Um homônimo sem
 * apelido cadastrado também aparece só com o nome (não há como desambiguar).
 * Renderização escolhida: "Nome (apelido)".
 */
export function formatarListaParticipantes(
  participantes: ReadonlyArray<ParticipanteListavel>,
): string {
  // Conta ocorrências de cada nome: só os repetidos precisam de apelido.
  const ocorrenciasPorNome = new Map<string, number>();
  for (const { nome } of participantes) {
    ocorrenciasPorNome.set(nome, (ocorrenciasPorNome.get(nome) ?? 0) + 1);
  }

  const nomes = participantes.map((participante) => {
    const ehHomonimo = (ocorrenciasPorNome.get(participante.nome) ?? 0) > 1;
    return ehHomonimo && participante.apelido
      ? `${participante.nome} (${participante.apelido})`
      : participante.nome;
  });

  const header = `👥 ${negrito(`PARTICIPANTES (${participantes.length})`)}`;
  return `${header}\n${nomes.join(", ")}`;
}
