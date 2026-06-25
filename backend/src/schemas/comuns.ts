import { z } from "zod";

/**
 * Primitivos Zod COMPARTILHADOS pelos schemas de `schemas/` — fonte ÚNICA, para não
 * repetir a mesma validação em vários arquivos (CLAUDE.md §8.4).
 */

/**
 * Gols de um placar (90 min): inteiro >= 0. Empate é palpite válido (§8.1) e
 * prorrogação/pênaltis não contam (§3.6). Usado por palpites e resultados.
 */
export const golsSchema = z
  .number()
  .int("Gols devem ser inteiros.")
  .min(0, "Gols não podem ser negativos.");

/** Status de pagamento de um participante (funcional §8.8). */
export const statusPagamentoSchema = z.enum(["PAGO", "PENDENTE"]);
