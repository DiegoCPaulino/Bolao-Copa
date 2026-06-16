import { describe, expect, it } from "vitest";

// Teste trivial só para provar que a suíte roda (Fase 0). A regra de negócio
// de verdade — com os casos prontos dos documentos — chega na Fase 1.
describe("sanidade da suíte de testes", () => {
  it("soma 1 + 1 corretamente", () => {
    expect(1 + 1).toBe(2);
  });
});
