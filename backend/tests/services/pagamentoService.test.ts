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
