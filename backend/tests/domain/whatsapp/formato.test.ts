import { describe, expect, it } from "vitest";
import {
  monoBloco,
  negrito,
  preencherDireita,
  reais,
} from "../../../src/domain/whatsapp/formato.js";

describe("formato (primitivos de formatação WhatsApp)", () => {
  describe("negrito", () => {
    it("envolve o texto em asteriscos (sintaxe de negrito do WhatsApp)", () => {
      expect(negrito("Diego")).toBe("*Diego*");
    });
  });

  describe("reais", () => {
    it("valor pequeno fica sem separador de milhar", () => {
      expect(reais(35)).toBe("R$ 35");
    });
    it("zero vira R$ 0", () => {
      expect(reais(0)).toBe("R$ 0");
    });
    it("milhares usam ponto como separador pt-BR", () => {
      expect(reais(850)).toBe("R$ 850");
      expect(reais(1450)).toBe("R$ 1.450");
      expect(reais(2300)).toBe("R$ 2.300");
    });
  });

  describe("monoBloco", () => {
    it("envolve o texto em crases triplas (monoespaçado do WhatsApp)", () => {
      expect(monoBloco("linha1\nlinha2")).toBe("```\nlinha1\nlinha2\n```");
    });
  });

  describe("preencherDireita", () => {
    it("completa com espaços à direita até a largura", () => {
      expect(preencherDireita("Ana", 5)).toBe("Ana  ");
    });
    it("não altera texto já na largura", () => {
      expect(preencherDireita("Diego", 5)).toBe("Diego");
    });
    it("não trunca texto maior que a largura", () => {
      expect(preencherDireita("Longo", 3)).toBe("Longo");
    });
  });
});
