import type { StatusPagamento } from "../pagamento.js";
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
 * Premiação para o texto do GRUPO: só os 75% (atual e potencial), JÁ calculados.
 * Os 25% do organizador NUNCA entram aqui — este texto vai para o grupo, e a fatia
 * dele é assunto privado (visível só no Resumo geral). Ver `dividirPote`.
 */
export type PremiacaoPagamento = {
  premiacaoAtual: number;
  premiacaoPotencial: number;
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
 *   🏆 *Prêmio*: R$ <atual> / R$ <potencial>
 *
 * Função PURA. Recebe os participantes com o `valorAPagar` pronto e a `premiacao`
 * JÁ calculada — não recalcula nada (CLAUDE.md §3.3, §10).
 *
 * Layout em lista (em vez do texto corrido anterior): com ~63 participantes uma
 * linha por pessoa é muito mais legível no celular do que uma frase enorme com
 * vírgulas. O valor de cada item passa por `reais()` ("R$ 35").
 *
 * Seção vazia: OMITIDA por completo (cabeçalho + itens). Se ninguém estiver
 * "Pago", o bloco "✅ *Pagos*" simplesmente não aparece — evita um cabeçalho
 * solto sem itens. A linha de prêmio sempre aparece.
 *
 * Rodapé do GRUPO = só a PREMIAÇÃO (os 75%), no formato "atual / potencial".
 * Trocamos a antiga linha "Esperado/Recebido/Falta" por ela de propósito: o pote
 * bruto e a fatia de 25% do organizador são assunto privado (Resumo geral), nunca
 * vão para o grupo.
 */
export function formatarPagamentos(
  participantes: ReadonlyArray<ParticipantePagamento>,
  premiacao: PremiacaoPagamento,
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
  const premioLinha = `🏆 ${negrito("Prêmio")}: ${reais(premiacao.premiacaoAtual)} / ${reais(premiacao.premiacaoPotencial)}`;

  // Blocos separados por linha em branco; seções vazias (null) caem fora.
  return [`💰 ${negrito("PAGAMENTOS")}`, pagos, pendentes, premioLinha]
    .filter((bloco): bloco is string => bloco !== null)
    .join("\n\n");
}
