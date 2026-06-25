import { z } from "zod";

/**
 * Validação de Pagamentos — na CASCA dos adaptadores (CLAUDE.md §3.1), em pasta NEUTRA
 * `schemas/` para ser fonte ÚNICA do CLI e do HTTP.
 *
 * A ação é ALTERNAR o status (toggle): o único dado cru a validar é QUAL participante
 * (id). O novo status é DERIVADO no serviço (flip), não digitado — por isso não há
 * corpo. No CLI o id vem da seleção; no HTTP, do parâmetro de rota. O `statusPagamentoSchema`
 * fica exposto caso um dia o HTTP precise definir o status explicitamente.
 */

export const statusPagamentoSchema = z.enum(["PAGO", "PENDENTE"]);

export const alternarStatusInputSchema = z.object({
  participanteId: z.string().min(1, "Selecione um participante."),
});

export type AlternarStatusInput = z.infer<typeof alternarStatusInputSchema>;
