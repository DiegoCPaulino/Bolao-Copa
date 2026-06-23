import { z } from "zod";

/**
 * Validação da entrada do menu de Pagamentos — na casca (CLAUDE.md §3.1), reusável
 * pelo HTTP na Entrega 2.
 *
 * A ação do terminal é ALTERNAR o status (toggle): o único dado cru a validar é qual
 * participante foi escolhido. O novo status é DERIVADO no serviço (flip), não digitado
 * — por isso aqui só validamos a seleção. O `statusPagamentoSchema` fica exposto para
 * quando o HTTP (E2) precisar definir o status explicitamente.
 */

export const statusPagamentoSchema = z.enum(["PAGO", "PENDENTE"]);

export const alternarStatusInputSchema = z.object({
  participanteId: z.string().min(1, "Selecione um participante."),
});

export type AlternarStatusInput = z.infer<typeof alternarStatusInputSchema>;
