import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  JogoForaDaRodada,
  PalpiteInvalido,
  ParticipanteNaoEncontrado,
  RodadaNaoEncontrada,
} from "../../src/domain/erros.js";
import * as service from "../../src/services/palpiteService.js";
import * as rodadaService from "../../src/services/rodadaService.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Testes do serviço de Palpites contra o Postgres de teste. Foco: upsert (criar vs
 * ATUALIZAR — correção §8.6, prova o @@unique), pendentes BINÁRIO (parcial não conta),
 * palpite em jogo de outra rodada e gols negativos rejeitados.
 */
const temBanco = await bancoDisponivel();
if (!temBanco) {
  console.warn(
    "[integração] banco indisponível — testes de palpite PULADOS. Rode `npm run test:db`.",
  );
}

/** Monta uma rodada com `qtdJogos` jogos (cria as seleções) e devolve-a detalhada. */
async function montarRodada(qtdJogos: number, ordem = 1) {
  const jogos = [];
  for (let i = 0; i < qtdJogos; i++) {
    const esquerda = await prisma.selecao.create({
      data: { nome: `E${ordem}-${i}`, bandeira: "🏳️" },
    });
    const direita = await prisma.selecao.create({
      data: { nome: `D${ordem}-${i}`, bandeira: "🏳️" },
    });
    jogos.push({ selecaoEsquerdaId: esquerda.id, selecaoDireitaId: direita.id });
  }
  return rodadaService.montarRodada("OITAVAS", ordem, jogos);
}

function criarParticipante(nome: string, apelido: string | null = null) {
  return prisma.participante.create({ data: { nome, apelido } });
}

describe.skipIf(!temBanco)("palpiteService (integração com Postgres)", () => {
  beforeEach(limparBanco);
  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  describe("registrarPalpites (upsert / correção §8.6)", () => {
    it("cria os palpites e, ao relançar, ATUALIZA sem duplicar (@@unique)", async () => {
      const rodada = await montarRodada(2);
      const j1 = rodada.jogos[0];
      const j2 = rodada.jogos[1];
      if (!j1 || !j2) throw new Error("setup");
      const p = await criarParticipante("Ana");

      await service.registrarPalpites(rodada.id, p.id, [
        { jogoId: j1.id, golsEsquerda: 2, golsDireita: 1 },
        { jogoId: j2.id, golsEsquerda: 0, golsDireita: 0 },
      ]);
      expect(await prisma.palpite.count()).toBe(2);

      // Relança/corrige o J1: atualiza a linha existente, NÃO cria outra.
      await service.registrarPalpites(rodada.id, p.id, [
        { jogoId: j1.id, golsEsquerda: 3, golsDireita: 1 },
      ]);
      expect(await prisma.palpite.count()).toBe(2);
      const corrigido = await prisma.palpite.findUnique({
        where: { participanteId_jogoId: { participanteId: p.id, jogoId: j1.id } },
      });
      expect(corrigido?.golsEsquerda).toBe(3);
    });

    it("rejeita jogo de outra rodada", async () => {
      const r1 = await montarRodada(1, 1);
      const r2 = await montarRodada(1, 2);
      const jogoDeOutra = r2.jogos[0];
      if (!jogoDeOutra) throw new Error("setup");
      const p = await criarParticipante("Ana");

      await expect(
        service.registrarPalpites(r1.id, p.id, [
          { jogoId: jogoDeOutra.id, golsEsquerda: 1, golsDireita: 0 },
        ]),
      ).rejects.toBeInstanceOf(JogoForaDaRodada);
    });

    it("rejeita gols negativos", async () => {
      const rodada = await montarRodada(1);
      const j1 = rodada.jogos[0];
      if (!j1) throw new Error("setup");
      const p = await criarParticipante("Ana");

      await expect(
        service.registrarPalpites(rodada.id, p.id, [
          { jogoId: j1.id, golsEsquerda: -1, golsDireita: 0 },
        ]),
      ).rejects.toBeInstanceOf(PalpiteInvalido);
    });

    it("rejeita rodada e participante inexistentes", async () => {
      await expect(service.registrarPalpites("nao-existe", "x", [])).rejects.toBeInstanceOf(
        RodadaNaoEncontrada,
      );
      const rodada = await montarRodada(1);
      await expect(service.registrarPalpites(rodada.id, "nao-existe", [])).rejects.toBeInstanceOf(
        ParticipanteNaoEncontrado,
      );
    });
  });

  describe("participantesPendentes (binário: parcial NÃO é pendente)", () => {
    it("lista só quem tem ZERO palpites na rodada", async () => {
      const rodada = await montarRodada(2);
      const j1 = rodada.jogos[0];
      if (!j1) throw new Error("setup");
      const ana = await criarParticipante("Ana");
      await criarParticipante("Bruno");

      // Ana palpita PARCIAL (só o J1); Bruno não palpita nada.
      await service.registrarPalpites(rodada.id, ana.id, [
        { jogoId: j1.id, golsEsquerda: 1, golsDireita: 0 },
      ]);

      const pendentes = await service.participantesPendentes(rodada.id);
      expect(pendentes.map((p) => p.nome)).toEqual(["Bruno"]); // Ana (parcial) não é pendente
    });
  });

  describe("dadosTabelaPalpites", () => {
    it("uma linha por quem palpitou, palpites ordenados por jogo", async () => {
      const rodada = await montarRodada(2);
      const j1 = rodada.jogos[0];
      const j2 = rodada.jogos[1];
      if (!j1 || !j2) throw new Error("setup");
      const ana = await criarParticipante("Ana", "Aninha");

      await service.registrarPalpites(rodada.id, ana.id, [
        { jogoId: j2.id, golsEsquerda: 0, golsDireita: 0 },
        { jogoId: j1.id, golsEsquerda: 2, golsDireita: 1 },
      ]);

      const linhas = await service.dadosTabelaPalpites(rodada.id);
      expect(linhas).toHaveLength(1);
      expect(linhas[0]?.nome).toBe("Ana");
      expect(linhas[0]?.palpites.map((p) => p.jogoOrdem)).toEqual([1, 2]);
      expect(linhas[0]?.palpites[0]).toMatchObject({
        jogoOrdem: 1,
        golsEsquerda: 2,
        golsDireita: 1,
      });
    });
  });
});
