import { dividirPote } from "../domain/premiacao.js";
import type { EstadoRodada, FaseRodada, RodadaResumo } from "../repositories/rodadaRepository.js";
import * as pagamentoService from "./pagamentoService.js";
import * as palpiteService from "./palpiteService.js";
import * as rodadaService from "./rodadaService.js";

/**
 * Serviço do Painel/Resumo geral — AGNÓSTICO de interface (CLAUDE.md §3.1). É pura
 * COMPOSIÇÃO: agrega o que os outros serviços já expõem (pagamentos derivados,
 * rodadas, pendências) e NÃO calcula nada novo. Por isso é a última fatia.
 */

export type ResumoPagamentos = {
  pagos: number;
  total: number;
  esperado: number;
  recebido: number;
  falta: number;
  // Divisão do pote 75/25 (derivada, nunca armazenada). "Atual" = sobre o recebido;
  // "potencial" = sobre o esperado. Esta é a tela PRIVADA do organizador, então
  // mostra os dois lados (premiação E o ganho dele) — diferente do export do grupo.
  premiacaoAtual: number;
  ganhoAtual: number;
  premiacaoPotencial: number;
  ganhoPotencial: number;
};

export type ResumoRodadaAtual = {
  id: string;
  fase: FaseRodada;
  ordem: number;
  estado: EstadoRodada;
  jogos: number;
  palpitaram: number;
  totalParticipantes: number;
};

export type ResumoGeral = {
  pagamentos: ResumoPagamentos;
  rodadaAtual: ResumoRodadaAtual | null;
};

export async function gerarResumo(): Promise<ResumoGeral> {
  const { participantes, totais } = await pagamentoService.listarPagamentos();
  const atual = dividirPote(totais.recebido);
  const potencial = dividirPote(totais.esperado);
  const pagamentos: ResumoPagamentos = {
    pagos: participantes.filter((p) => p.status === "PAGO").length,
    total: participantes.length,
    esperado: totais.esperado,
    recebido: totais.recebido,
    falta: totais.falta,
    premiacaoAtual: atual.premiacao,
    ganhoAtual: atual.organizador,
    premiacaoPotencial: potencial.premiacao,
    ganhoPotencial: potencial.organizador,
  };

  return { pagamentos, rodadaAtual: await resumirRodadaAtual(participantes.length) };
}

async function resumirRodadaAtual(totalParticipantes: number): Promise<ResumoRodadaAtual | null> {
  const atual = escolherRodadaAtual(await rodadaService.listarRodadas());
  if (!atual) {
    return null;
  }
  // "Palpitou" = tem ao menos um palpite na rodada (pendentes = zero palpites).
  const pendentes = await palpiteService.participantesPendentes(atual.id);
  return {
    id: atual.id, // o back JÁ escolheu a rodada; expõe o id p/ o Painel atalhar sem lookup
    fase: atual.fase,
    ordem: atual.ordem,
    estado: atual.estado,
    jogos: atual._count.jogos,
    palpitaram: totalParticipantes - pendentes.length,
    totalParticipantes,
  };
}

/**
 * "Rodada atual" (lacuna do documento — CLAUDE.md §15.4): a de MAIOR ordem que ainda
 * NÃO está ENCERRADA (a que está em jogo agora); se todas encerradas, a última (maior
 * ordem). Sem rodadas, não há atual.
 */
function escolherRodadaAtual(rodadas: ReadonlyArray<RodadaResumo>): RodadaResumo | null {
  if (rodadas.length === 0) {
    return null;
  }
  const emAndamento = rodadas.filter((r) => r.estado !== "ENCERRADA");
  const candidatas = emAndamento.length > 0 ? emAndamento : rodadas;
  return candidatas.reduce((maior, r) => (r.ordem > maior.ordem ? r : maior));
}
