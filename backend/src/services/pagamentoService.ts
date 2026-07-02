import { ParticipanteNaoEncontrado } from "../domain/erros.js";
import type { StatusPagamento, TotaisPagamento } from "../domain/pagamento.js";
import {
  calcularTotaisPagamento,
  resolverValorAPagar,
  statusPublico,
} from "../domain/pagamento.js";
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
  // Na visão REAL este é o status gravado (a verdade); na visão PÚBLICA, o status já
  // resolvido por `statusPublico`. Mesmo tipo, duas visões — quem decide é o chamador.
  status: StatusPagamento;
  // Sinalizador CRU (como `isento`): permite a tela INTERNA mostrar a verdade (status real)
  // e ainda AVISAR quem aparece como pago só na exportação. NÃO é a visão pública (§8.8).
  exibirComoPago: boolean;
  // Override do valor a pagar (INPUT cru): quando != null, o `valorAPagar` acima veio do
  // override (não da fórmula). A tela usa isto só para o marcador "valor manual".
  valorCustomizado: number | null;
};

export type ResumoPagamentos = {
  participantes: PagamentoParticipante[];
  totais: TotaisPagamento;
};

/**
 * Derivação ÚNICA e cara do quadro de cobrança (privada) — funcional §8.7/§8.8.
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
 *     desconto e piso).
 *
 * Nota sobre indicação × isenção: a contagem de indicados roda sobre TODOS (passo 2),
 * antes do filtro. Um indicado isento ENTROU no bolão, então continua abatendo R$ 5
 * do seu indicador (funcional §8.7) — a isenção tira o próprio isento da cobrança,
 * não desfaz a indicação que ele gerou.
 *
 * Os totais (esperado/recebido/falta) NÃO saem daqui: cada visão (real/pública)
 * escolhe o status a somar e chama a MESMA `calcularTotaisPagamento` (sem 2ª soma).
 */
async function derivarCobranca(): Promise<PagamentoParticipante[]> {
  const todos = await repo.listarTodos();
  const indicadosPorId = contarIndicadosDiretos(todos);

  return todos
    .filter((p) => !p.isento)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      apelido: p.apelido,
      // Override (INPUT) vence a fórmula; isento já saiu no filtro acima (isento > override).
      valorAPagar: resolverValorAPagar({
        valorCustomizado: p.valorCustomizado,
        qtdIndicadosDiretos: indicadosPorId.get(p.id) ?? 0,
      }),
      status: p.status,
      exibirComoPago: p.exibirComoPago,
      valorCustomizado: p.valorCustomizado,
    }));
}

/**
 * Quadro de pagamentos REAL — a VERDADE. Usado pelo painel, pelo CLI "listar" e pela
 * tabela do front. O `status` é o gravado; os totais somam só quem está PAGO de fato.
 */
export async function listarPagamentos(): Promise<ResumoPagamentos> {
  // A derivação base JÁ é a visão real: status gravado (verdade) + `exibirComoPago` cru
  // (que a tela interna usa para AVISAR, sem nunca mostrar "pago" puro para o maquiado).
  const participantes = await derivarCobranca();
  return { participantes, totais: calcularTotaisPagamento(participantes) };
}

/**
 * Quadro de pagamentos PÚBLICO — a visão de EXPORTAÇÃO para o grupo (funcional §8.8).
 *
 * Mesma derivação base, mas o status de cada participante passa por `statusPublico`
 * (um pendente marcado "exibir como pago" vira PAGO) e os totais saem da MESMA
 * `calcularTotaisPagamento`, agora alimentada com esses status públicos. Resultado:
 * as seções do texto (✅ Pagos / ⏳ Pendentes) E os números (recebido/falta → prêmio)
 * ficam consistentes — a soma não denuncia o truque (CLAUDE.md §7.4).
 *
 * SÓ a exportação usa esta visão; toda saída interna usa `listarPagamentos` (real).
 */
export async function listarPagamentosPublico(): Promise<ResumoPagamentos> {
  const participantes: PagamentoParticipante[] = (await derivarCobranca()).map((l) => ({
    ...l,
    status: statusPublico(l), // status PÚBLICO: pendente "exibido como pago" vira PAGO
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
