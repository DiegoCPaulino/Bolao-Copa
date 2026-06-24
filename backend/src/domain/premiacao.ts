import { FRACAO_PREMIACAO } from "./constantes.js";

/** Divisão do pote: o que vai para a premiação e o que fica com o organizador (R$). */
export type DivisaoPote = {
  premiacao: number;
  organizador: number;
};

/**
 * Divide o pote arrecadado em 75% premiação / 25% organizador — regra de negócio
 * (CLAUDE.md §3.2/§7.5). Função PURA e derivada: nunca é coluna no banco.
 *
 * INVARIANTE: `premiacao + organizador === total` sempre. Para garanti-la mesmo
 * quando 75% dá quebrado, arredondamos SÓ a premiação (`Math.round`) e damos ao
 * organizador o RESTO (`total - premiacao`). Dois arredondamentos independentes
 * poderiam perder ou criar R$ 1; o resto fecha a conta por construção.
 *
 * `Math.round` (meio para cima) basta aqui: os valores são inteiros em reais e a
 * escolha do arredondamento só muda o centavo de borda, sempre preservando a soma.
 */
export function dividirPote(total: number): DivisaoPote {
  const premiacao = Math.round(total * FRACAO_PREMIACAO);
  return { premiacao, organizador: total - premiacao };
}
