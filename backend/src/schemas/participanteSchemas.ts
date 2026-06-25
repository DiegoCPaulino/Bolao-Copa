import { z } from "zod";
import { statusPagamentoSchema } from "./comuns.js";

/**
 * Validação de ENTRADA de participante — vive na CASCA dos adaptadores (CLAUDE.md
 * §3.1), nunca no núcleo. É Zod PURO (sem nada de terminal/HTTP), por isso mora numa
 * pasta NEUTRA `schemas/` e é reusada pelos DOIS adaptadores: o CLI (Entrega 1)
 * transforma o que o operador digita; o HTTP (Entrega 2) valida o corpo/query da
 * requisição — mesma validação, FONTE ÚNICA.
 *
 * `z.infer` mantém o tipo derivado do schema (sem duplicar à mão — §8.3); a
 * compatibilidade com `DadosParticipante` do serviço é checada pelo compilador no
 * ponto da chamada (adaptador → serviço).
 */

const nome = z.string().trim().min(1, "O nome é obrigatório.");

/**
 * Texto opcional: aceita string, null ou AUSÊNCIA da chave; espaços/vazio viram `null`.
 * É `.optional()` (não `z.union([..., z.undefined()])`): no Zod v4, só o `.optional()`
 * torna a CHAVE omitível no objeto — incluir `z.undefined()` na união aceitaria o
 * VALOR undefined mas ainda exigiria a chave presente. O CLI sempre manda as chaves;
 * um corpo HTTP pode omiti-las, e este schema é compartilhado pelos dois.
 */
const textoOpcional = z
  .union([z.string(), z.null()])
  .optional()
  .transform((valor) => {
    const limpo = (valor ?? "").trim();
    return limpo === "" ? null : limpo;
  });

export const participanteInputSchema = z.object({
  nome,
  apelido: textoOpcional,
  indicadorId: textoOpcional,
  // Isento de pagamento: o CLI sempre manda o boolean do `confirm`; o `default(false)`
  // cobre o corpo HTTP quando o campo vem ausente (= não isento).
  isento: z.boolean().default(false),
});

export type ParticipanteInput = z.infer<typeof participanteInputSchema>;

/**
 * Filtros de listagem (busca/status/ordenação) — espelham `OpcoesListagem` do
 * repositório. O HTTP valida a query string com isto; campos ausentes ficam
 * `undefined` e o serviço aplica seus defaults. (O CLI monta as opções a partir de
 * prompts, então só o HTTP usa este schema — mas ele fica aqui, junto do contrato.)
 */
export const listarParticipantesQuerySchema = z.object({
  busca: z.string().trim().min(1).optional(),
  status: statusPagamentoSchema.optional(),
  ordenarPor: z.enum(["nome", "criadoEm"]).optional(),
});
