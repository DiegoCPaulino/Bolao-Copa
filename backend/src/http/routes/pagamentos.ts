import type { FastifyInstance } from "fastify";
import { dividirPote } from "../../domain/premiacao.js";
import { formatarPagamentos } from "../../domain/whatsapp/pagamentos.js";
import { alternarStatusInputSchema } from "../../schemas/pagamentoSchemas.js";
import * as pagamentos from "../../services/pagamentoService.js";

const TEXTO_PLANO = "text/plain; charset=utf-8";

/**
 * Pagamentos — mesmo molde da 6.3a. Valor a pagar e totais são DERIVADOS pelo serviço
 * (isentos já ficam fora). O PUT ALTERNA o status (toggle, como no CLI) — sem corpo, o
 * id vem da URL. O export mostra só a premiação (75%, atual/potencial), nunca o bruto.
 */
export async function rotasPagamentos(app: FastifyInstance): Promise<void> {
  app.get("/pagamentos", async () => pagamentos.listarPagamentos());

  app.put("/pagamentos/:participanteId", async (req) => {
    const { participanteId } = alternarStatusInputSchema.parse(req.params);
    return pagamentos.alternarStatus(participanteId); // ParticipanteNaoEncontrado → 404
  });

  app.get("/pagamentos/export", async (_req, reply) => {
    const { participantes, totais } = await pagamentos.listarPagamentos();
    // Só os 75% vão para o grupo (mesma regra de domínio do painel: dividirPote).
    const premiacao = {
      premiacaoAtual: dividirPote(totais.recebido).premiacao,
      premiacaoPotencial: dividirPote(totais.esperado).premiacao,
    };
    const texto = formatarPagamentos(
      participantes.map((p) => ({
        nome: p.nome,
        apelido: p.apelido ?? undefined,
        valorAPagar: p.valorAPagar,
        status: p.status,
      })),
      premiacao,
    );
    return reply.type(TEXTO_PLANO).send(texto);
  });
}
