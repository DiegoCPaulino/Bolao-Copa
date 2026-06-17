/**
 * Forma mínima de um participante para exibição: nome e apelido opcional.
 * Vários artefatos do WhatsApp reaproveitam esta forma.
 */
export type ParticipanteExibivel = {
  nome: string;
  apelido?: string;
};

/**
 * Nome a exibir num artefato, desambiguando homônimos — funcional §27.
 *
 * DECISÃO DE EXIBIÇÃO (lacuna do documento — CLAUDE.md §15.4): o apelido só
 * aparece quando o nome se REPETE dentro de `listaExibida` (a lista efetivamente
 * mostrada no artefato). Nome único aparece sozinho; homônimo sem apelido também
 * (não há como desambiguar). Renderização escolhida: "Nome (apelido)".
 *
 * LIMITAÇÃO conhecida (§15.4, refinamento adiado para o serviço da Fase 5): a
 * desambiguação é relativa à `listaExibida`. Quando o artefato mostra apenas um
 * SUBCONJUNTO do elenco (ex.: só os pendentes), dois homônimos do elenco
 * completo podem não ser distinguidos se só um deles cair no subconjunto.
 * Decidir o universo de comparação é papel da camada de serviço, não deste puro.
 *
 * Função PURA. É O(n) por chamada (varre `listaExibida`), o que é irrelevante na
 * escala do bolão (<= 63 participantes).
 */
export function nomeExibicao(
  participante: ParticipanteExibivel,
  listaExibida: ReadonlyArray<{ nome: string }>,
): string {
  const ehHomonimo = listaExibida.filter((outro) => outro.nome === participante.nome).length > 1;
  return ehHomonimo && participante.apelido
    ? `${participante.nome} (${participante.apelido})`
    : participante.nome;
}
