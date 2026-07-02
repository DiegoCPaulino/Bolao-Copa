import { describe, expect, it } from "vitest";
import {
  calcularTotaisPagamento,
  calcularValorAPagar,
  resolverValorAPagar,
  statusPublico,
} from "../../src/domain/pagamento.js";

describe("calcularValorAPagar (regra de indicação — funcional §8.7)", () => {
  // Tabela transcrita direto do funcional §8.7: cada indicado direto que entrou
  // abate R$ 5 do valor base de R$ 40.
  describe("tabela da §8.7", () => {
    it.each([
      { indicados: 0, valor: 40 },
      { indicados: 1, valor: 35 },
      { indicados: 2, valor: 30 },
      { indicados: 3, valor: 25 },
      { indicados: 4, valor: 20 },
      { indicados: 5, valor: 15 },
      { indicados: 6, valor: 10 },
      { indicados: 7, valor: 5 },
    ])("$indicados indicado(s) → R$ $valor", ({ indicados, valor }) => {
      expect(calcularValorAPagar(indicados)).toBe(valor);
    });
  });

  // Piso de R$ 5: a partir de 7 indicados a fórmula crua chegaria a 0 ou
  // negativo; o máximo(PISO, ...) tem que travar em 5 (funcional §8.7).
  describe("piso de R$ 5", () => {
    it.each([
      { indicados: 8, valor: 5 }, // crua: 40 − 40 = 0
      { indicados: 15, valor: 5 }, // crua: 40 − 75 = −35
    ])("$indicados indicado(s) → R$ $valor (trava no piso)", ({ indicados, valor }) => {
      expect(calcularValorAPagar(indicados)).toBe(valor);
    });
  });
});

describe("resolverValorAPagar (override de valor — fatia #4)", () => {
  // SEM override: cai na fórmula §8.7 (comportamento idêntico ao de hoje).
  describe("sem override (valorCustomizado null) → fórmula §8.7 intacta", () => {
    it.each([
      { indicados: 0, valor: 40 },
      { indicados: 1, valor: 35 },
      { indicados: 7, valor: 5 },
      { indicados: 15, valor: 5 }, // trava no piso
    ])("$indicados indicado(s) → R$ $valor", ({ indicados, valor }) => {
      expect(resolverValorAPagar({ valorCustomizado: null, qtdIndicadosDiretos: indicados })).toBe(
        valor,
      );
    });
  });

  // COM override: substitui a fórmula INTEIRA (base, desconto E piso). O nº de
  // indicados é ignorado por completo.
  describe("com override → substitui a fórmula (ignora indicação e piso)", () => {
    it("override R$ 20 vence a fórmula (mesmo com 0 indicados, que daria 40)", () => {
      expect(resolverValorAPagar({ valorCustomizado: 20, qtdIndicadosDiretos: 0 })).toBe(20);
    });
    it("override R$ 3 (abaixo do piso) é aceito — override é livre", () => {
      expect(resolverValorAPagar({ valorCustomizado: 3, qtdIndicadosDiretos: 0 })).toBe(3);
    });
    it("override R$ 0 é aceito (grátis manual)", () => {
      expect(resolverValorAPagar({ valorCustomizado: 0, qtdIndicadosDiretos: 5 })).toBe(0);
    });
    it("override ignora o nº de indicados (10 indicados, override 25 → 25)", () => {
      expect(resolverValorAPagar({ valorCustomizado: 25, qtdIndicadosDiretos: 10 })).toBe(25);
    });
  });
});

describe("calcularTotaisPagamento (totais do bolão — funcional §8.8)", () => {
  it("lista vazia → tudo zero", () => {
    expect(calcularTotaisPagamento([])).toEqual({ esperado: 0, recebido: 0, falta: 0 });
  });

  it("todos PENDENTE → recebido 0 e falta = esperado", () => {
    const participantes = [
      { valorAPagar: 40, status: "PENDENTE" as const },
      { valorAPagar: 35, status: "PENDENTE" as const },
    ];
    expect(calcularTotaisPagamento(participantes)).toEqual({
      esperado: 75,
      recebido: 0,
      falta: 75,
    });
  });

  it("todos PAGO → falta 0 e recebido = esperado", () => {
    const participantes = [
      { valorAPagar: 40, status: "PAGO" as const },
      { valorAPagar: 35, status: "PAGO" as const },
    ];
    expect(calcularTotaisPagamento(participantes)).toEqual({
      esperado: 75,
      recebido: 75,
      falta: 0,
    });
  });

  it("caso misto confere as três somas", () => {
    const participantes = [
      { valorAPagar: 40, status: "PAGO" as const },
      { valorAPagar: 35, status: "PENDENTE" as const },
      { valorAPagar: 20, status: "PAGO" as const },
    ];
    expect(calcularTotaisPagamento(participantes)).toEqual({
      esperado: 95,
      recebido: 60,
      falta: 35,
    });
  });
});

describe("statusPublico (override de apresentação — funcional §8.8)", () => {
  // A verdade é `status`; `exibirComoPago` só maquia a EXPORTAÇÃO. A função pura
  // resolve a visão pública: PAGO se já pago OU marcado para exibir como pago.
  it.each([
    { status: "PAGO" as const, exibirComoPago: false, publico: "PAGO" },
    { status: "PAGO" as const, exibirComoPago: true, publico: "PAGO" },
    { status: "PENDENTE" as const, exibirComoPago: true, publico: "PAGO" },
    { status: "PENDENTE" as const, exibirComoPago: false, publico: "PENDENTE" },
  ])("status=$status, exibirComoPago=$exibirComoPago → $publico", ({
    status,
    exibirComoPago,
    publico,
  }) => {
    expect(statusPublico({ status, exibirComoPago })).toBe(publico);
  });
});

describe("calcularTotaisPagamento alimentada com status PÚBLICOS (visão de exportação)", () => {
  // A MESMA função de soma, com duas entradas. Aqui provamos que, na visão pública,
  // o pendente "exibido como pago" CONTA em recebido/falta — senão a soma do prêmio
  // denunciaria o truque (funcional §8.8; CLAUDE.md §7.4).
  const linhas = [
    { valorAPagar: 40, status: "PAGO" as const, exibirComoPago: false },
    { valorAPagar: 35, status: "PENDENTE" as const, exibirComoPago: true }, // maquiado
    { valorAPagar: 20, status: "PENDENTE" as const, exibirComoPago: false },
  ];

  it("visão REAL: só o PAGO de verdade entra em recebido", () => {
    expect(calcularTotaisPagamento(linhas)).toEqual({ esperado: 95, recebido: 40, falta: 55 });
  });

  it("visão PÚBLICA: o exibido-como-pago também entra em recebido/falta", () => {
    const publicas = linhas.map((l) => ({ valorAPagar: l.valorAPagar, status: statusPublico(l) }));
    expect(calcularTotaisPagamento(publicas)).toEqual({ esperado: 95, recebido: 75, falta: 20 });
  });
});
