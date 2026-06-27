import { describe, expect, it } from "vitest";
import {
  formatarMensagemRodada,
  type JogoDaRodada,
} from "../../../src/domain/whatsapp/mensagemRodada.js";

const jogo = (ordem: number, esq: [string, string], dir: [string, string]): JogoDaRodada => ({
  ordem,
  esquerda: { bandeira: esq[0], nome: esq[1] },
  direita: { bandeira: dir[0], nome: dir[1] },
});

describe("formatarMensagemRodada (artefato WhatsApp — funcional §12.1)", () => {
  const jogos = [
    jogo(1, ["🇧🇷", "Brasil"], ["🇦🇷", "Argentina"]),
    jogo(2, ["🇫🇷", "França"], ["🇪🇸", "Espanha"]),
  ];

  it("tem header em negrito com a fase", () => {
    const saida = formatarMensagemRodada(jogos, "OITAVAS DE FINAL");
    expect(saida.split("\n").at(0)).toBe("🏆 *BOLÃO COPA 2026 — OITAVAS DE FINAL*");
  });

  it("NÃO tem linha de instrução: entre o título e os jogos só há a linha em branco", () => {
    const saida = formatarMensagemRodada(jogos, "OITAVAS DE FINAL");
    expect(saida).not.toContain("Mandem os palpites");
    const linhas = saida.split("\n");
    expect(linhas[1]).toBe(""); // título, em branco, jogo 1…
    expect(linhas[2]).toContain("⚽ *J1*");
  });

  it("monta cada jogo com ⚽ *J{n}* + bandeiras + times (× entre eles)", () => {
    const saida = formatarMensagemRodada(jogos, "OITAVAS DE FINAL");
    expect(saida).toContain("⚽ *J1* 🇧🇷 Brasil × Argentina 🇦🇷");
    expect(saida).toContain("⚽ *J2* 🇫🇷 França × Espanha 🇪🇸");
  });

  it("não usa bloco monoespaçado (bandeiras estruturam, §13.1)", () => {
    const saida = formatarMensagemRodada(jogos, "OITAVAS DE FINAL");
    expect(saida).not.toContain("```");
  });

  it("numera de 1 a 16 de forma UNIFORME (J{n}) nos 16-avos, sem fallback", () => {
    const dezesseisAvos = Array.from({ length: 16 }, (_, i) =>
      jogo(i + 1, ["🇧🇷", `Casa${i + 1}`], ["🇦🇷", `Fora${i + 1}`]),
    );
    const saida = formatarMensagemRodada(dezesseisAvos, "16-AVOS DE FINAL");
    expect(saida).toContain("⚽ *J10* 🇧🇷 Casa10 × Fora10 🇦🇷");
    expect(saida).toContain("⚽ *J11* 🇧🇷 Casa11 × Fora11 🇦🇷");
    expect(saida).toContain("⚽ *J16* 🇧🇷 Casa16 × Fora16 🇦🇷");
  });
});
