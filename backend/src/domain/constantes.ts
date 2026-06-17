/**
 * Constantes de NEGÓCIO do bolão — funcional §8.7; CLAUDE.md §7.5.
 *
 * Moram em `domain/` (e não em `config/`) de propósito: são regra do bolão, não
 * configuração de ambiente. Se a regra mudar, muda aqui — num único lugar —, e
 * nunca como número mágico espalhado pelo código.
 */

/** Valor base que todo participante paga antes de qualquer desconto (R$). */
export const VALOR_BASE = 40;

/** Abatimento por indicado direto que entrou no bolão (R$). */
export const DESCONTO_POR_INDICACAO = 5;

/** Piso: ninguém paga menos que isto, por mais indicações que tenha (R$). */
export const PISO = 5;
