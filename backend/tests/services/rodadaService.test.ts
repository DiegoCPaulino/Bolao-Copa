import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  JogoComPalpites,
  JogoInvalido,
  JogoNaoEncontrado,
  RodadaNaoEncontrada,
  SelecaoInvalida,
} from "../../src/domain/erros.js";
import { ID_SELECAO_A_DEFINIR } from "../../src/domain/selecoes.js";
import * as service from "../../src/services/rodadaService.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Testes do serviço de Rodadas contra o Postgres de teste (mesma estratégia das
 * fatias anteriores). Foco: montar com times POSICIONAIS, validações, a rodada final
 * de 2 jogos (decisão #19) e a prova de que o estado é GUIA, não trava (§3.7).
 */
const temBanco = await bancoDisponivel();
if (!temBanco) {
  console.warn(
    "[integração] banco indisponível — testes de rodada PULADOS. Rode `npm run test:db`.",
  );
}

/** Cria uma seleção no catálogo (nome é @unique). */
function mkSel(nome: string, bandeira = "🏳️") {
  return prisma.selecao.create({ data: { nome, bandeira } });
}

describe.skipIf(!temBanco)("rodadaService (integração com Postgres)", () => {
  beforeEach(limparBanco);
  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  describe("montarRodada", () => {
    it("cria a rodada (MONTADA) e os jogos com ordem 1..N e times posicionais", async () => {
      const [a, b, c, d] = await Promise.all([mkSel("A"), mkSel("B"), mkSel("C"), mkSel("D")]);

      const rodada = await service.montarRodada("OITAVAS", [
        { selecaoEsquerdaId: a.id, selecaoDireitaId: b.id },
        { selecaoEsquerdaId: c.id, selecaoDireitaId: d.id },
      ]);

      expect(rodada.fase).toBe("OITAVAS");
      expect(rodada.ordem).toBe(1);
      expect(rodada.estado).toBe("MONTADA");
      expect(rodada.jogos).toHaveLength(2);
      // Posicional: esquerda/direita guardadas exatamente como entraram (2×1 ≠ 1×2).
      expect(rodada.jogos[0]?.ordem).toBe(1);
      expect(rodada.jogos[0]?.selecaoEsquerdaId).toBe(a.id);
      expect(rodada.jogos[0]?.selecaoDireitaId).toBe(b.id);
      expect(rodada.jogos[1]?.ordem).toBe(2);
      // Nasce sem placar real.
      expect(rodada.jogos[0]?.golsEsquerdaReal).toBeNull();
    });

    it("a ORDEM é derivada pelo serviço na sequência (1ª → 1, 2ª → 2)", async () => {
      const [a, b, c, d] = await Promise.all([mkSel("A"), mkSel("B"), mkSel("C"), mkSel("D")]);

      const primeira = await service.montarRodada("OITAVAS", [
        { selecaoEsquerdaId: a.id, selecaoDireitaId: b.id },
      ]);
      const segunda = await service.montarRodada("QUARTAS", [
        { selecaoEsquerdaId: c.id, selecaoDireitaId: d.id },
      ]);

      // O chamador NÃO passa ordem — o serviço a atribui (próxima da sequência).
      expect(primeira.ordem).toBe(1);
      expect(segunda.ordem).toBe(2);
    });

    it("rejeita seleção inexistente", async () => {
      const a = await mkSel("A");
      await expect(
        service.montarRodada("OITAVAS", [
          { selecaoEsquerdaId: a.id, selecaoDireitaId: "nao-existe" },
        ]),
      ).rejects.toBeInstanceOf(SelecaoInvalida);
    });

    it("rejeita o mesmo time nos dois lados de um jogo", async () => {
      const a = await mkSel("A");
      await expect(
        service.montarRodada("OITAVAS", [{ selecaoEsquerdaId: a.id, selecaoDireitaId: a.id }]),
      ).rejects.toBeInstanceOf(JogoInvalido);
    });

    it("rejeita rodada sem jogos", async () => {
      await expect(service.montarRodada("OITAVAS", [])).rejects.toBeInstanceOf(JogoInvalido);
    });

    it("monta a rodada final com 2 jogos, sem código especial (decisão #19)", async () => {
      const [a, b, c, d] = await Promise.all([mkSel("A"), mkSel("B"), mkSel("C"), mkSel("D")]);

      const final = await service.montarRodada("FINAL", [
        { selecaoEsquerdaId: a.id, selecaoDireitaId: b.id }, // 3º lugar
        { selecaoEsquerdaId: c.id, selecaoDireitaId: d.id }, // final
      ]);

      expect(final.fase).toBe("FINAL");
      expect(final.jogos).toHaveLength(2);
    });
  });

  describe("estado é GUIA, não trava (§3.7)", () => {
    it("permite qualquer transição e não bloqueia ações", async () => {
      const [a, b] = await Promise.all([mkSel("A"), mkSel("B")]);
      const r = await service.montarRodada("OITAVAS", [
        { selecaoEsquerdaId: a.id, selecaoDireitaId: b.id },
      ]);
      expect(r.estado).toBe("MONTADA");

      // Salta direto para ENCERRADA e VOLTA para um estado anterior — não há portão.
      expect((await service.definirEstado(r.id, "ENCERRADA")).estado).toBe("ENCERRADA");
      expect((await service.definirEstado(r.id, "PALPITES_ABERTOS")).estado).toBe(
        "PALPITES_ABERTOS",
      );

      // Mesmo "encerrada", detalhar/operar continua livre (nenhuma ação travada).
      await service.definirEstado(r.id, "ENCERRADA");
      expect((await service.detalharRodada(r.id)).jogos).toHaveLength(1);
    });
  });

  describe("detalhar / definir estado em rodada inexistente", () => {
    it("lança RodadaNaoEncontrada", async () => {
      await expect(service.detalharRodada("nao-existe")).rejects.toBeInstanceOf(
        RodadaNaoEncontrada,
      );
      await expect(service.definirEstado("nao-existe", "MONTADA")).rejects.toBeInstanceOf(
        RodadaNaoEncontrada,
      );
    });
  });

  describe("criarRodada (vazia) + montagem incremental", () => {
    it("cria a rodada VAZIA (MONTADA), ordem na sequência, sem jogos", async () => {
      const r = await service.criarRodada("OITAVAS");
      expect(r.fase).toBe("OITAVAS");
      expect(r.ordem).toBe(1);
      expect(r.estado).toBe("MONTADA");
      expect(r.jogos).toHaveLength(0);

      const r2 = await service.criarRodada("QUARTAS");
      expect(r2.ordem).toBe(2); // a ordem da RODADA segue a sequência (MAX+1)
    });

    it("adicionarJogo numera os jogos com MAX+1 (1 → 2 → 3) e guarda posicional", async () => {
      const [a, b, c, d, e, f] = await Promise.all([
        mkSel("A"),
        mkSel("B"),
        mkSel("C"),
        mkSel("D"),
        mkSel("E"),
        mkSel("F"),
      ]);
      const r0 = await service.criarRodada("OITAVAS");

      const r1 = await service.adicionarJogo(r0.id, a.id, b.id);
      expect(r1.jogos).toHaveLength(1);
      expect(r1.jogos[0]?.ordem).toBe(1);
      expect(r1.jogos[0]?.selecaoEsquerdaId).toBe(a.id);
      expect(r1.jogos[0]?.selecaoDireitaId).toBe(b.id);

      await service.adicionarJogo(r0.id, c.id, d.id);
      const r3 = await service.adicionarJogo(r0.id, e.id, f.id);
      expect(r3.jogos.map((j) => j.ordem)).toEqual([1, 2, 3]);
    });

    it("rejeita seleção inexistente, mesmo time nos dois lados e rodada inexistente", async () => {
      const a = await mkSel("A");
      const r = await service.criarRodada("OITAVAS");

      await expect(service.adicionarJogo(r.id, a.id, "nao-existe")).rejects.toBeInstanceOf(
        SelecaoInvalida,
      );
      await expect(service.adicionarJogo(r.id, a.id, a.id)).rejects.toBeInstanceOf(JogoInvalido);
      await expect(service.adicionarJogo("nao-existe", a.id, a.id)).rejects.toBeInstanceOf(
        RodadaNaoEncontrada,
      );
    });

    it("permite o mesmo time em jogos diferentes (sem unicidade por rodada — decisão #19)", async () => {
      const [a, b, c] = await Promise.all([mkSel("A"), mkSel("B"), mkSel("C")]);
      const r = await service.criarRodada("FINAL");
      await service.adicionarJogo(r.id, a.id, b.id);
      const r2 = await service.adicionarJogo(r.id, a.id, c.id); // "A" repetido entre jogos: ok
      expect(r2.jogos).toHaveLength(2);
    });
  });

  describe('seleção "A definir" (placeholder de lado não decidido)', () => {
    it('permite dois "A definir" no mesmo jogo (dois lados ainda não decididos)', async () => {
      const aDefinir = await prisma.selecao.create({
        data: { id: ID_SELECAO_A_DEFINIR, nome: "A definir", bandeira: "🏴" },
      });
      const r = await service.criarRodada("FINAL");
      const r2 = await service.adicionarJogo(r.id, aDefinir.id, aDefinir.id);
      expect(r2.jogos).toHaveLength(1);
      expect(r2.jogos[0]?.selecaoEsquerdaId).toBe(ID_SELECAO_A_DEFINIR);
      expect(r2.jogos[0]?.selecaoDireitaId).toBe(ID_SELECAO_A_DEFINIR);
    });

    it("ainda rejeita a mesma seleção REAL nos dois lados", async () => {
      const a = await mkSel("A");
      const r = await service.criarRodada("OITAVAS");
      await expect(service.adicionarJogo(r.id, a.id, a.id)).rejects.toBeInstanceOf(JogoInvalido);
    });
  });

  describe("editarJogo", () => {
    it("troca as seleções e mantém a ordem; não cria/duplica jogo", async () => {
      const [a, b, c] = await Promise.all([mkSel("A"), mkSel("B"), mkSel("C")]);
      const r = await service.criarRodada("OITAVAS");
      const comJogo = await service.adicionarJogo(r.id, a.id, b.id);
      const jogoId = comJogo.jogos[0]?.id ?? "";

      const editada = await service.editarJogo(jogoId, a.id, c.id);
      expect(editada.jogos).toHaveLength(1);
      expect(editada.jogos[0]?.ordem).toBe(1); // ordem preservada
      expect(editada.jogos[0]?.selecaoEsquerdaId).toBe(a.id);
      expect(editada.jogos[0]?.selecaoDireitaId).toBe(c.id);
    });

    it("rejeita par inválido e jogo inexistente", async () => {
      const [a, b] = await Promise.all([mkSel("A"), mkSel("B")]);
      const r = await service.criarRodada("OITAVAS");
      const comJogo = await service.adicionarJogo(r.id, a.id, b.id);
      const jogoId = comJogo.jogos[0]?.id ?? "";

      await expect(service.editarJogo(jogoId, a.id, a.id)).rejects.toBeInstanceOf(JogoInvalido);
      await expect(service.editarJogo("nao-existe", a.id, b.id)).rejects.toBeInstanceOf(
        JogoNaoEncontrado,
      );
    });
  });

  describe("removerJogo", () => {
    it("remove um jogo SEM palpites e NÃO renumera os demais (ordem é fato, não rótulo)", async () => {
      const [a, b, c, d, e, f] = await Promise.all([
        mkSel("A"),
        mkSel("B"),
        mkSel("C"),
        mkSel("D"),
        mkSel("E"),
        mkSel("F"),
      ]);
      const r = await service.criarRodada("OITAVAS");
      await service.adicionarJogo(r.id, a.id, b.id); // ordem 1
      const r2 = await service.adicionarJogo(r.id, c.id, d.id); // ordem 2
      await service.adicionarJogo(r.id, e.id, f.id); // ordem 3
      const jogo2 = r2.jogos[1];
      if (!jogo2) throw new Error("setup");

      const depois = await service.removerJogo(jogo2.id);
      // J2 some; J1 e J3 mantêm a ordem — buraco permitido (não renumera).
      expect(depois.jogos.map((j) => j.ordem)).toEqual([1, 3]);

      // o próximo jogo segue MAX+1 = 4 (a ordem 2 nunca é reusada).
      const r4 = await service.adicionarJogo(r.id, a.id, c.id);
      expect(r4.jogos.map((j) => j.ordem)).toEqual([1, 3, 4]);
    });

    it("RECUSA remover jogo que já tem palpites (palpite é dado real)", async () => {
      const [a, b] = await Promise.all([mkSel("A"), mkSel("B")]);
      const r = await service.criarRodada("OITAVAS");
      const comJogo = await service.adicionarJogo(r.id, a.id, b.id);
      const jogo = comJogo.jogos[0];
      if (!jogo) throw new Error("setup");

      const participante = await prisma.participante.create({ data: { nome: "Ana" } });
      await prisma.palpite.create({
        data: { participanteId: participante.id, jogoId: jogo.id, golsEsquerda: 1, golsDireita: 0 },
      });

      await expect(service.removerJogo(jogo.id)).rejects.toBeInstanceOf(JogoComPalpites);
      // o jogo continua lá (não removido).
      expect((await service.detalharRodada(r.id)).jogos).toHaveLength(1);
    });

    it("rejeita jogo inexistente", async () => {
      await expect(service.removerJogo("nao-existe")).rejects.toBeInstanceOf(JogoNaoEncontrado);
    });
  });
});
