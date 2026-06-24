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

/**
 * Fração do pote arrecadado destinada à PREMIAÇÃO (o restante, 25%, é do
 * organizador). É a única fração nomeada de propósito: o organizador recebe o
 * RESTO da divisão (ver `dividirPote`), então não precisa de uma constante própria
 * — assim os dois sempre somam o total exato, sem centavo perdido no arredondamento.
 */
export const FRACAO_PREMIACAO = 0.75;
