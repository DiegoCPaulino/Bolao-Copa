import * as prompts from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { menuRodadas } from "../../src/cli/menus/rodadasMenu.js";
import * as rodadaService from "../../src/services/rodadaService.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Teste LEVE do adaptador de Rodadas (peso fica no serviço). Mocka os prompts e usa
 * serviço + banco REAIS: prova o picker par a par (menu → serviço → Postgres) e a
 * exportação da mensagem da rodada (§12.1).
 */
vi.mock("@inquirer/prompts", () => ({
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
  number: vi.fn(),
}));

const select = vi.mocked(prompts.select);
const number = vi.mocked(prompts.number);
const temBanco = await bancoDisponivel();

function mkSel(nome: string, bandeira = "🏳️") {
  return prisma.selecao.create({ data: { nome, bandeira } });
}

describe.skipIf(!temBanco)("menuRodadas (CLI leve, com Postgres)", () => {
  beforeEach(async () => {
    await limparBanco();
    select.mockReset();
    number.mockReset();
  });

  it("monta a rodada final (2 jogos) de forma INCREMENTAL: cria vazia e adiciona jogo a jogo", async () => {
    const [a, b, c, d] = await Promise.all([mkSel("A"), mkSel("B"), mkSel("C"), mkSel("D")]);
    // Fluxo do menu incremental: cria a rodada VAZIA e cai no laço "gerenciar jogos",
    // onde cada jogo é adicionado (esquerda → direita). As DUAS saídas "voltar" são a
    // condição de término real dos dois `while` (gerenciar jogos, depois o menu) — sem
    // elas o mock esgotaria em `undefined` e o laço giraria infinito.
    select
      .mockResolvedValueOnce("montar") // menu → "Montar rodada (nova)"
      .mockResolvedValueOnce("FINAL") // fase → cria a rodada VAZIA
      .mockResolvedValueOnce("adicionar") // gerenciar jogos → Adicionar jogo
      .mockResolvedValueOnce(a.id) // jogo 1 — esquerda
      .mockResolvedValueOnce(b.id) // jogo 1 — direita
      .mockResolvedValueOnce("adicionar") // gerenciar jogos → Adicionar jogo
      .mockResolvedValueOnce(c.id) // jogo 2 — esquerda
      .mockResolvedValueOnce(d.id) // jogo 2 — direita
      .mockResolvedValueOnce("voltar") // sai do laço de jogos
      .mockResolvedValueOnce("voltar"); // sai do menu de rodadas
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await menuRodadas();
    log.mockRestore();

    const rodadas = await prisma.rodada.findMany({ include: { jogos: true } });
    expect(rodadas).toHaveLength(1);
    expect(rodadas[0]?.fase).toBe("FINAL");
    expect(rodadas[0]?.jogos).toHaveLength(2);
  });

  it("exporta a mensagem da rodada (§12.1) pronta para o WhatsApp", async () => {
    const [a, b] = await Promise.all([mkSel("Brasil", "🇧🇷"), mkSel("Argentina", "🇦🇷")]);
    const r = await rodadaService.montarRodada("OITAVAS", [
      { selecaoEsquerdaId: a.id, selecaoDireitaId: b.id },
    ]);
    select
      .mockResolvedValueOnce("exportar")
      .mockResolvedValueOnce(r.id)
      .mockResolvedValueOnce("voltar");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await menuRodadas();
    const saida = log.mock.calls.map((c) => c.join(" ")).join("\n");
    log.mockRestore();

    expect(saida).toContain("BOLÃO COPA 2026 — OITAVAS DE FINAL");
    expect(saida).toContain("1️⃣");
    expect(saida).toContain("Brasil");
  });
});
