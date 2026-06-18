import type { Placar } from "../pontuacao.js";

/**
 * Primitivos de formatação do WhatsApp, compartilhados pelos formatadores de
 * artefato — arquitetura §5.3; CLAUDE.md §3.3.
 *
 * O WhatsApp NÃO renderiza tabela: a estrutura vem de `*negrito*`, `_itálico_`,
 * monoespaçado, quebras de linha e emoji (funcional §12). Adicionamos um
 * primitivo aqui apenas quando uma fatia realmente precisa dele — nada
 * especulativo.
 */

/** Negrito do WhatsApp: envolve o texto em asteriscos. */
export const negrito = (texto: string): string => `*${texto}*`;

/**
 * Valor em reais no padrão pt-BR para o WhatsApp: "R$ 2.300", "R$ 35".
 *
 * Usa `toLocaleString("pt-BR")` só para o agrupamento de milhar com ".". O Node
 * 24 embute o ICU completo, então a saída é determinística no runtime e no CI.
 * NÃO usamos `style: "currency"` de propósito: ele acrescentaria os centavos
 * (",00") e um espaço NÃO separável (U+00A0) depois do "R$" — ruído que o
 * exemplo do §12.7 não tem. Assume `valor` inteiro (os valores do domínio são
 * inteiros: base, descontos, piso e somas deles).
 */
export const reais = (valor: number): string => `R$ ${valor.toLocaleString("pt-BR")}`;

/** Cerca do bloco monoespaçado do WhatsApp (crases triplas). */
const CERCA = "```";

/**
 * Bloco monoespaçado do WhatsApp (largura fixa) — funcional §12.
 *
 * Em largura fixa, padding com espaços ALINHA colunas. Cuidados (por isso o uso
 * é restrito): emojis têm largura variável e QUEBRAM o alinhamento, e dentro do
 * bloco `*negrito*`/`_itálico_` NÃO renderizam (ficam literais) — headers em
 * negrito devem ficar FORA do bloco.
 */
export const monoBloco = (texto: string): string => `${CERCA}\n${texto}\n${CERCA}`;

/**
 * Preenche `texto` com espaços à direita até `largura` (alinhamento à esquerda).
 * Texto já maior ou igual à largura é devolvido intacto (não trunca). Só alinha
 * de fato dentro de `monoBloco` (largura fixa) e com texto puro (sem emoji).
 */
export const preencherDireita = (texto: string, largura: number): string => texto.padEnd(largura);

/**
 * Keycap numérico do WhatsApp para numerar jogos — funcional §12.1.
 *
 * EDGE (documentado): o keycap "limpo" só existe de 1️⃣ a 🔟. Acima de 10 (ex.:
 * 16-avos, com 16 jogos) não há emoji keycap — caímos no número simples para
 * J11–J16. De 1 a 9 o keycap é "dígito + VS16 + enclosing keycap".
 */
export const keycap = (n: number): string => {
  if (n >= 1 && n <= 9) {
    return `${n}️⃣`;
  }
  if (n === 10) {
    return "🔟";
  }
  return `${n}`;
};

/** Placar compacto para palpites: "2x1" (funcional §12.2 e §12.3). */
export const placarCompacto = (placar: Placar): string =>
  `${placar.golsEsquerda}x${placar.golsDireita}`;

/** Placar "por extenso" do resultado real, com espaços: "2 x 1" (funcional §12.3). */
export const placarPorExtenso = (placar: Placar): string =>
  `${placar.golsEsquerda} x ${placar.golsDireita}`;
