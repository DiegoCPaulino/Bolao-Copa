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
