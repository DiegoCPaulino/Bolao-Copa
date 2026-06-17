/**
 * Participante com suas estatísticas JÁ calculadas, pronto para ser ordenado —
 * funcional §8.5.
 *
 * Esta camada só ORDENA. Somar pontos, contar placares exatos e resultados
 * certos (tratando palpite ausente como 0) é responsabilidade da agregação,
 * que entra depois. Aqui os números chegam prontos.
 *
 * `resultadosCertos` = palpites que pontuaram >= 1 ponto e INCLUI os exatos
 * (todo placar exato também é um resultado certo), conforme §8.5.
 */
export type ParticipanteClassificavel = {
  id: string;
  pontos: number;
  placaresExatos: number;
  resultadosCertos: number;
};

/**
 * Ordena a classificação pela cascata de desempate do funcional §8.5:
 *   1) maior pontuação total;
 *   2) maior número de placares exatos;
 *   3) maior número de resultados certos.
 * Persistindo o empate, a ordem de entrada é mantida (o sort do V8 é estável) —
 * a numeração de posição e o ajuste manual do organizador são de fases
 * posteriores, não desta função.
 *
 * Função PURA: copia antes de ordenar (`[...participantes]`) para não mutar o
 * array do chamador — `Array.prototype.sort` ordena no lugar. O parâmetro é
 * `ReadonlyArray` para o compilador barrar qualquer mutação acidental.
 */
export function ordenarClassificacao(
  participantes: ReadonlyArray<ParticipanteClassificavel>,
): ParticipanteClassificavel[] {
  return [...participantes].sort((a, b) => {
    if (a.pontos !== b.pontos) {
      return b.pontos - a.pontos;
    }
    if (a.placaresExatos !== b.placaresExatos) {
      return b.placaresExatos - a.placaresExatos;
    }
    // Critério 3 — redundante no sistema 3/1/0 atual: vale a identidade
    // resultadosCertos = pontos − 2×placaresExatos, então empate em pontos E em
    // exatos já implica empate em certos. Mantemos o critério mesmo assim, fiel
    // ao §8.5 e robusto a uma futura mudança na tabela de pontuação.
    return b.resultadosCertos - a.resultadosCertos;
  });
}
