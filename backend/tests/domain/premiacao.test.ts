import { describe, expect, it } from "vitest";
import { dividirPote } from "../../src/domain/premiacao.js";

/**
 * Divisão do pote 75% premiação / 25% organizador — regra de negócio nova.
 *
 * A INVARIANTE central: `premiacao + organizador === total` SEMPRE, inclusive
 * quando 75% dá quebrado. Por isso o organizador é o RESTO (`total - premiacao`),
 * não um segundo arredondamento — assim nenhum centavo se perde nem sobra.
 */
describe("dividirPote (75% premiação / 25% organizador)", () => {
  it("pote zerado → tudo zero", () => {
    expect(dividirPote(0)).toEqual({ premiacao: 0, organizador: 0 });
  });

  it("divisão exata: 1000 → 750 / 250", () => {
    expect(dividirPote(1000)).toEqual({ premiacao: 750, organizador: 250 });
  });

  it("divisão quebrada: 130 → 98 (round 97.5) / 32, e somam 130", () => {
    const { premiacao, organizador } = dividirPote(130);
    expect(premiacao).toBe(98); // Math.round(97.5) = 98
    expect(organizador).toBe(32); // resto: 130 − 98
    expect(premiacao + organizador).toBe(130);
  });

  it("invariante soma == total para uma faixa de valores (inclusive quebrados)", () => {
    for (const total of [1, 7, 13, 41, 99, 145, 1065, 2016, 9999]) {
      const { premiacao, organizador } = dividirPote(total);
      expect(premiacao + organizador).toBe(total);
    }
  });
});
