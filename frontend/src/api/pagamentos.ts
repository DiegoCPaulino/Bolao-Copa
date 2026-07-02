import { api } from "./client";

// Camada de API de Pagamentos — mesmo molde de api/participantes.ts. A tela SÓ consome:
// valor a pagar e totais vêm DERIVADOS do backend (a tela NUNCA soma). Tudo passa pelo
// cliente central (credentials + 401 + ApiError). Consome os endpoints JÁ existentes.

export type StatusPagamento = "PAGO" | "PENDENTE";

/**
 * Linha como o GET /pagamentos devolve (visão REAL): `valorAPagar` é derivado no back;
 * `status` é a verdade; `exibirComoPago` é o sinalizador cru (como `isento`) — a tela
 * mostra a verdade (status real) e usa esse fato só para AVISAR (marcador 🎭).
 */
export type PagamentoParticipante = {
  id: string;
  nome: string;
  apelido: string | null;
  valorAPagar: number;
  status: StatusPagamento;
  exibirComoPago: boolean;
  // Override cru (fatia #4): != null → o valorAPagar veio do override (não da fórmula).
  // A tela usa só para o marcador "valor manual" (não recalcula nada).
  valorCustomizado: number | null;
};

/** Totais agregados — DERIVADOS no backend (§8.8). A tela exibe, nunca recalcula. */
export type TotaisPagamento = {
  esperado: number;
  recebido: number;
  falta: number;
};

export type ResumoPagamentos = {
  participantes: PagamentoParticipante[];
  totais: TotaisPagamento;
};

/** Quadro REAL (a verdade) — é o que esta tela consome. NUNCA a visão pública (export). */
export const listarPagamentos = () => api.get<ResumoPagamentos>("/pagamentos");

/**
 * PUT alterna Pago⇄Pendente (toggle): sem corpo, id na URL. O novo status é DERIVADO no
 * back (flip). Devolve o participante atualizado — aqui só interessam id + status.
 */
export const alternarStatus = (id: string) =>
  api.put<{ id: string; status: StatusPagamento }>(`/pagamentos/${id}`);

/** GET /pagamentos/export → text/plain (§12.7). Texto PRONTO (o back já maquia); o front só copia. */
export const exportarPagamentos = () => api.getTexto("/pagamentos/export");
