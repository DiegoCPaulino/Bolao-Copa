/**
 * Formatação de moeda — APRESENTAÇÃO, não cálculo. Os valores já vêm prontos da API;
 * aqui só damos o separador de milhar pt-BR (ex.: 1065 → "R$ 1.065"). A tela NUNCA soma.
 * Compartilhado por Pagamentos e Painel (fonte única do formato de reais).
 */
export function reais(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR")}`;
}
