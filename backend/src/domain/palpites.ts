/**
 * Referência mínima de um palpite: só o vínculo participante↔jogo. Para saber
 * QUEM palpitou, o placar (gols) é irrelevante — por isso o tipo é estrutural e
 * mínimo, e não o `Palpite` completo (que carrega o placar).
 */
export type VinculoPalpite = {
  participanteId: string;
  jogoId: string;
};

/**
 * Participantes que NÃO palpitaram na rodada — funcional §8.4 e §12.8
 * ("FALTAM PALPITES"). É um dado derivado (funcional §13): calculado na hora,
 * nunca armazenado (CLAUDE.md §3.1).
 *
 * DECISÃO DE DOMÍNIO (preenchimento de lacuna do documento — CLAUDE.md §15.4):
 * "não palpitou na rodada" é BINÁRIO = ter ZERO palpites entre os jogos da
 * rodada. Palpite parcial (faltando algum jogo) conta como "palpitou" e NÃO
 * aparece como falta. O artefato §12.8 lista pessoas, não jogos pendentes.
 *
 * Função PURA. O genérico `P` preserva o objeto de participante recebido (nome,
 * apelido, etc.), em vez de achatá-lo para só `{ id }`.
 */
export function participantesSemPalpite<P extends { id: string }>(
  jogoIdsDaRodada: ReadonlyArray<string>,
  participantes: ReadonlyArray<P>,
  palpites: ReadonlyArray<VinculoPalpite>,
): P[] {
  const jogosDaRodada = new Set(jogoIdsDaRodada);

  // Quem tem ao menos um palpite entre os jogos DESTA rodada.
  const palpitaramNaRodada = new Set(
    palpites
      .filter((palpite) => jogosDaRodada.has(palpite.jogoId))
      .map((palpite) => palpite.participanteId),
  );

  return participantes.filter((participante) => !palpitaramNaRodada.has(participante.id));
}
