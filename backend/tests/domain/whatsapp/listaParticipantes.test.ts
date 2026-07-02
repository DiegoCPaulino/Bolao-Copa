import { describe, expect, it } from "vitest";
import { formatarListaParticipantes } from "../../../src/domain/whatsapp/listaParticipantes.js";

// Linhas de dados = tudo após o header (a lista numerada).
const linhasDeDados = (saida: string) => saida.split("\n").slice(1);

describe("formatarListaParticipantes (artefato WhatsApp — funcional §12.6)", () => {
  it("tem header em negrito com a contagem certa", () => {
    const saida = formatarListaParticipantes([
      { nome: "Diego" },
      { nome: "Lucas" },
      { nome: "Ana" },
    ]);
    expect(saida.split("\n").at(0)).toBe("👥 *PARTICIPANTES (3)*");
  });

  it("é LISTA NUMERADA em ordem ALFABÉTICA (ordena mesmo se a entrada não vier ordenada)", () => {
    const saida = formatarListaParticipantes([
      { nome: "Diego" },
      { nome: "Lucas" },
      { nome: "Ana" },
    ]);
    // Entrada Diego/Lucas/Ana → saída alfabética Ana/Diego/Lucas, numerada 1..3.
    expect(linhasDeDados(saida)).toEqual(["1. Ana", "2. Diego", "3. Lucas"]);
  });

  it("não usa sintaxe de tabela", () => {
    const saida = formatarListaParticipantes([{ nome: "Diego" }, { nome: "Lucas" }]);
    expect(saida).not.toContain("|");
  });

  it("desambigua homônimos com apelido; nome único fica sem apelido", () => {
    const saida = formatarListaParticipantes([
      { nome: "João", apelido: "Barba" },
      { nome: "João", apelido: "Magro" },
      { nome: "Ana", apelido: "Loira" },
    ]);
    expect(saida).toContain("João (Barba)");
    expect(saida).toContain("João (Magro)");
    expect(saida).toContain("Ana");
    expect(saida).not.toContain("(Loira)"); // Ana é única → sem apelido
  });

  it("apelido entra como critério secundário de ordenação (mesmo nome)", () => {
    const saida = formatarListaParticipantes([
      { nome: "João", apelido: "Magro" },
      { nome: "João", apelido: "Barba" },
    ]);
    // Barba antes de Magro (apelido desempata a ordem alfabética).
    expect(linhasDeDados(saida)).toEqual(["1. João (Barba)", "2. João (Magro)"]);
  });

  it("aguenta 63 nomes sem quebrar (63 linhas numeradas)", () => {
    const participantes = Array.from({ length: 63 }, (_, i) => ({ nome: `P${i + 1}` }));
    const saida = formatarListaParticipantes(participantes);
    expect(saida.split("\n").at(0)).toBe("👥 *PARTICIPANTES (63)*");
    expect(linhasDeDados(saida)).toHaveLength(63);
    // Toda linha de dados segue "N. Nome".
    expect(linhasDeDados(saida).every((l) => /^\d+\. /.test(l))).toBe(true);
  });
});
