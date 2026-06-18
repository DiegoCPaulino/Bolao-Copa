import { describe, expect, it } from "vitest";
import { formatarResumoRodada } from "../../../src/domain/whatsapp/resumoRodada.js";

const linhaQueComeca = (saida: string, prefixo: string) =>
  saida.split("\n").find((l) => l.startsWith(prefixo)) ?? "";

describe("formatarResumoRodada (artefato WhatsApp — funcional §12.4)", () => {
  // Já ordenada por pontos DA RODADA (não acumulados). O formatador não reordena.
  const ranqueados = [
    { nome: "Diego", pontos: 8 },
    { nome: "Lucas", pontos: 5 },
    { nome: "Ana", pontos: 3 },
  ];

  it("tem header em negrito com a fase", () => {
    const saida = formatarResumoRodada(ranqueados, "OITAVAS");
    expect(saida.split("\n").at(0)).toBe("🏁 *FIM DAS OITAVAS*");
  });

  it("rotula a seção de pontos da rodada", () => {
    const saida = formatarResumoRodada(ranqueados, "OITAVAS");
    expect(saida).toContain("Pontos na rodada:");
  });

  it("dá medalhas às 3 primeiras e destaca o 1º com 🔥", () => {
    const saida = formatarResumoRodada(ranqueados, "OITAVAS");
    expect(linhaQueComeca(saida, "🥇")).toBe("🥇 Diego — 8 pts  🔥 destaque da rodada");
    expect(linhaQueComeca(saida, "🥈")).toBe("🥈 Lucas — 5 pts");
    expect(linhaQueComeca(saida, "🥉")).toBe("🥉 Ana — 3 pts");
  });

  it("não usa bloco monoespaçado (emojis estruturam, §12.4)", () => {
    const saida = formatarResumoRodada(ranqueados, "OITAVAS");
    expect(saida).not.toContain("```");
  });

  it("mostra TODOS: 4º em diante em linha simples, sem medalha", () => {
    const saida = formatarResumoRodada([...ranqueados, { nome: "Bia", pontos: 1 }], "OITAVAS");
    expect(linhaQueComeca(saida, "Bia")).toBe("Bia — 1 pts");
  });

  it("o 🔥 destaque vai só no 1º colocado", () => {
    const saida = formatarResumoRodada(ranqueados, "OITAVAS");
    expect(saida.split("🔥")).toHaveLength(2); // exatamente uma ocorrência
  });
});
