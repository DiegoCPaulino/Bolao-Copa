import { describe, expect, it } from "vitest";
import {
  formatarTabelaPalpites,
  type JogoNaTabela,
  type LinhaTabelaPalpites,
} from "../../../src/domain/whatsapp/tabelaPalpites.js";

const palpite = (jogo: number, e: number, d: number) => ({
  jogo,
  placar: { golsEsquerda: e, golsDireita: d },
});

const jogo = (ordem: number, esq: [string, string], dir: [string, string]): JogoNaTabela => ({
  ordem,
  esquerda: { bandeira: esq[0], nome: esq[1] },
  direita: { bandeira: dir[0], nome: dir[1] },
});

const jogos: JogoNaTabela[] = [
  jogo(1, ["🇧🇷", "Brasil"], ["🇦🇷", "Argentina"]),
  jogo(2, ["🇫🇷", "França"], ["🇪🇸", "Espanha"]),
];

describe("formatarTabelaPalpites (artefato WhatsApp — funcional §13.2, POR JOGO)", () => {
  const linhas: LinhaTabelaPalpites[] = [
    { nome: "Diego", palpites: [palpite(1, 2, 1), palpite(2, 0, 0)] },
    { nome: "Ana", palpites: [palpite(1, 0, 0)] }, // só palpitou o J1
  ];

  it("tem header em negrito com a fase", () => {
    const saida = formatarTabelaPalpites(jogos, linhas, "OITAVAS");
    expect(saida.split("\n").at(0)).toBe("📋 *PALPITES — OITAVAS*");
  });

  it("agrupa POR JOGO, com o cabeçalho no formato da mensagem da rodada (⚽ *J{n}* … × …)", () => {
    const saida = formatarTabelaPalpites(jogos, linhas, "OITAVAS");
    expect(saida).toContain("⚽ *J1* 🇧🇷 Brasil × Argentina 🇦🇷");
    expect(saida).toContain("⚽ *J2* 🇫🇷 França × Espanha 🇪🇸");
  });

  it("lista os palpites do jogo em ordem ALFABÉTICA, um por linha", () => {
    const saida = formatarTabelaPalpites(jogos, linhas, "OITAVAS");
    const ls = saida.split("\n");
    const iJ1 = ls.indexOf("⚽ *J1* 🇧🇷 Brasil × Argentina 🇦🇷");
    // logo abaixo do J1: Ana antes de Diego (alfabético)
    expect(ls[iJ1 + 1]).toBe("Ana 0x0");
    expect(ls[iJ1 + 2]).toBe("Diego 2x1");
  });

  it("só quem palpitou o jogo aparece nele (Ana não está no J2)", () => {
    const saida = formatarTabelaPalpites(jogos, linhas, "OITAVAS");
    const ls = saida.split("\n");
    const blocoJ2 = ls.slice(ls.indexOf("⚽ *J2* 🇫🇷 França × Espanha 🇪🇸") + 1);
    expect(blocoJ2).toContain("Diego 0x0");
    expect(blocoJ2).not.toContain("Ana 0x0");
  });

  it("jogo sem nenhum palpite mostra o cabeçalho + placeholder (não some)", () => {
    const saida = formatarTabelaPalpites(
      jogos,
      [{ nome: "Ana", palpites: [palpite(1, 1, 0)] }],
      "OITAVAS",
    );
    const ls = saida.split("\n");
    expect(ls).toContain("⚽ *J2* 🇫🇷 França × Espanha 🇪🇸");
    expect(ls[ls.indexOf("⚽ *J2* 🇫🇷 França × Espanha 🇪🇸") + 1]).toBe("_(sem palpites ainda)_");
  });

  it("não usa bloco monoespaçado nem tabela (estrutura por emoji)", () => {
    const saida = formatarTabelaPalpites(jogos, linhas, "OITAVAS");
    expect(saida).not.toContain("```");
  });

  it("desambigua homônimos com apelido, dentro do jogo", () => {
    const homonimos: LinhaTabelaPalpites[] = [
      { nome: "João", apelido: "Barba", palpites: [palpite(1, 1, 0)] },
      { nome: "João", apelido: "Magro", palpites: [palpite(1, 2, 2)] },
    ];
    const saida = formatarTabelaPalpites([jogos[0] as JogoNaTabela], homonimos, "OITAVAS");
    expect(saida).toContain("João (Barba) 1x0");
    expect(saida).toContain("João (Magro) 2x2");
  });

  it("aguenta 16 jogos (16-avos): J16 presente, sem quebrar", () => {
    const dezesseis = Array.from({ length: 16 }, (_, i) =>
      jogo(i + 1, ["🇧🇷", `Casa${i + 1}`], ["🇦🇷", `Fora${i + 1}`]),
    );
    const saida = formatarTabelaPalpites(
      dezesseis,
      [{ nome: "Ana", palpites: [palpite(16, 1, 0)] }],
      "16-AVOS",
    );
    expect(saida).toContain("⚽ *J16* 🇧🇷 Casa16 × Fora16 🇦🇷");
    expect(saida).toContain("Ana 1x0");
  });
});
