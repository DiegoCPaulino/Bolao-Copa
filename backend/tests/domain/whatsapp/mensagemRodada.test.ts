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

  it("inclui a linha de instrução", () => {
    const saida = formatarMensagemRodada(jogos, "OITAVAS DE FINAL");
    expect(saida).toContain("Mandem os palpites (placar dos 90 min) 👇");
  });

  it("monta cada jogo com keycap + bandeiras + times", () => {
    const saida = formatarMensagemRodada(jogos, "OITAVAS DE FINAL");
    expect(saida).toContain("1️⃣ 🇧🇷 Brasil x Argentina 🇦🇷");
    expect(saida).toContain("2️⃣ 🇫🇷 França x Espanha 🇪🇸");
  });

  it("não usa bloco monoespaçado (bandeiras estruturam, §12.1)", () => {
    const saida = formatarMensagemRodada(jogos, "OITAVAS DE FINAL");
    expect(saida).not.toContain("```");
  });

  it("usa o keycap fallback nos 16-avos (jogos 11–16)", () => {
    const dezesseisAvos = Array.from({ length: 16 }, (_, i) =>
      jogo(i + 1, ["🇧🇷", `Casa${i + 1}`], ["🇦🇷", `Fora${i + 1}`]),
    );
    const saida = formatarMensagemRodada(dezesseisAvos, "16-AVOS DE FINAL");
    expect(saida).toContain("🔟 🇧🇷 Casa10 x Fora10 🇦🇷");
    expect(saida).toContain("11 🇧🇷 Casa11 x Fora11 🇦🇷");
    expect(saida).toContain("16 🇧🇷 Casa16 x Fora16 🇦🇷");
  });
});
