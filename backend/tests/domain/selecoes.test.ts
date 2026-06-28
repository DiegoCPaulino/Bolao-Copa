import { describe, expect, it } from "vitest";
import { ID_SELECAO_A_DEFINIR, selecoesRepetidasInvalidas } from "../../src/domain/selecoes.js";

/**
 * Regra do par de seleções de um jogo. "Repetidas de forma inválida" = mesma seleção dos
 * dois lados (um time não joga contra si). EXCEÇÃO: dois "A definir" são dois espaços
 * vazios (lados ainda não decididos), não a mesma seleção repetida → VÁLIDO. A identidade
 * da "A definir" é o ID (ID_SELECAO_A_DEFINIR), nunca o nome.
 */
describe("selecoesRepetidasInvalidas", () => {
  it("mesma seleção REAL dos dois lados é inválida (time não joga contra si)", () => {
    expect(selecoesRepetidasInvalidas("brasil", "brasil")).toBe(true);
  });

  it("seleções diferentes são válidas", () => {
    expect(selecoesRepetidasInvalidas("brasil", "argentina")).toBe(false);
  });

  it('EXCEÇÃO: dois "A definir" são válidos (dois lados não decididos)', () => {
    expect(selecoesRepetidasInvalidas(ID_SELECAO_A_DEFINIR, ID_SELECAO_A_DEFINIR)).toBe(false);
  });

  it('"A definir" × time real é válido', () => {
    expect(selecoesRepetidasInvalidas(ID_SELECAO_A_DEFINIR, "brasil")).toBe(false);
    expect(selecoesRepetidasInvalidas("brasil", ID_SELECAO_A_DEFINIR)).toBe(false);
  });
});
