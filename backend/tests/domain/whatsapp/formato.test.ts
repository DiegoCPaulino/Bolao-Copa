import { describe, expect, it } from "vitest";
import { negrito } from "../../../src/domain/whatsapp/formato.js";

describe("formato (primitivos de formatação WhatsApp)", () => {
  describe("negrito", () => {
    it("envolve o texto em asteriscos (sintaxe de negrito do WhatsApp)", () => {
      expect(negrito("Diego")).toBe("*Diego*");
    });
  });
});
