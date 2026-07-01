import { describe, expect, it } from "vitest";
import { classificarPalpite, type Placar } from "../../src/domain/pontuacao.js";

// Açúcar de leitura: placar(2, 1) lê-se "2x1".
const placar = (golsEsquerda: number, golsDireita: number): Placar => ({
  golsEsquerda,
  golsDireita,
});

/**
 * Classificação ESTATÍSTICA de um palpite (fatia #3): subdivide o "resultado certo"
 * (1 ponto) em EMPATE_ACERTADO vs VITORIA_ACERTADA — só para relatório nas telas. Os
 * pontos 3/1/0 NÃO mudam: `classificarPalpite` reusa `calcularPontos` (o exato tem
 * categoria própria e NÃO conta como empate/vitória).
 */
describe("classificarPalpite (categoria estatística — reusa 3/1/0)", () => {
  it("placar exato (jogo decidido) → EXATO", () => {
    expect(classificarPalpite(placar(2, 1), placar(2, 1))).toBe("EXATO");
  });

  it("acertou o EMPATE com placar errado → EMPATE_ACERTADO", () => {
    expect(classificarPalpite(placar(2, 2), placar(1, 1))).toBe("EMPATE_ACERTADO");
  });

  it("acertou a VITÓRIA com placar errado → VITORIA_ACERTADA", () => {
    expect(classificarPalpite(placar(3, 0), placar(2, 1))).toBe("VITORIA_ACERTADA");
  });

  it("desfecho errado → ERRADO", () => {
    expect(classificarPalpite(placar(0, 1), placar(2, 1))).toBe("ERRADO");
  });

  // — bordas —
  it("empate EXATO tem prioridade sobre empate acertado (1x1 vs 1x1 → EXATO)", () => {
    expect(classificarPalpite(placar(1, 1), placar(1, 1))).toBe("EXATO");
  });

  it("mesmo vencedor, placar errado (1x0 vs 2x1) → VITORIA_ACERTADA", () => {
    expect(classificarPalpite(placar(1, 0), placar(2, 1))).toBe("VITORIA_ACERTADA");
  });

  it("previu empate, jogo foi decidido (2x2 vs 2x1) → ERRADO", () => {
    expect(classificarPalpite(placar(2, 2), placar(2, 1))).toBe("ERRADO");
  });

  it("previu vitória, jogo foi empate (2x1 vs 1x1) → ERRADO", () => {
    expect(classificarPalpite(placar(2, 1), placar(1, 1))).toBe("ERRADO");
  });
});
