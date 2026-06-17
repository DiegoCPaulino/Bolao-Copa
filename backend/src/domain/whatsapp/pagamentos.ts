import type { StatusPagamento, TotaisPagamento } from "../pagamento.js";
import { negrito, reais } from "./formato.js";
import { nomeExibicao } from "./nomeExibicao.js";

/**
 * Participante na forma que o artefato de pagamentos precisa: nome/apelido (para
 * desambiguar), valor a pagar JÁ calculado e status. Reusa `StatusPagamento` do
 * domínio de pagamento como fonte única do tipo.
 */
export type ParticipantePagamento = {
  nome: string;
  apelido?: string;
  valorAPagar: number;
  status: StatusPagamento;
};

/**
 * Pagamentos para o WhatsApp — funcional §12.7:
 *
 *   💰 *PAGAMENTOS*
 *
 *   ✅ Pagos: Nome (R$x), ...
 *   ⏳ Pendentes: Nome (R$y), ...
 *
 *   Esperado: R$ ... | Recebido: R$ ... | Falta: R$ ...
 *
 * Função PURA. Recebe os participantes com o `valorAPagar` pronto e os `totais`
 * JÁ calculados — não recalcula nada (CLAUDE.md §3.3, §10).
 *
 * Sobre o "|": a linha de totais usa a barra como separador LITERAL (como no
 * §12.7). "Sem tabela" significa sem sintaxe de tabela markdown, não banir o
 * caractere "|".
 *
 * Formatação do valor: nos itens usamos "R$35" (compacto, como no exemplo);
 * na linha de totais usamos `reais()` → "R$ 2.300" (com agrupamento de milhar).
 * A diferença é proposital e segue o §12.7 — itens nunca passam de R$ 40, então
 * não precisam de separador de milhar.
 */
export function formatarPagamentos(
  participantes: ReadonlyArray<ParticipantePagamento>,
  totais: TotaisPagamento,
): string {
  const item = (participante: ParticipantePagamento) =>
    `${nomeExibicao(participante, participantes)} (R$${participante.valorAPagar})`;

  const pagos = participantes.filter((p) => p.status === "PAGO").map(item);
  const pendentes = participantes.filter((p) => p.status === "PENDENTE").map(item);

  return [
    `💰 ${negrito("PAGAMENTOS")}`,
    "",
    `✅ Pagos: ${pagos.join(", ")}`,
    `⏳ Pendentes: ${pendentes.join(", ")}`,
    "",
    `Esperado: ${reais(totais.esperado)} | Recebido: ${reais(totais.recebido)} | Falta: ${reais(totais.falta)}`,
  ].join("\n");
}
