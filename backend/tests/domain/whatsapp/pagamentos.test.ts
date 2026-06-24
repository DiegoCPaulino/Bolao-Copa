import { describe, expect, it } from "vitest";
import {
  formatarPagamentos,
  type ParticipantePagamento,
  type PremiacaoPagamento,
} from "../../../src/domain/whatsapp/pagamentos.js";

const linha = (saida: string, prefixo: string) =>
  saida.split("\n").find((l) => l.startsWith(prefixo)) ?? "";

const linhas = (saida: string, prefixo: string) =>
  saida.split("\n").filter((l) => l.startsWith(prefixo));

describe("formatarPagamentos (artefato WhatsApp — funcional §12.7)", () => {
  // Fixtures tipadas: a anotação garante o literal de `status` (senão o
  // inference de object-literal alargaria "PAGO" para string).
  const participantes: ParticipantePagamento[] = [
    { nome: "Diego", valorAPagar: 35, status: "PAGO" },
    { nome: "Lucas", valorAPagar: 40, status: "PAGO" },
    { nome: "Ana", valorAPagar: 40, status: "PENDENTE" },
    { nome: "João", valorAPagar: 30, status: "PENDENTE" },
  ];
  // Premiação (75%) JÁ calculada (o formatador não recalcula). Só atual/potencial.
  const premiacao: PremiacaoPagamento = { premiacaoAtual: 90, premiacaoPotencial: 1065 };

  it("tem header em negrito", () => {
    const saida = formatarPagamentos(participantes, premiacao);
    expect(saida.split("\n").at(0)).toBe("💰 *PAGAMENTOS*");
  });

  it("tem o cabeçalho de seção dos Pagos em negrito (Pagos)", () => {
    const saida = formatarPagamentos(participantes, premiacao);
    expect(linha(saida, "✅")).toBe("✅ *Pagos*");
  });

  it("tem o cabeçalho de seção dos Pendentes em negrito (Pendentes)", () => {
    const saida = formatarPagamentos(participantes, premiacao);
    expect(linha(saida, "⏳")).toBe("⏳ *Pendentes*");
  });

  it("lista uma pessoa por linha, com travessão + valor via reais()", () => {
    const saida = formatarPagamentos(participantes, premiacao);
    expect(linhas(saida, "•")).toEqual([
      "• Diego — R$ 35",
      "• Lucas — R$ 40",
      "• Ana — R$ 40",
      "• João — R$ 30",
    ]);
  });

  it("fecha com a linha de PREMIAÇÃO no formato atual / potencial (via reais())", () => {
    const saida = formatarPagamentos(participantes, premiacao);
    expect(linha(saida, "🏆")).toBe("🏆 *Prêmio*: R$ 90 / R$ 1.065");
  });

  it("NÃO expõe pote bruto (Esperado/Recebido/Falta) nem a fatia do organizador (25%)", () => {
    const saida = formatarPagamentos(participantes, premiacao);
    expect(saida).not.toContain("Esperado");
    expect(saida).not.toContain("Recebido");
    expect(saida).not.toContain("Falta");
    expect(saida).not.toMatch(/organizador/i);
    expect(saida).not.toContain("25%");
  });

  it("omite a seção vazia (ninguém pago → sem cabeçalho ✅), mantendo o prêmio", () => {
    const soPendentes: ParticipantePagamento[] = [
      { nome: "Ana", valorAPagar: 40, status: "PENDENTE" },
    ];
    const saida = formatarPagamentos(soPendentes, { premiacaoAtual: 0, premiacaoPotencial: 30 });
    expect(linha(saida, "✅")).toBe("");
    expect(linha(saida, "⏳")).toBe("⏳ *Pendentes*");
    expect(linha(saida, "🏆")).toBe("🏆 *Prêmio*: R$ 0 / R$ 30");
  });

  it("desambigua homônimos dentro do artefato (usa nomeExibicao)", () => {
    const comHomonimos: ParticipantePagamento[] = [
      { nome: "João", apelido: "Barba", valorAPagar: 35, status: "PAGO" },
      { nome: "João", apelido: "Magro", valorAPagar: 40, status: "PAGO" },
    ];
    const saida = formatarPagamentos(comHomonimos, { premiacaoAtual: 56, premiacaoPotencial: 56 });
    expect(linhas(saida, "•")).toEqual(["• João (Barba) — R$ 35", "• João (Magro) — R$ 40"]);
  });
});
