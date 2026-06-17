import { describe, expect, it } from "vitest";
import { nomeExibicao } from "../../../src/domain/whatsapp/nomeExibicao.js";

describe("nomeExibicao (desambiguação de homônimos — funcional §27)", () => {
  it("nome único aparece sozinho, mesmo tendo apelido", () => {
    const ana = { nome: "Ana", apelido: "Loira" };
    const lista = [ana, { nome: "Bia" }];
    expect(nomeExibicao(ana, lista)).toBe("Ana");
  });

  it("homônimo com apelido recebe o apelido para desambiguar", () => {
    const joaoBarba = { nome: "João", apelido: "Barba" };
    const joaoMagro = { nome: "João", apelido: "Magro" };
    const lista = [joaoBarba, joaoMagro];
    expect(nomeExibicao(joaoBarba, lista)).toBe("João (Barba)");
    expect(nomeExibicao(joaoMagro, lista)).toBe("João (Magro)");
  });

  it("homônimo sem apelido aparece só com o nome (não há como desambiguar)", () => {
    const joaoSemApelido = { nome: "João" };
    const lista = [joaoSemApelido, { nome: "João", apelido: "Magro" }];
    expect(nomeExibicao(joaoSemApelido, lista)).toBe("João");
  });
});
