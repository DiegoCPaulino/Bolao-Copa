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

/** Status de pagamento de um participante — funcional §8.8 (padrão PENDENTE). */
export type StatusPagamento = "PAGO" | "PENDENTE";

/**
 * Status PÚBLICO de um participante — funcional §8.8; CLAUDE.md §7.4.
 *
 * `status` é a VERDADE (Pago/Pendente); `exibirComoPago` é um override de
 * APRESENTAÇÃO que só vale na EXPORTAÇÃO do WhatsApp: o organizador quer que
 * alguém pendente apareça como pago no grupo sem mudar a verdade interna.
 *
 * Função PURA: a visão pública é DERIVADA (nunca armazenada). Quem decide usá-la é
 * a exportação; o painel/CLI/tabela usam o `status` real. Reusa a MESMA
 * `calcularTotaisPagamento`, agora alimentada com estes status públicos — assim
 * recebido/falta/prêmio ficam consistentes com as seções do texto (nada de segunda
 * função de soma).
 */
export function statusPublico(participante: {
  status: StatusPagamento;
  exibirComoPago: boolean;
}): StatusPagamento {
  return participante.status === "PAGO" || participante.exibirComoPago ? "PAGO" : "PENDENTE";
}

/** Totais agregados do bolão — funcional §8.8. Todos derivados, nunca armazenados. */
export type TotaisPagamento = {
  esperado: number;
  recebido: number;
  falta: number;
};

/**
 * Totais de pagamento do bolão — funcional §8.8:
 *   esperado = soma do valor a pagar de todos;
 *   recebido = soma do valor a pagar de quem está PAGO;
 *   falta    = esperado − recebido.
 *
 * Função PURA e derivada (CLAUDE.md §3.1, §7.4). Recebe o `valorAPagar` JÁ
 * calculado: calcular o valor (com desconto/piso) é responsabilidade separada
 * de `calcularValorAPagar`; aqui só somamos. O status é apenas informativo e
 * não toca pontuação nem classificação (§8.8).
 */
export function calcularTotaisPagamento(
  participantes: ReadonlyArray<{ valorAPagar: number; status: StatusPagamento }>,
): TotaisPagamento {
  let esperado = 0;
  let recebido = 0;
  for (const { valorAPagar, status } of participantes) {
    esperado += valorAPagar;
    if (status === "PAGO") {
      recebido += valorAPagar;
    }
  }
  return { esperado, recebido, falta: esperado - recebido };
}
