import { DESCONTO_POR_INDICACAO, PISO, VALOR_BASE } from "./constantes.js";

/**
 * Valor que um participante deve pagar, já com o desconto por indicação —
 * funcional §8.7; CLAUDE.md §7.3.
 *
 * Fórmula: `máximo(PISO, VALOR_BASE − DESCONTO_POR_INDICACAO × n)`. Cada indicado
 * direto que entrou abate R$ 5; o piso impede que o valor caia abaixo de R$ 5,
 * por mais indicações que existam.
 *
 * Função PURA e derivada: o valor a pagar nunca é coluna no banco — é sempre
 * recalculado a partir da contagem de indicados (CLAUDE.md §3.1).
 *
 * Recebe apenas a CONTAGEM de indicados diretos (assume `n >= 0`, pois é uma
 * contagem garantida pelo chamador). O que conta como "indicado direto que
 * entrou" é responsabilidade da agregação (Fase 5), não desta função.
 */
export function calcularValorAPagar(qtdIndicadosDiretos: number): number {
  const valorComDesconto = VALOR_BASE - DESCONTO_POR_INDICACAO * qtdIndicadosDiretos;
  return Math.max(PISO, valorComDesconto);
}
