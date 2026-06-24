import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  IndicacaoInvalida,
  IndicadorNaoEncontrado,
  NomeObrigatorio,
  ParticipanteNaoEncontrado,
} from "../../src/domain/erros.js";
import * as service from "../../src/services/participanteService.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Testes do SERVIÇO contra o Postgres de teste (CLAUDE.md §10: o peso fica no
 * serviço, que é o código reusado pela Entrega 2). Isolamento: cada caso começa com
 * as tabelas zeradas (`beforeEach`). Sem banco no ar, a suíte inteira se pula —
 * rode `npm run test:db` com o Postgres ligado para exercitá-la de verdade.
 */
const temBanco = await bancoDisponivel();
if (!temBanco) {
  console.warn(
    "[integração] banco de teste indisponível — testes de serviço PULADOS. Rode `npm run test:db`.",
  );
}

const base = { nome: "Diego", apelido: null, indicadorId: null, isento: false } as const;

describe.skipIf(!temBanco)("participanteService (integração com Postgres)", () => {
  beforeEach(limparBanco);
  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  describe("criar", () => {
    it("persiste com status PENDENTE por padrão e sem indicador", async () => {
      const criado = await service.criarParticipante(base);
      expect(criado.id).toBeTruthy();
      expect(criado.nome).toBe("Diego");
      expect(criado.apelido).toBeNull();
      expect(criado.status).toBe("PENDENTE");
      expect(criado.indicadorId).toBeNull();
    });

    it("apara espaços do nome e rejeita nome em branco", async () => {
      const criado = await service.criarParticipante({ ...base, nome: "  Ana  " });
      expect(criado.nome).toBe("Ana");
      await expect(service.criarParticipante({ ...base, nome: "   " })).rejects.toBeInstanceOf(
        NomeObrigatorio,
      );
    });

    it("vincula a um indicador existente (indicação direta)", async () => {
      const indicador = await service.criarParticipante(base);
      const indicado = await service.criarParticipante({
        nome: "João",
        apelido: null,
        indicadorId: indicador.id,
      });
      expect(indicado.indicadorId).toBe(indicador.id);
      expect(await service.contarIndicadosDiretos(indicador.id)).toBe(1);
    });

    it("rejeita indicador inexistente com erro tipado", async () => {
      await expect(
        service.criarParticipante({ nome: "João", apelido: null, indicadorId: "nao-existe" }),
      ).rejects.toBeInstanceOf(IndicadorNaoEncontrado);
    });
  });

  describe("listar (busca / filtro / ordenação)", () => {
    it("ordena por nome e resolve o indicador", async () => {
      const indicador = await service.criarParticipante({ ...base, nome: "Bruno" });
      await service.criarParticipante({ nome: "Ana", apelido: null, indicadorId: indicador.id });

      const lista = await service.listarParticipantes({ ordenarPor: "nome" });
      expect(lista.map((p) => p.nome)).toEqual(["Ana", "Bruno"]);
      expect(lista[0]?.indicador?.nome).toBe("Bruno");
    });

    it("filtra por status e busca por nome/apelido (case-insensitive)", async () => {
      const pago = await service.criarParticipante({
        nome: "Carlos",
        apelido: "Cacá",
        indicadorId: null,
      });
      await service.criarParticipante({ nome: "Daniel", apelido: null, indicadorId: null });
      await prisma.participante.update({ where: { id: pago.id }, data: { status: "PAGO" } });

      expect((await service.listarParticipantes({ status: "PAGO" })).map((p) => p.nome)).toEqual([
        "Carlos",
      ]);
      expect((await service.listarParticipantes({ busca: "cac" })).map((p) => p.nome)).toEqual([
        "Carlos",
      ]);
    });
  });

  describe("editar", () => {
    it("atualiza nome, apelido e indicador", async () => {
      const indicador = await service.criarParticipante({ ...base, nome: "Bruno" });
      const alvo = await service.criarParticipante({ ...base, nome: "Ana" });

      const editado = await service.atualizarParticipante(alvo.id, {
        nome: "Ana Paula",
        apelido: "Aninha",
        indicadorId: indicador.id,
      });
      expect(editado.nome).toBe("Ana Paula");
      expect(editado.apelido).toBe("Aninha");
      expect(editado.indicadorId).toBe(indicador.id);
    });

    it("rejeita id inexistente e auto-indicação", async () => {
      await expect(service.atualizarParticipante("nao-existe", base)).rejects.toBeInstanceOf(
        ParticipanteNaoEncontrado,
      );
      const p = await service.criarParticipante(base);
      await expect(
        service.atualizarParticipante(p.id, { ...base, indicadorId: p.id }),
      ).rejects.toBeInstanceOf(IndicacaoInvalida);
    });
  });

  describe("isenção de pagamento (fato gravado — §8.7/§8.8)", () => {
    it("nasce não-isento por padrão e grava o fato quando marcado", async () => {
      const normal = await service.criarParticipante({ ...base, nome: "Normal" });
      expect(normal.isento).toBe(false);

      const isento = await service.criarParticipante({ ...base, nome: "Zé", isento: true });
      expect(isento.isento).toBe(true);
    });

    it("isento CONTINUA na lista de participantes (ele disputa normalmente)", async () => {
      await service.criarParticipante({ ...base, nome: "Zé", isento: true });
      const lista = await service.listarParticipantes();
      expect(lista.find((p) => p.nome === "Zé")?.isento).toBe(true);
    });

    it("editar alterna a isenção (false→true→false)", async () => {
      const p = await service.criarParticipante(base);
      expect((await service.atualizarParticipante(p.id, { ...base, isento: true })).isento).toBe(
        true,
      );
      expect((await service.atualizarParticipante(p.id, { ...base, isento: false })).isento).toBe(
        false,
      );
    });
  });

  describe("remover", () => {
    it("apaga o participante", async () => {
      const p = await service.criarParticipante(base);
      await service.removerParticipante(p.id);
      expect(await service.buscarParticipante(p.id)).toBeNull();
    });

    it("rejeita remover id inexistente", async () => {
      await expect(service.removerParticipante("nao-existe")).rejects.toBeInstanceOf(
        ParticipanteNaoEncontrado,
      );
    });

    it("ao remover um indicador, os indicados ficam (vínculo vira null)", async () => {
      const indicador = await service.criarParticipante({ ...base, nome: "Bruno" });
      const indicado = await service.criarParticipante({
        nome: "Ana",
        apelido: null,
        indicadorId: indicador.id,
      });

      await service.removerParticipante(indicador.id);

      const aindaVivo = await service.buscarParticipante(indicado.id);
      expect(aindaVivo).not.toBeNull();
      expect(aindaVivo?.indicadorId).toBeNull(); // ON DELETE SET NULL
    });
  });
});
