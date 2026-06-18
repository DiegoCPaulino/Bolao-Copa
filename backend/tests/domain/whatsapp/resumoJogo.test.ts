import { describe, expect, it } from "vitest";
import {
  formatarResumoJogo,
  type PalpiteComPontos,
  type ResultadoJogo,
} from "../../../src/domain/whatsapp/resumoJogo.js";

const linhaQueComeca = (saida: string, prefixo: string) =>
  saida.split("\n").find((l) => l.startsWith(prefixo)) ?? "";

describe("formatarResumoJogo (artefato WhatsApp — funcional §12.3)", () => {
  const resultado: ResultadoJogo = {
    esquerda: { nome: "Brasil", bandeira: "🇧🇷" },
    direita: { nome: "Argentina", bandeira: "🇦🇷" },
    placar: { golsEsquerda: 2, golsDireita: 1 },
  };

  // Pontos JÁ calculados (não em ordem de propósito: o formatador ordena p/ exibir).
  const palpites: PalpiteComPontos[] = [
    { nome: "Ana", palpite: { golsEsquerda: 1, golsDireita: 1 }, pontos: 0 },
    { nome: "Diego", palpite: { golsEsquerda: 2, golsDireita: 1 }, pontos: 3 },
    { nome: "Lucas", palpite: { golsEsquerda: 1, golsDireita: 0 }, pontos: 1 },
  ];

  it("tem header em negrito com o rótulo do jogo", () => {
    const saida = formatarResumoJogo(resultado, palpites, "Jogo 1");
    expect(saida.split("\n").at(0)).toBe("✅ *RESULTADO — Jogo 1*");
  });

  it("mostra o placar real por extenso, com bandeiras", () => {
    const saida = formatarResumoJogo(resultado, palpites, "Jogo 1");
    expect(saida.split("\n").at(1)).toBe("🇧🇷 Brasil 2 x 1 Argentina 🇦🇷");
  });

  it("usa o emoji certo por pontuação e negrito só na cravada", () => {
    const saida = formatarResumoJogo(resultado, palpites, "Jogo 1");
    expect(linhaQueComeca(saida, "🎯")).toBe("🎯 Diego 2x1 → *3 pts* (cravou!)");
    expect(linhaQueComeca(saida, "✔️")).toBe("✔️ Lucas 1x0 → 1 pt");
    expect(linhaQueComeca(saida, "❌")).toBe("❌ Ana 1x1 → 0 pt");
  });

  it("exibe em ordem de pontos desc (cravadas primeiro), sem recalcular", () => {
    const saida = formatarResumoJogo(resultado, palpites, "Jogo 1");
    // Linhas de palpite têm "→"; o nome é o token após o emoji inicial.
    const ordem = saida
      .split("\n")
      .filter((l) => l.includes("→"))
      .map((l) => l.split(" ").at(1));
    expect(ordem).toEqual(["Diego", "Lucas", "Ana"]);
  });

  it("não usa bloco monoespaçado (emojis estruturam, §12.3)", () => {
    const saida = formatarResumoJogo(resultado, palpites, "Jogo 1");
    expect(saida).not.toContain("```");
  });
});
