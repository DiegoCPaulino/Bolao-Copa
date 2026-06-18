import { describe, expect, it } from "vitest";
import {
  formatarTabelaPalpites,
  type LinhaTabelaPalpites,
} from "../../../src/domain/whatsapp/tabelaPalpites.js";

// Conteúdo entre as cercas do bloco monoespaçado (as linhas de dados).
const linhasDoBloco = (saida: string) => {
  const linhas = saida.split("\n");
  const abre = linhas.indexOf("```");
  const fecha = linhas.lastIndexOf("```");
  return linhas.slice(abre + 1, fecha);
};

const palpite = (jogo: number, e: number, d: number) => ({
  jogo,
  placar: { golsEsquerda: e, golsDireita: d },
});

describe("formatarTabelaPalpites (artefato WhatsApp — funcional §12.2)", () => {
  const linhas: LinhaTabelaPalpites[] = [
    { nome: "Diego", palpites: [palpite(1, 2, 1), palpite(2, 0, 0)] },
    { nome: "Lucas", palpites: [palpite(1, 1, 1), palpite(2, 2, 0)] },
    { nome: "Ana", palpites: [palpite(1, 0, 0), palpite(2, 1, 1)] },
  ];

  it("tem header em negrito FORA do bloco monoespaçado", () => {
    const saida = formatarTabelaPalpites(linhas, "OITAVAS");
    expect(saida.split("\n").at(0)).toBe("📋 *PALPITES — OITAVAS*");
    expect(saida.indexOf("📋")).toBeLessThan(saida.indexOf("```"));
  });

  it("renderiza as colunas com '|' literal e placar compacto", () => {
    const saida = formatarTabelaPalpites(linhas, "OITAVAS");
    expect(linhasDoBloco(saida).at(0)).toBe("Diego  J1 2x1 | J2 0x0");
  });

  it("alinha a coluna J1 (nomes preenchidos), inclusive nome longo", () => {
    const comNomeLongo: LinhaTabelaPalpites[] = [
      { nome: "Maximiliano", palpites: [palpite(1, 3, 0)] },
      { nome: "Bia", palpites: [palpite(1, 0, 1)] },
    ];
    const saida = formatarTabelaPalpites(comNomeLongo, "QUARTAS");
    const colunasJ1 = linhasDoBloco(saida).map((l) => l.indexOf("J1"));
    expect(new Set(colunasJ1).size).toBe(1);
  });

  it("NÃO coloca os nomes em negrito (priorizamos o alinhamento — §15.4)", () => {
    const saida = formatarTabelaPalpites(linhas, "OITAVAS");
    // Dentro do bloco não há asteriscos (negrito não renderiza em monoespaçado).
    expect(linhasDoBloco(saida).join("\n")).not.toContain("*");
  });

  it("aguenta 16 jogos por linha (16-avos), com J16 presente", () => {
    const dezesseis = Array.from({ length: 16 }, (_, i) => palpite(i + 1, i % 3, 0));
    const saida = formatarTabelaPalpites([{ nome: "Diego", palpites: dezesseis }], "16-AVOS");
    expect(linhasDoBloco(saida).at(0)).toContain("J16");
  });
});
