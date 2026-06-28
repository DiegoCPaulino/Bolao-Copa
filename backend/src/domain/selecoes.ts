/**
 * Regras de domínio sobre seleções num jogo — PURAS (CLAUDE.md §3.3), sem framework/banco.
 *
 * "A definir" é uma seleção placeholder do catálogo: um lado de jogo de mata-mata que
 * ainda não foi decidido (depende de outro jogo). É uma seleção NORMAL — flui por
 * combobox, jogo, exportação e edição —, identificada por um ID ESTÁVEL (não pelo nome).
 * O seed cria a seleção com este id; a regra abaixo o referencia. À prova de renomear:
 * se um dia o nome virar "Indefinido", a identidade (o id) não muda.
 */

/** Id fixo da seleção placeholder "A definir" — fonte única (seed E regra importam daqui). */
export const ID_SELECAO_A_DEFINIR = "a-definir";

/**
 * As duas seleções de um jogo se repetem de forma INVÁLIDA? Um time não joga contra si
 * mesmo, então a MESMA seleção dos dois lados é proibida — EXCETO quando ambos os lados
 * são a "A definir" (dois espaços vazios ainda não decididos), o que é VÁLIDO.
 *
 * A "A definir" é reconhecida pelo `ID_SELECAO_A_DEFINIR` (identidade estável), nunca por
 * comparar o nome.
 */
export function selecoesRepetidasInvalidas(
  selecaoEsquerdaId: string,
  selecaoDireitaId: string,
): boolean {
  const ambasADefinir =
    selecaoEsquerdaId === ID_SELECAO_A_DEFINIR && selecaoDireitaId === ID_SELECAO_A_DEFINIR;
  return selecaoEsquerdaId === selecaoDireitaId && !ambasADefinir;
}
