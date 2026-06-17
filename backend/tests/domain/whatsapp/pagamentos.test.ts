import { describe, expect, it } from "vitest";
import type { TotaisPagamento } from "../../../src/domain/pagamento.js";
import {
  formatarPagamentos,
  type ParticipantePagamento,
} from "../../../src/domain/whatsapp/pagamentos.js";

const linha = (saida: string, prefixo: string) =>
  saida.split("\n").find((l) => l.startsWith(prefixo)) ?? "";

describe("formatarPagamentos (artefato WhatsApp — funcional §12.7)", () => {
  // Fixtures tipadas: a anotação garante o literal de `status` (senão o
  // inference de object-literal alargaria "PAGO" para string).
  const participantes: ParticipantePagamento[] = [
    { nome: "Diego", valorAPagar: 35, status: "PAGO" },
    { nome: "Lucas", valorAPagar: 40, status: "PAGO" },
    { nome: "Ana", valorAPagar: 40, status: "PENDENTE" },
    { nome: "João", valorAPagar: 30, status: "PENDENTE" },
  ];
  // Totais JÁ calculados (o formatador não recalcula): consistentes com a lista.
  const totais: TotaisPagamento = { esperado: 145, recebido: 75, falta: 70 };

  it("tem header em negrito", () => {
    const saida = formatarPagamentos(participantes, totais);
    expect(saida.split("\n").at(0)).toBe("💰 *PAGAMENTOS*");
  });

  it("lista os Pagos com ✅ e seus valores", () => {
    const saida = formatarPagamentos(participantes, totais);
    expect(linha(saida, "✅")).toBe("✅ Pagos: Diego (R$35), Lucas (R$40)");
  });

  it("lista os Pendentes com ⏳ e seus valores", () => {
    const saida = formatarPagamentos(participantes, totais);
    expect(linha(saida, "⏳")).toBe("⏳ Pendentes: Ana (R$40), João (R$30)");
  });

  it("fecha com a linha dos três totais (separados por |)", () => {
    const saida = formatarPagamentos(participantes, totais);
    expect(linha(saida, "Esperado:")).toBe("Esperado: R$ 145 | Recebido: R$ 75 | Falta: R$ 70");
  });

  it("desambigua homônimos dentro do artefato (usa nomeExibicao)", () => {
    const comHomonimos: ParticipantePagamento[] = [
      { nome: "João", apelido: "Barba", valorAPagar: 35, status: "PAGO" },
      { nome: "João", apelido: "Magro", valorAPagar: 40, status: "PAGO" },
    ];
    const saida = formatarPagamentos(comHomonimos, { esperado: 75, recebido: 75, falta: 0 });
    expect(linha(saida, "✅")).toBe("✅ Pagos: João (Barba) (R$35), João (Magro) (R$40)");
  });
});
