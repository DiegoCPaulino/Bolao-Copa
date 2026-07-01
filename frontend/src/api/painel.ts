import { api } from "./client";
import type { Estado, Fase } from "./rodadas";

// Camada de API do Painel (Fatia 8.7) — a home/cockpit do organizador. Consome SÓ o
// GET /painel já existente: tudo (pagamentos agregados, premiação/ganho 75-25, rodada
// atual) vem DERIVADO do back. A tela só EXIBE — nunca soma, nunca divide o pote.

/**
 * Pagamentos num relance + a fatia do organizador. Esta é a visão PRIVADA: mostra os
 * DOIS lados do pote — premiação (75%) E o ganho do organizador (25%), atual/potencial.
 * "Atual" = sobre o recebido; "potencial" = sobre o esperado. O ganho nunca vaza para o
 * export do grupo (§8.9).
 */
export type ResumoPagamentos = {
  pagos: number;
  total: number;
  esperado: number;
  recebido: number;
  falta: number;
  premiacaoAtual: number;
  ganhoAtual: number;
  premiacaoPotencial: number;
  ganhoPotencial: number;
};

/** Rodada atual (a de maior ordem não-encerrada; se todas encerradas, a última). */
export type ResumoRodadaAtual = {
  id: string;
  fase: Fase;
  ordem: number;
  estado: Estado;
  jogos: number;
  palpitaram: number;
  totalParticipantes: number;
};

export type ResumoGeral = {
  pagamentos: ResumoPagamentos;
  rodadaAtual: ResumoRodadaAtual | null;
};

export const obterPainel = () => api.get<ResumoGeral>("/painel");
