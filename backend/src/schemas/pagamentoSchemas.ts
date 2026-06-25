import { z } from "zod";

/**
 * Validação de Pagamentos — na CASCA dos adaptadores (CLAUDE.md §3.1), em pasta NEUTRA
 * `schemas/` para ser fonte ÚNICA do CLI e do HTTP.
 *
 * A ação é ALTERNAR o status (toggle): o único dado cru a validar é QUAL participante
 * (id). O novo status é DERIVADO no serviço (flip), não digitado — por isso não há
 * corpo. No CLI o id vem da seleção; no HTTP, do parâmetro de rota.
 */

// O `statusPagamentoSchema` é compartilhado (comuns.js); re-exportado aqui para quem
// já espera encontrá-lo neste módulo (e caso o HTTP precise definir o status direto).
export { statusPagamentoSchema } from "./comuns.js";

export const alternarStatusInputSchema = z.object({
  participanteId: z.string().min(1, "Selecione um participante."),
});

export type AlternarStatusInput = z.infer<typeof alternarStatusInputSchema>;
