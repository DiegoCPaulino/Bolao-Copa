import * as prompts from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { menuResultados } from "../../src/cli/menus/resultadosMenu.js";
import * as palpiteService from "../../src/services/palpiteService.js";
import * as resultadoService from "../../src/services/resultadoService.js";
import * as rodadaService from "../../src/services/rodadaService.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Teste LEVE do adaptador de Resultados (peso fica no serviço). Mocka os prompts e usa
 * serviço + banco REAIS: prova o fluxo "menu → serviço → Postgres" e a exportação do
 * resumo do jogo (§12.3).
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

async function montarRodadaComJogo() {
  const e = await prisma.selecao.create({ data: { nome: "Brasil", bandeira: "🇧🇷" } });
  const d = await prisma.selecao.create({ data: { nome: "Argentina", bandeira: "🇦🇷" } });
  return rodadaService.montarRodada("OITAVAS", 1, [
    { selecaoEsquerdaId: e.id, selecaoDireitaId: d.id },
  ]);
}

describe.skipIf(!temBanco)("menuResultados (CLI leve, com Postgres)", () => {
  beforeEach(async () => {
    await limparBanco();
    select.mockReset();
    number.mockReset();
  });

  it("registra o resultado pelo menu e persiste só o placar real", async () => {
    const rodada = await montarRodadaComJogo();
    const jogo = rodada.jogos[0];
    if (!jogo) throw new Error("setup");

    select
      .mockResolvedValueOnce("registrar") // submenu
      .mockResolvedValueOnce(rodada.id) // qual rodada
      .mockResolvedValueOnce(jogo.id) // qual jogo
      .mockResolvedValueOnce("voltar");
    number.mockResolvedValueOnce(2).mockResolvedValueOnce(1); // 2 x 1
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await menuResultados();
    log.mockRestore();

    const salvo = await prisma.jogo.findUnique({ where: { id: jogo.id } });
    expect(salvo).toMatchObject({ golsEsquerdaReal: 2, golsDireitaReal: 1 });
  });

  it("exporta o resumo do jogo (§12.3) com os pontos calculados", async () => {
    const rodada = await montarRodadaComJogo();
    const jogo = rodada.jogos[0];
    if (!jogo) throw new Error("setup");
    const ana = await prisma.participante.create({ data: { nome: "Ana" } });
    await palpiteService.registrarPalpites(rodada.id, ana.id, [
      { jogoId: jogo.id, golsEsquerda: 2, golsDireita: 1 },
    ]);
    await resultadoService.registrarResultado(jogo.id, 2, 1);

    select
      .mockResolvedValueOnce("resumoJogo")
      .mockResolvedValueOnce(rodada.id)
      .mockResolvedValueOnce(jogo.id)
      .mockResolvedValueOnce("voltar");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await menuResultados();
    const saida = log.mock.calls.map((c) => c.join(" ")).join("\n");
    log.mockRestore();

    expect(saida).toContain("RESULTADO — Jogo 1");
    expect(saida).toContain("Ana");
    expect(saida).toContain("3 pts"); // Ana cravou o 2x1
  });
});
