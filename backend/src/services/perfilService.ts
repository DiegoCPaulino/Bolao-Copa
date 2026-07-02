import { ParticipanteNaoEncontrado } from "../domain/erros.js";
import type { StatusPagamento } from "../domain/pagamento.js";
import type { FaseRodada } from "../repositories/rodadaRepository.js";
import * as pagamentoService from "./pagamentoService.js";
import * as participanteService from "./participanteService.js";
import * as resultadoService from "./resultadoService.js";

/**
 * Serviço do Perfil do participante (§12.4) — AGNÓSTICO de interface (CLAUDE.md §3.1) e
 * pura COMPOSIÇÃO (molde do `painelService`): JUNTA o que os serviços já expõem e NÃO
 * recalcula nada. Nada é armazenado — o perfil é 100% derivado na leitura (§3.2).
 *
 * Os 4 blocos: identidade + indicações (indicador/indicados) + pagamento (valor a pagar
 * derivado + status; isento tratado) + desempenho (totais, posição na geral e o
 * breakdown por rodada).
 */

/** Referência enxuta a um participante (para indicador/indicados). */
export type RefParticipante = { id: string; nome: string; apelido: string | null };

export type PerfilParticipante = {
  participante: RefParticipante;
  indicacoes: {
    indicador: RefParticipante | null;
    indicados: RefParticipante[];
  };
  pagamento: {
    isento: boolean;
    valorAPagar: number | null; // null quando isento (fora do universo de cobrança)
    status: StatusPagamento; // a VERDADE (status real gravado) — o perfil não maquia
    // Sinalizador CRU (§8.8): permite o perfil (visão interna) AVISAR que o participante
    // aparece como pago só na exportação — nunca mostra "pago" puro no lugar da verdade.
    exibirComoPago: boolean;
    // Override cru (fatia #4): != null → o valorAPagar veio do override; o perfil marca
    // "valor manual". Para isento, o override é ignorado (mostra "isento").
    valorCustomizado: number | null;
  };
  desempenho: {
    pontos: number;
    placaresExatos: number;
    resultadosCertos: number; // ≥1 (inclui exatos) — vivo p/ a cascata; telas não exibem
    empatesAcertados: number;
    vitoriasAcertadas: number;
    posicao: number;
    totalClassificados: number;
    porRodada: {
      rodadaId: string;
      fase: FaseRodada;
      ordem: number;
      pontos: number;
      placaresExatos: number;
      empatesAcertados: number;
      vitoriasAcertadas: number;
      decidida: boolean;
    }[];
  };
};

const ref = (p: { id: string; nome: string; apelido: string | null }): RefParticipante => ({
  id: p.id,
  nome: p.nome,
  apelido: p.apelido,
});

export async function montarPerfil(participanteId: string): Promise<PerfilParticipante> {
  const participante = await participanteService.buscarParticipante(participanteId);
  if (!participante) {
    throw new ParticipanteNaoEncontrado(participanteId);
  }

  // Uma leitura da lista resolve os DOIS lados da indicação: o indicador (já vem
  // resolvido por linha) e os indicados (filtrando quem tem este id como indicador).
  const todos = await participanteService.listarParticipantes();
  const eu = todos.find((p) => p.id === participanteId);
  const indicador = eu?.indicador ? ref(eu.indicador) : null;
  const indicados = todos.filter((p) => p.indicadorId === participanteId).map(ref);

  return {
    participante: ref(participante),
    indicacoes: { indicador, indicados },
    pagamento: await montarPagamento(participante),
    desempenho: await montarDesempenho(participanteId),
  };
}

/**
 * Pagamento do participante: valor a pagar (derivado) + status. Isentos ficam FORA do
 * `listarPagamentos` (o serviço já os exclui do universo de cobrança), então o isento
 * é detectado pela flag do próprio participante → valor a pagar não se aplica (null).
 */
async function montarPagamento(participante: {
  id: string;
  isento: boolean;
  status: StatusPagamento;
  exibirComoPago: boolean;
  valorCustomizado: number | null;
}): Promise<PerfilParticipante["pagamento"]> {
  if (participante.isento) {
    return {
      isento: true,
      valorAPagar: null,
      status: participante.status,
      exibirComoPago: participante.exibirComoPago,
      valorCustomizado: participante.valorCustomizado, // override ignorado p/ isento (tela mostra "isento")
    };
  }
  const { participantes } = await pagamentoService.listarPagamentos();
  const linha = participantes.find((p) => p.id === participante.id);
  return {
    isento: false,
    valorAPagar: linha?.valorAPagar ?? null,
    status: participante.status,
    exibirComoPago: participante.exibirComoPago,
    valorCustomizado: participante.valorCustomizado,
  };
}

/**
 * Desempenho: totais e posição vêm da classificação geral (já ordenada pela cascata —
 * a posição é o índice+1, NUNCA recalculada aqui); o breakdown por rodada vem do
 * `desempenhoPorRodada` (que agrega, não recalcula 3/1/0).
 */
async function montarDesempenho(participanteId: string): Promise<PerfilParticipante["desempenho"]> {
  const classificacao = await resultadoService.classificacaoGeral();
  const indice = classificacao.findIndex((l) => l.id === participanteId);
  const linha = indice >= 0 ? classificacao[indice] : undefined;
  const porRodada = await resultadoService.desempenhoPorRodada(participanteId);
  return {
    pontos: linha?.pontos ?? 0,
    placaresExatos: linha?.placaresExatos ?? 0,
    resultadosCertos: linha?.resultadosCertos ?? 0,
    empatesAcertados: linha?.empatesAcertados ?? 0,
    vitoriasAcertadas: linha?.vitoriasAcertadas ?? 0,
    posicao: indice + 1, // índice+1; -1+1 = 0 seria "não classificado" (não deve ocorrer)
    totalClassificados: classificacao.length,
    porRodada,
  };
}
