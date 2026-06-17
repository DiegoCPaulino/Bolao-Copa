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
