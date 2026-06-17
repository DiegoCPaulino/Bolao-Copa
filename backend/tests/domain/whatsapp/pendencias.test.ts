import { describe, expect, it } from "vitest";
import { formatarPendencias } from "../../../src/domain/whatsapp/pendencias.js";

describe("formatarPendencias (artefato WhatsApp — funcional §12.8)", () => {
  const pendentes = [{ nome: "Ana" }, { nome: "João" }, { nome: "Pedro" }];

  it("tem header em negrito com a fase", () => {
    const saida = formatarPendencias(pendentes, "OITAVAS");
    expect(saida.split("\n").at(0)).toBe("⚠️ *FALTAM PALPITES — OITAVAS*");
  });

  it("lista quem ainda não enviou, separado por vírgula", () => {
    const saida = formatarPendencias(pendentes, "OITAVAS");
    expect(saida).toContain("Ainda não enviaram: Ana, João, Pedro");
  });

  it("inclui a chamada à ação", () => {
    const saida = formatarPendencias(pendentes, "OITAVAS");
    expect(saida.split("\n").at(-1)).toBe("Mandem antes do início dos jogos! ⏰");
  });

  it("desambigua homônimos dentro do subconjunto exibido", () => {
    const comHomonimos = [
      { nome: "João", apelido: "Barba" },
      { nome: "João", apelido: "Magro" },
    ];
    const saida = formatarPendencias(comHomonimos, "QUARTAS");
    expect(saida).toContain("Ainda não enviaram: João (Barba), João (Magro)");
  });
});
