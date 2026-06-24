import { ParticipanteNaoEncontrado } from "../domain/erros.js";
import type { StatusPagamento, TotaisPagamento } from "../domain/pagamento.js";
import { calcularTotaisPagamento, calcularValorAPagar } from "../domain/pagamento.js";
import type { Participante } from "../repositories/participanteRepository.js";
import * as repo from "../repositories/participanteRepository.js";

/**
 * Serviço de Pagamentos — AGNÓSTICO de interface (CLAUDE.md §3.1). Reusa as funções
 * PURAS da Fase 1 (`calcularValorAPagar`, `calcularTotaisPagamento`); não duplica
 * regra nem fala com terminal/HTTP.
 *
 * PRINCÍPIO CENTRAL desta fatia (CLAUDE.md §3.2, §7.3, §7.4): valor a pagar e totais
 * são DERIVADOS — calculados aqui a cada leitura, NUNCA colunas. O único dado de
 * pagamento que se escreve é o `status` (Pago/Pendente).
 */

/** Linha de pagamento de um participante: status é gravado; `valorAPagar` é derivado. */
export type PagamentoParticipante = {
  id: string;
  nome: string;
  apelido: string | null;
  valorAPagar: number;
  status: StatusPagamento;
};

export type ResumoPagamentos = {
  participantes: PagamentoParticipante[];
  totais: TotaisPagamento;
};

/**
 * Calcula o quadro de pagamentos derivado de TODOS os participantes.
 *
 * Fluxo do derivado:
 *  1. lê todos os participantes (uma query) — cada um traz seu `indicadorId`;
 *  2. tabula, em memória, quantos indicam cada participante (indicação DIRETA: só
 *     `indicadorId === id`, sem cadeia; conta o indicado que ENTROU mesmo sem pagar,
 *     pois nada aqui olha o status do indicado — funcional §8.7);
 *  3. EXCLUI os isentos do universo de cobrança (não pagam, não somam nos totais,
 *     não aparecem no §12.7). O filtro mora AQUI, no serviço: as funções puras
 *     (`calcularValorAPagar`/`calcularTotaisPagamento`) não conhecem isenção e
 *     recebem só quem realmente paga (CLAUDE.md §3.1/§3.3);
 *  4. cada valor a pagar = `calcularValorAPagar(nº de indicados diretos)` (já aplica
 *     desconto e piso);
 *  5. os 3 totais saem de `calcularTotaisPagamento` sobre os valores derivados.
 *
 * Nota sobre indicação × isenção: a contagem de indicados roda sobre TODOS (passo 2),
 * antes do filtro. Um indicado isento ENTROU no bolão, então continua abatendo R$ 5
 * do seu indicador (funcional §8.7) — a isenção tira o próprio isento da cobrança,
 * não desfaz a indicação que ele gerou.
 */
export async function listarPagamentos(): Promise<ResumoPagamentos> {
  const todos = await repo.listarTodos();
  const indicadosPorId = contarIndicadosDiretos(todos);

  const participantes: PagamentoParticipante[] = todos
    .filter((p) => !p.isento)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      apelido: p.apelido,
      valorAPagar: calcularValorAPagar(indicadosPorId.get(p.id) ?? 0),
      status: p.status,
    }));

  return { participantes, totais: calcularTotaisPagamento(participantes) };
}

/**
 * Alterna o status de pagamento de um participante (Pago ⇄ Pendente) e persiste.
 * Status é só informativo (funcional §8.8): não toca pontuação nem classificação.
 */
export async function alternarStatus(participanteId: string): Promise<Participante> {
  const participante = await repo.buscarPorId(participanteId);
  if (!participante) {
    throw new ParticipanteNaoEncontrado(participanteId);
  }
  const novo: StatusPagamento = participante.status === "PAGO" ? "PENDENTE" : "PAGO";
  return repo.atualizarStatus(participanteId, novo);
}

/**
 * Tabela `idDoIndicador → quantos o indicam diretamente`. Só indicação DIRETA
 * (varremos `indicadorId`, sem seguir cadeia): o avô não herda o desconto dos
 * indicados dos seus indicados (funcional §8.7).
 */
function contarIndicadosDiretos(participantes: ReadonlyArray<Participante>): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const { indicadorId } of participantes) {
    if (indicadorId !== null) {
      contagem.set(indicadorId, (contagem.get(indicadorId) ?? 0) + 1);
    }
  }
  return contagem;
}
