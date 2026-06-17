import { describe, expect, it } from "vitest";
import { calcularTotaisPagamento, calcularValorAPagar } from "../../src/domain/pagamento.js";

describe("calcularValorAPagar (regra de indicação — funcional §8.7)", () => {
  // Tabela transcrita direto do funcional §8.7: cada indicado direto que entrou
  // abate R$ 5 do valor base de R$ 40.
  describe("tabela da §8.7", () => {
    it.each([
      { indicados: 0, valor: 40 },
      { indicados: 1, valor: 35 },
      { indicados: 2, valor: 30 },
      { indicados: 3, valor: 25 },
      { indicados: 4, valor: 20 },
      { indicados: 5, valor: 15 },
      { indicados: 6, valor: 10 },
      { indicados: 7, valor: 5 },
    ])("$indicados indicado(s) → R$ $valor", ({ indicados, valor }) => {
      expect(calcularValorAPagar(indicados)).toBe(valor);
    });
  });

  // Piso de R$ 5: a partir de 7 indicados a fórmula crua chegaria a 0 ou
  // negativo; o máximo(PISO, ...) tem que travar em 5 (funcional §8.7).
  describe("piso de R$ 5", () => {
    it.each([
      { indicados: 8, valor: 5 }, // crua: 40 − 40 = 0
      { indicados: 15, valor: 5 }, // crua: 40 − 75 = −35
    ])("$indicados indicado(s) → R$ $valor (trava no piso)", ({ indicados, valor }) => {
      expect(calcularValorAPagar(indicados)).toBe(valor);
    });
  });
});

describe("calcularTotaisPagamento (totais do bolão — funcional §8.8)", () => {
  it("lista vazia → tudo zero", () => {
    expect(calcularTotaisPagamento([])).toEqual({ esperado: 0, recebido: 0, falta: 0 });
  });

  it("todos PENDENTE → recebido 0 e falta = esperado", () => {
    const participantes = [
      { valorAPagar: 40, status: "PENDENTE" as const },
      { valorAPagar: 35, status: "PENDENTE" as const },
    ];
    expect(calcularTotaisPagamento(participantes)).toEqual({
      esperado: 75,
      recebido: 0,
      falta: 75,
    });
  });

  it("todos PAGO → falta 0 e recebido = esperado", () => {
    const participantes = [
      { valorAPagar: 40, status: "PAGO" as const },
      { valorAPagar: 35, status: "PAGO" as const },
    ];
    expect(calcularTotaisPagamento(participantes)).toEqual({
      esperado: 75,
      recebido: 75,
      falta: 0,
    });
  });

  it("caso misto confere as três somas", () => {
    const participantes = [
      { valorAPagar: 40, status: "PAGO" as const },
      { valorAPagar: 35, status: "PENDENTE" as const },
      { valorAPagar: 20, status: "PAGO" as const },
    ];
    expect(calcularTotaisPagamento(participantes)).toEqual({
      esperado: 95,
      recebido: 60,
      falta: 35,
    });
  });
});
