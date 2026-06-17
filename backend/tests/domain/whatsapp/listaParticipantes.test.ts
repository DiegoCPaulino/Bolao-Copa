import { describe, expect, it } from "vitest";
import { formatarListaParticipantes } from "../../../src/domain/whatsapp/listaParticipantes.js";

// Pega a 2ª linha (a dos nomes) de forma segura sob noUncheckedIndexedAccess.
const linhaDeNomes = (saida: string) => saida.split("\n").at(1) ?? "";

describe("formatarListaParticipantes (artefato WhatsApp — funcional §12.6)", () => {
  it("tem header em negrito com a contagem certa", () => {
    const saida = formatarListaParticipantes([
      { nome: "Diego" },
      { nome: "Lucas" },
      { nome: "Ana" },
    ]);
    // Estrutura do §12.6: "👥 *PARTICIPANTES (N)*" como primeira linha.
    expect(saida.split("\n").at(0)).toBe("👥 *PARTICIPANTES (3)*");
  });

  it("lista todos os nomes, separados por vírgula", () => {
    const saida = formatarListaParticipantes([
      { nome: "Diego" },
      { nome: "Lucas" },
      { nome: "Ana" },
    ]);
    expect(linhaDeNomes(saida)).toBe("Diego, Lucas, Ana");
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
    // Os dois "João" ganham apelido para se distinguirem...
    expect(saida).toContain("João (Barba)");
    expect(saida).toContain("João (Magro)");
    // ...e "Ana", sendo única, NÃO exibe apelido (mesmo tendo um).
    expect(saida).toContain("Ana");
    expect(saida).not.toContain("(Loira)");
  });

  it("aguenta 63 nomes sem quebrar", () => {
    const participantes = Array.from({ length: 63 }, (_, i) => ({ nome: `P${i + 1}` }));
    const saida = formatarListaParticipantes(participantes);
    expect(saida.split("\n").at(0)).toBe("👥 *PARTICIPANTES (63)*");
    expect(linhaDeNomes(saida).split(", ")).toHaveLength(63);
  });
});
