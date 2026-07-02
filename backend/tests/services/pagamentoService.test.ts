import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ParticipanteNaoEncontrado } from "../../src/domain/erros.js";
import * as service from "../../src/services/pagamentoService.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Testes do serviço de Pagamentos contra o Postgres de teste (mesma estratégia da
 * 4.1: bolao_test + limpeza entre casos; pula sem banco). PRIORIDADE: a regra de
 * indicação (funcional §8.7) e os totais com mix Pago/Pendente (§8.8).
 */
const temBanco = await bancoDisponivel();
if (!temBanco) {
  console.warn(
    "[integração] banco indisponível — testes de pagamento PULADOS. Rode `npm run test:db`.",
  );
}

/** Cria um participante cru (status PENDENTE e NÃO isento por padrão). */
function criar(
  nome: string,
  indicadorId: string | null = null,
  status: "PAGO" | "PENDENTE" = "PENDENTE",
  isento = false,
) {
  return prisma.participante.create({ data: { nome, indicadorId, status, isento } });
}

/** Valor a pagar DERIVADO de um participante, lido do quadro de pagamentos. */
async function valorDe(id: string): Promise<number> {
  const { participantes } = await service.listarPagamentos();
  const p = participantes.find((x) => x.id === id);
  if (!p) throw new Error(`participante ${id} ausente no quadro`);
  return p.valorAPagar;
}

