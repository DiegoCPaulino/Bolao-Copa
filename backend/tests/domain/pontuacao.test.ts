import { describe, expect, it } from "vitest";
import { calcularPontos, type Placar } from "../../src/domain/pontuacao.js";

// Açúcar de leitura: placar(2, 1) lê-se "2x1" e deixa os casos da §8.3 falando
// a mesma língua do documento funcional.
const placar = (golsEsquerda: number, golsDireita: number): Placar => ({
  golsEsquerda,
  golsDireita,
});

describe("calcularPontos (regra 3/1/0 — funcional §8.2 e §8.3)", () => {
  // Casos transcritos diretamente do funcional §8.3.
  describe("resultado real 2x1", () => {
    const resultado = placar(2, 1);

    it("2x1 → 3 (placar exato)", () => {
      expect(calcularPontos(placar(2, 1), resultado)).toBe(3);
    });
    it("3x1 → 1 (acertou o vencedor, placar errado)", () => {
      expect(calcularPontos(placar(3, 1), resultado)).toBe(1);
    });
    it("1x0 → 1 (acertou o vencedor, placar errado)", () => {
      expect(calcularPontos(placar(1, 0), resultado)).toBe(1);
    });
    it("1x1 → 0 (previu empate; jogo foi decidido)", () => {
      expect(calcularPontos(placar(1, 1), resultado)).toBe(0);
    });
    it("0x1 → 0 (previu o vencedor errado)", () => {
      expect(calcularPontos(placar(0, 1), resultado)).toBe(0);
    });
  });

  describe("resultado real 1x1", () => {
    const resultado = placar(1, 1);

    it("1x1 → 3 (placar exato; empate é palpite válido)", () => {
      expect(calcularPontos(placar(1, 1), resultado)).toBe(3);
    });
    it("2x2 → 1 (acertou o empate, placar errado)", () => {
      expect(calcularPontos(placar(2, 2), resultado)).toBe(1);
    });
    it("2x1 → 0 (previu vitória; jogo foi empate)", () => {
      expect(calcularPontos(placar(2, 1), resultado)).toBe(0);
    });
  });

  // §8.1: o empate é um palpite válido. Reforço explícito nas duas direções,
  // além dos exemplos da §8.3, para travar a regra contra regressões.
  describe("empate como palpite válido (§8.1)", () => {
    it("palpite de empate vs. resultado decidido → 0 (0x0 contra 2x0)", () => {
      expect(calcularPontos(placar(0, 0), placar(2, 0))).toBe(0);
    });
    it("palpite decidido vs. resultado de empate → 0 (1x0 contra 0x0)", () => {
      expect(calcularPontos(placar(1, 0), placar(0, 0))).toBe(0);
    });
    it("acertou o empate com placar diferente → 1 (0x0 contra 3x3)", () => {
      expect(calcularPontos(placar(0, 0), placar(3, 3))).toBe(1);
    });
    it("empate exato → 3 (0x0 contra 0x0)", () => {
      expect(calcularPontos(placar(0, 0), placar(0, 0))).toBe(3);
    });
  });
});
