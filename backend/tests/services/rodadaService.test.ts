import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { JogoInvalido, RodadaNaoEncontrada, SelecaoInvalida } from "../../src/domain/erros.js";
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

      const rodada = await service.montarRodada("OITAVAS", 1, [
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

    it("rejeita seleção inexistente", async () => {
      const a = await mkSel("A");
      await expect(
        service.montarRodada("OITAVAS", 1, [
          { selecaoEsquerdaId: a.id, selecaoDireitaId: "nao-existe" },
        ]),
      ).rejects.toBeInstanceOf(SelecaoInvalida);
    });

    it("rejeita o mesmo time nos dois lados de um jogo", async () => {
      const a = await mkSel("A");
      await expect(
        service.montarRodada("OITAVAS", 1, [{ selecaoEsquerdaId: a.id, selecaoDireitaId: a.id }]),
      ).rejects.toBeInstanceOf(JogoInvalido);
    });

    it("rejeita rodada sem jogos", async () => {
      await expect(service.montarRodada("OITAVAS", 1, [])).rejects.toBeInstanceOf(JogoInvalido);
    });

    it("monta a rodada final com 2 jogos, sem código especial (decisão #19)", async () => {
      const [a, b, c, d] = await Promise.all([mkSel("A"), mkSel("B"), mkSel("C"), mkSel("D")]);

      const final = await service.montarRodada("FINAL", 5, [
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
      const r = await service.montarRodada("OITAVAS", 1, [
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
});
