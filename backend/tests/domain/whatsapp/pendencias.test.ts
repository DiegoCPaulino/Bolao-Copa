import { describe, expect, it } from "vitest";
import { formatarPendencias } from "../../../src/domain/whatsapp/pendencias.js";

describe("formatarPendencias (artefato WhatsApp — funcional §13.8, em LISTA)", () => {
  const pendentes = [{ nome: "Pedro" }, { nome: "Ana" }, { nome: "João" }];

  it("tem header em negrito com a fase", () => {
    const saida = formatarPendencias(pendentes, "OITAVAS");
    expect(saida.split("\n").at(0)).toBe("⚠️ *FALTAM PALPITES — OITAVAS*");
  });

  it("lista um nome por linha (marcador •), em ordem ALFABÉTICA", () => {
    const saida = formatarPendencias(pendentes, "OITAVAS");
    const linhas = saida.split("\n");
    expect(linhas[1]).toBe("• Ana");
    expect(linhas[2]).toBe("• João");
    expect(linhas[3]).toBe("• Pedro");
  });

  it("inclui a chamada à ação na última linha", () => {
    const saida = formatarPendencias(pendentes, "OITAVAS");
    expect(saida.split("\n").at(-1)).toBe("Mandem antes dos jogos! ⏰");
  });

  it("desambigua homônimos dentro do subconjunto exibido", () => {
    const comHomonimos = [
      { nome: "João", apelido: "Magro" },
      { nome: "João", apelido: "Barba" },
    ];
    const saida = formatarPendencias(comHomonimos, "QUARTAS");
    // alfabético por apelido como desempate (Barba antes de Magro)
    expect(saida).toContain("• João (Barba)");
    expect(saida).toContain("• João (Magro)");
  });

  it("lista grande não quebra: uma linha por nome", () => {
    const muitos = Array.from({ length: 30 }, (_, i) => ({
      nome: `P${String(i).padStart(2, "0")}`,
    }));
    const saida = formatarPendencias(muitos, "16-AVOS");
    const bullets = saida.split("\n").filter((l) => l.startsWith("• "));
    expect(bullets).toHaveLength(30);
  });
});
