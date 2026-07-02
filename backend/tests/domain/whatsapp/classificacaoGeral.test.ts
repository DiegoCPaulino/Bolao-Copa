import { describe, expect, it } from "vitest";
import { formatarClassificacaoGeral } from "../../../src/domain/whatsapp/classificacaoGeral.js";

// Linhas de dados = as que têm o "—" (excluem header, linha em branco e cercas).
const linhasDeDados = (saida: string) => saida.split("\n").filter((l) => l.includes("—"));

describe("formatarClassificacaoGeral (artefato WhatsApp — funcional §12.5)", () => {
  // Já ORDENADA por pontos acumulados (vem de ordenarClassificacao). O formatador
  // não reordena nem recalcula — só troca o rótulo das 3 primeiras por medalhas.
  const ordenados = [
    { nome: "Diego", pontos: 21 },
    { nome: "Lucas", pontos: 18 },
    { nome: "Ana", pontos: 15 },
    { nome: "João", pontos: 12 },
  ];

  it("tem header em negrito, SEM contexto entre parênteses, FORA do bloco", () => {
    const saida = formatarClassificacaoGeral(ordenados);
    const primeiraLinha = saida.split("\n").at(0) ?? "";
    expect(primeiraLinha).toBe("📊 *CLASSIFICAÇÃO GERAL*");
    expect(primeiraLinha).not.toContain("("); // removido o "(classificação atual)"
    expect(primeiraLinha).not.toContain("```");
    expect(saida.indexOf("📊")).toBeLessThan(saida.indexOf("```"));
  });

  it("usa bloco monoespaçado para as linhas", () => {
    expect(formatarClassificacaoGeral(ordenados)).toContain("```");
  });

  it("pódio: 🥇🥈🥉 nas 3 primeiras, numeração normal da 4ª em diante", () => {
    const linhas = linhasDeDados(formatarClassificacaoGeral(ordenados));
    expect(linhas.at(0)).toContain("🥇");
    expect(linhas.at(0)).toContain("Diego");
    expect(linhas.at(1)).toContain("🥈");
    expect(linhas.at(1)).toContain("Lucas");
    expect(linhas.at(2)).toContain("🥉");
    expect(linhas.at(2)).toContain("Ana");
    // 4ª: numeração normal, sem medalha.
    expect(linhas.at(3)).toContain("4º");
    expect(linhas.at(3)).toContain("João");
    expect(linhas.at(3) ?? "").not.toMatch(/🥇|🥈|🥉/);
  });

  it("as medalhas seguem a ORDEM DA LISTA (não reordena)", () => {
    // Lista fora de ordem de pontos de propósito: o formatador mantém a ordem recebida.
    const linhas = linhasDeDados(
      formatarClassificacaoGeral([
        { nome: "Ana", pontos: 5 },
        { nome: "Diego", pontos: 99 },
      ]),
    );
    expect(linhas.at(0)).toContain("🥇");
    expect(linhas.at(0)).toContain("Ana"); // 🥇 vai para o 1º da LISTA, não o de mais pontos
    expect(linhas.at(1)).toContain("🥈");
    expect(linhas.at(1)).toContain("Diego");
  });

  it("borda: menos de 3 não quebra (1 → só 🥇; 2 → 🥇🥈, sem 🥉)", () => {
    const um = formatarClassificacaoGeral([{ nome: "Solo", pontos: 3 }]);
    expect(linhasDeDados(um)).toHaveLength(1);
    expect(um).toContain("🥇");
    expect(um).not.toContain("🥈");
    expect(um).not.toContain("🥉");

    const dois = formatarClassificacaoGeral([
      { nome: "Diego", pontos: 9 },
      { nome: "Ana", pontos: 4 },
    ]);
    expect(dois).toContain("🥇");
    expect(dois).toContain("🥈");
    expect(dois).not.toContain("🥉");
  });

  it("desambigua homônimos com apelido", () => {
    const saida = formatarClassificacaoGeral([
      { nome: "João", apelido: "Barba", pontos: 10 },
      { nome: "João", apelido: "Magro", pontos: 8 },
    ]);
    expect(saida).toContain("João (Barba)");
    expect(saida).toContain("João (Magro)");
  });

  it("alinha o '—' (por contagem de caracteres), inclusive com nome longo", () => {
    const saida = formatarClassificacaoGeral([
      { nome: "Maximiliano", pontos: 30 },
      { nome: "Bia", pontos: 10 },
    ]);
    const colunasTraco = linhasDeDados(saida).map((l) => l.indexOf("—"));
    expect(new Set(colunasTraco).size).toBe(1);
  });

  it("aguenta 63 participantes; a última usa 63º e o '—' segue alinhado", () => {
    const muitos = Array.from({ length: 63 }, (_, i) => ({ nome: `P${i + 1}`, pontos: 63 - i }));
    const linhas = linhasDeDados(formatarClassificacaoGeral(muitos));
    expect(linhas).toHaveLength(63);
    expect(new Set(linhas.map((l) => l.indexOf("—"))).size).toBe(1);
    expect(linhas.at(-1)).toContain("63º");
  });
});