describe.skipIf(!temBanco)("pagamentoService (integração com Postgres)", () => {
  beforeEach(limparBanco);
  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  describe("valor a pagar (derivado) e regra de indicação — §8.7", () => {
    it("reflete o nº de indicados diretos, respeitando o piso", async () => {
      const a = await criar("Ana");
      expect(await valorDe(a.id)).toBe(40); // 0 indicados

      await criar("Indicado 1", a.id);
      expect(await valorDe(a.id)).toBe(35); // 1 indicado → −5

      for (let i = 2; i <= 7; i++) {
        await criar(`Indicado ${i}`, a.id);
      }
      expect(await valorDe(a.id)).toBe(5); // 7 indicados → piso (40 − 35)

      await criar("Indicado 8", a.id);
      expect(await valorDe(a.id)).toBe(5); // 8 indicados → continua no piso
    });

    it("conta o indicado que ENTROU mesmo sem ele ter pago", async () => {
      const a = await criar("Ana");
      const b = await criar("Bruno", a.id); // PENDENTE por padrão (não pagou)

      expect((await prisma.participante.findUnique({ where: { id: b.id } }))?.status).toBe(
        "PENDENTE",
      );
      expect(await valorDe(a.id)).toBe(35); // mesmo assim Ana já tem o desconto
    });

    it("é SÓ direta: o avô não herda o desconto da cadeia", async () => {
      const a = await criar("Ana"); // avó
      const b = await criar("Bruno", a.id); // indicado por Ana
      const c = await criar("Carla", b.id); // indicada por Bruno (não por Ana)

      expect(await valorDe(a.id)).toBe(35); // só conta Bruno (1 direto)
      expect(await valorDe(b.id)).toBe(35); // só conta Carla (1 direto)
      expect(await valorDe(c.id)).toBe(40); // não indicou ninguém
    });
  });

  describe("totais — §8.8", () => {
    it("esperado/recebido/falta com mix Pago/Pendente", async () => {
      await criar("Ana", null, "PAGO");
      await criar("Bruno", null, "PENDENTE");
      await criar("Carla", null, "PAGO");

      const { totais } = await service.listarPagamentos();
      expect(totais.esperado).toBe(120); // 3 × 40
      expect(totais.recebido).toBe(80); // 2 pagos × 40
      expect(totais.falta).toBe(40); // 120 − 80
    });
  });

  describe("isenção de pagamento — §8.7/§8.8", () => {
    it("isento fica FORA da lista e dos totais (só os não-isentos contam)", async () => {
      await criar("Ana", null, "PAGO"); // paga 40
      await criar("Bruno", null, "PENDENTE"); // deve 40
      await criar("Zé", null, "PAGO", true); // ISENTO — não paga, não soma

      const { participantes, totais } = await service.listarPagamentos();

      // Zé some do quadro de pagamentos, embora exista como participante.
      expect(participantes.map((p) => p.nome)).toEqual(["Ana", "Bruno"]);
      // Totais batem só com Ana + Bruno; Zé, mesmo marcado PAGO, não entra.
      expect(totais.esperado).toBe(80); // 2 × 40
      expect(totais.recebido).toBe(40); // só Ana
      expect(totais.falta).toBe(40); // 80 − 40
    });

    it("marcar isento (false→true) remove dos pagamentos; voltar (true→false) traz com valor normal", async () => {
      const ze = await criar("Zé"); // não isento, PENDENTE → entra valendo 40
      const nomes = async () => (await service.listarPagamentos()).participantes.map((p) => p.nome);

      expect(await nomes()).toContain("Zé");

      await prisma.participante.update({ where: { id: ze.id }, data: { isento: true } });
      expect(await nomes()).not.toContain("Zé"); // saiu da cobrança

      await prisma.participante.update({ where: { id: ze.id }, data: { isento: false } });
      expect(await valorDe(ze.id)).toBe(40); // voltou com o valor normal
    });

    it("indicado isento ainda abate do indicador (ele ENTROU no bolão — §8.7)", async () => {
      const ana = await criar("Ana"); // não isenta
      await criar("Bruno", ana.id, "PENDENTE", true); // indicado por Ana, mas isento

      // A isenção tira Bruno da cobrança, não desfaz a indicação: Ana ganha o −R$5.
      expect(await valorDe(ana.id)).toBe(35);
    });
  });

  describe("valor customizado (override) — fatia #4", () => {
    it("override substitui a fórmula no valor e nos totais (ignora indicação e piso)", async () => {
      const ana = await criar("Ana"); // fórmula daria 40
      await criar("Indicado", ana.id); // Ana teria 35 pela fórmula
      // Override R$ 12 → paga 12, independente dos indicados.
      await prisma.participante.update({
        where: { id: ana.id },
        data: { valorCustomizado: 12 },
      });

      expect(await valorDe(ana.id)).toBe(12);

      const { participantes, totais } = await service.listarPagamentos();
      const linhaAna = participantes.find((p) => p.id === ana.id);
      expect(linhaAna?.valorCustomizado).toBe(12); // sinalizador cru p/ o marcador "manual"
      // Esperado = Ana(12, override) + Indicado(40, fórmula) = 52 (totais derivam de graça).
      expect(totais.esperado).toBe(52);
    });

    it("override abaixo do piso é aceito (R$ 3) — override é livre", async () => {
      const a = await criar("Ana");
      await prisma.participante.update({ where: { id: a.id }, data: { valorCustomizado: 3 } });
      expect(await valorDe(a.id)).toBe(3);
    });

    it("ISENTO vence o override: isento+override → fora da cobrança (precedência)", async () => {
      await criar("Ana", null, "PAGO"); // paga 40
      const ze = await criar("Zé", null, "PENDENTE", true); // isento
      await prisma.participante.update({ where: { id: ze.id }, data: { valorCustomizado: 99 } });

      const { participantes, totais } = await service.listarPagamentos();
      // Zé isento continua FORA — o override não o traz de volta (isento > override).
      expect(participantes.map((p) => p.nome)).toEqual(["Ana"]);
      expect(totais.esperado).toBe(40); // só Ana
    });
  });

  describe("visão pública (exibir como pago no grupo) — §8.8", () => {
    it("a exportação conta o pendente maquiado em recebido/falta; a visão real NÃO", async () => {
      await criar("Ana", null, "PAGO"); // paga 40 de verdade
      const bruno = await criar("Bruno", null, "PENDENTE"); // deve 40
      await criar("Carla", null, "PENDENTE"); // deve 40 (pendente de verdade)
      // Bruno é MAQUIADO: aparece como pago no grupo, sem mudar o status real.
      await prisma.participante.update({
        where: { id: bruno.id },
        data: { exibirComoPago: true },
      });

      // Visão REAL (painel/CLI/tabela): a verdade — só Ana pagou.
      const real = await service.listarPagamentos();
      expect(real.totais).toEqual({ esperado: 120, recebido: 40, falta: 80 });
      expect(real.participantes.find((p) => p.id === bruno.id)?.status).toBe("PENDENTE");
      // O sinalizador cru viaja na visão real (a tela mostra a verdade + avisa): Bruno
      // está marcado, Ana não. NÃO é a visão pública — `status` segue sendo o real.
      expect(real.participantes.find((p) => p.id === bruno.id)?.exibirComoPago).toBe(true);
      expect(real.participantes.find((p) => p.nome === "Ana")?.exibirComoPago).toBe(false);

      // Visão PÚBLICA (exportação): Bruno entra como PAGO nas seções E nos totais —
      // assim o prêmio (de `recebido`) fica consistente e a soma não denuncia.
      const publico = await service.listarPagamentosPublico();
      expect(publico.totais).toEqual({ esperado: 120, recebido: 80, falta: 40 });
      expect(publico.participantes.find((p) => p.id === bruno.id)?.status).toBe("PAGO");
      // Pendente de verdade e NÃO maquiado segue pendente até na visão pública.
      expect(publico.participantes.find((p) => p.nome === "Carla")?.status).toBe("PENDENTE");
    });

    it("o override só mexe em recebido/falta; `esperado` é igual nas duas visões", async () => {
      const a = await criar("Ana", null, "PENDENTE");
      await prisma.participante.update({ where: { id: a.id }, data: { exibirComoPago: true } });

      const real = await service.listarPagamentos();
      const publico = await service.listarPagamentosPublico();
      expect(publico.totais.esperado).toBe(real.totais.esperado); // status-independente
      expect(real.totais.recebido).toBe(0); // verdade: ninguém pagou
      expect(publico.totais.recebido).toBe(40); // maquiado entra na exportação
    });
  });

  describe("alternarStatus", () => {
    it("alterna Pago⇄Pendente e persiste", async () => {
      const a = await criar("Ana"); // PENDENTE

      const apos1 = await service.alternarStatus(a.id);
      expect(apos1.status).toBe("PAGO");
      expect((await prisma.participante.findUnique({ where: { id: a.id } }))?.status).toBe("PAGO");

      const apos2 = await service.alternarStatus(a.id);
      expect(apos2.status).toBe("PENDENTE");
    });

    it("rejeita id inexistente com erro tipado", async () => {
      await expect(service.alternarStatus("nao-existe")).rejects.toBeInstanceOf(
        ParticipanteNaoEncontrado,
      );
    });
  });
});
