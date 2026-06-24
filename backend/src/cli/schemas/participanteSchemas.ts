import { z } from "zod";

/**
 * Validação da ENTRADA do participante — vive na casca (adaptador), nunca no
 * núcleo (CLAUDE.md §3.1). Transforma o que o operador digita no menu (texto cru)
 * no dado tipado que o serviço espera.
 *
 * O MESMO schema será reusado pelo adaptador HTTP na Entrega 2 (por isso normaliza
 * "vazio → null" aqui, e não no menu: o corpo de uma requisição também passará por
 * ele). Quando o HTTP entrar, este arquivo pode subir para uma pasta neutra de
 * validação compartilhada; por ora mora em `cli/` porque só o CLI o usa.
 *
 * `z.infer` mantém fonte única (CLAUDE.md §8.3): o tipo de entrada é DERIVADO do
 * schema, não duplicado à mão. A compatibilidade com `DadosParticipante` do serviço
 * é verificada pelo compilador no ponto da chamada (menu → serviço).
 */

const nome = z.string().trim().min(1, "O nome é obrigatório.");

/** Texto opcional: aceita string, null ou ausência; espaços/vazio viram `null`. */
const textoOpcional = z.union([z.string(), z.null(), z.undefined()]).transform((valor) => {
  const limpo = (valor ?? "").trim();
  return limpo === "" ? null : limpo;
});

export const participanteInputSchema = z.object({
  nome,
  apelido: textoOpcional,
  indicadorId: textoOpcional,
  // Isento de pagamento: o CLI sempre manda o boolean do `confirm`; o `default(false)`
  // serve ao corpo HTTP da Entrega 2 (campo ausente = não isento).
  isento: z.boolean().default(false),
});

export type ParticipanteInput = z.infer<typeof participanteInputSchema>;
