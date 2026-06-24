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
 * Pagamentos para o WhatsApp — funcional §12.7, em LISTA (uma pessoa por linha):
 *
 *   💰 *PAGAMENTOS*
 *
 *   ✅ *Pagos*
 *   • Nome — R$ x
 *   • Nome — R$ y
 *
 *   ⏳ *Pendentes*
 *   • Nome — R$ z
 *
 *   Esperado: R$ ... | Recebido: R$ ... | Falta: R$ ...
 *
 * Função PURA. Recebe os participantes com o `valorAPagar` pronto e os `totais`
 * JÁ calculados — não recalcula nada (CLAUDE.md §3.3, §10).
 *
 * Layout em lista (em vez do texto corrido anterior): com ~63 participantes uma
 * linha por pessoa é muito mais legível no celular do que uma frase enorme com
 * vírgulas. O valor de cada item agora também passa por `reais()` ("R$ 35"),
 * unificando a formatação com a linha de totais.
 *
 * Seção vazia: OMITIDA por completo (cabeçalho + itens). Se ninguém estiver
 * "Pago", o bloco "✅ *Pagos*" simplesmente não aparece — evita um cabeçalho
 * solto sem itens. A linha de totais sempre aparece.
 *
 * Sobre o "|": a linha de totais usa a barra como separador LITERAL (como no
 * §12.7). "Sem tabela" significa sem sintaxe de tabela markdown, não banir o
 * caractere "|".
 */
export function formatarPagamentos(
  participantes: ReadonlyArray<ParticipantePagamento>,
  totais: TotaisPagamento,
): string {
  const item = (participante: ParticipantePagamento) =>
    `• ${nomeExibicao(participante, participantes)} — ${reais(participante.valorAPagar)}`;

  const secao = (
    cabecalho: string,
    membros: ReadonlyArray<ParticipantePagamento>,
  ): string | null => (membros.length === 0 ? null : [cabecalho, ...membros.map(item)].join("\n"));

  const pagos = secao(
    `✅ ${negrito("Pagos")}`,
    participantes.filter((p) => p.status === "PAGO"),
  );
  const pendentes = secao(
    `⏳ ${negrito("Pendentes")}`,
    participantes.filter((p) => p.status === "PENDENTE"),
  );
  const totaisLinha = `Esperado: ${reais(totais.esperado)} | Recebido: ${reais(totais.recebido)} | Falta: ${reais(totais.falta)}`;

  // Blocos separados por linha em branco; seções vazias (null) caem fora.
  return [`💰 ${negrito("PAGAMENTOS")}`, pagos, pendentes, totaisLinha]
    .filter((bloco): bloco is string => bloco !== null)
    .join("\n\n");
}
