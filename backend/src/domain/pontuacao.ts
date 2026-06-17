/**
 * Placar de um jogo no tempo normal (90 min) — funcional §8.1.
 *
 * As posições esquerda/direita são apenas POSICIONAIS (2x1 ≠ 1x2): não existe
 * "casa/fora" nem mando de campo no modelo (funcional §13; CLAUDE.md §3.5).
 */
export type Placar = {
  golsEsquerda: number;
  golsDireita: number;
};

/**
 * Pontos possíveis por jogo — funcional §8.2.
 *
 * União literal (e não `number`) de propósito: o tipo barra no compilador
 * qualquer retorno que não seja exatamente 0, 1 ou 3.
 */
export type Pontos = 0 | 1 | 3;

/**
 * Sinal da diferença de gols: > 0 vitória da esquerda, < 0 vitória da direita,
 * 0 empate. Colapsa o placar no "quem ganhou" para comparar palpite e
 * resultado sem nos perdermos nos números exatos.
 *
 * `Math.sign` devolve `number`, então mantemos esse tipo: estreitar para
 * `-1 | 0 | 1` exigiria um cast que o compilador não tem como verificar — e o
 * único uso aqui é uma comparação de igualdade, que `number` já atende.
 */
function desfecho({ golsEsquerda, golsDireita }: Placar): number {
  return Math.sign(golsEsquerda - golsDireita);
}

/**
 * Pontua um palpite contra o resultado real — regra 3/1/0 do funcional §8.2:
 *
 * - placar exato → 3;
 * - mesmo desfecho (vencedor certo OU empate), placar errado → 1;
 * - desfecho errado → 0.
 *
 * Função PURA: entram dados, sai um número; sem banco, HTTP, log ou efeito
 * colateral (CLAUDE.md §3.2). O palpite ausente NÃO é tratado aqui — quem não
 * palpitou simplesmente não tem palpite para pontuar; isso é responsabilidade
 * da camada de agregação (funcional §8.4).
 */
export function calcularPontos(palpite: Placar, resultado: Placar): Pontos {
  const placarExato =
    palpite.golsEsquerda === resultado.golsEsquerda &&
    palpite.golsDireita === resultado.golsDireita;
  if (placarExato) {
    return 3;
  }

  if (desfecho(palpite) === desfecho(resultado)) {
    return 1;
  }

  return 0;
}
