import { describe, expect, it } from "vitest";
import { formatarClassificacaoGeral } from "../../../src/domain/whatsapp/classificacaoGeral.js";

// Linhas de dados = as que têm o "—" (excluem header, linha em branco e cercas).
const linhasDeDados = (saida: string) => saida.split("\n").filter((l) => l.includes("—"));

describe("formatarClassificacaoGeral (artefato WhatsApp — funcional §12.5)", () => {
  // Já ORDENADA por pontos acumulados (vem de ordenarClassificacao). O formatador
  // não reordena nem recalcula.
  const ordenados = [
    { nome: "Diego", pontos: 21 },
    { nome: "Lucas", pontos: 18 },
    { nome: "Ana", pontos: 15 },
  ];

  it("tem header em negrito FORA do bloco monoespaçado", () => {
    const saida = formatarClassificacaoGeral(ordenados, "após as Oitavas");
    const primeiraLinha = saida.split("\n").at(0) ?? "";
    expect(primeiraLinha).toBe("📊 *CLASSIFICAÇÃO GERAL* (após as Oitavas)");
    // O header não está dentro das crases.
    expect(primeiraLinha).not.toContain("```");
    // E o header aparece antes da abertura do bloco.
    expect(saida.indexOf("📊")).toBeLessThan(saida.indexOf("```"));
  });

  it("usa bloco monoespaçado para as linhas", () => {
    const saida = formatarClassificacaoGeral(ordenados, "após as Oitavas");
    expect(saida).toContain("```");
  });

  it("numera por posição e mantém a ordem recebida", () => {
    const saida = formatarClassificacaoGeral(ordenados, "após as Oitavas");
    expect(linhasDeDados(saida)).toEqual([
      "1º  Diego — 21 pts",
      "2º  Lucas — 18 pts",
      "3º  Ana   — 15 pts",
    ]);
  });

  it("alinha o '—' (nomes preenchidos), inclusive com nome longo", () => {
    const saida = formatarClassificacaoGeral(
      [
        { nome: "Maximiliano", pontos: 30 },
        { nome: "Bia", pontos: 10 },
      ],
      "após as Quartas",
    );
    const colunasTraco = linhasDeDados(saida).map((l) => l.indexOf("—"));
    expect(new Set(colunasTraco).size).toBe(1);
  });

  it("aguenta 63 participantes mantendo o '—' alinhado", () => {
    const muitos = Array.from({ length: 63 }, (_, i) => ({
      nome: `P${i + 1}`,
      pontos: 63 - i,
    }));
    const saida = formatarClassificacaoGeral(muitos, "após a Rodada Final");
    const linhas = linhasDeDados(saida);
    expect(linhas).toHaveLength(63);
    expect(new Set(linhas.map((l) => l.indexOf("—"))).size).toBe(1);
    expect(linhas.at(-1)).toContain("63º");
  });
});
