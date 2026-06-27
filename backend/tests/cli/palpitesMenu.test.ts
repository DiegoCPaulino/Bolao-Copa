import * as prompts from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { menuPalpites } from "../../src/cli/menus/palpitesMenu.js";
import * as palpiteService from "../../src/services/palpiteService.js";
import * as rodadaService from "../../src/services/rodadaService.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Teste LEVE do adaptador de Palpites (peso fica no serviço). Mocka os prompts e usa
 * serviço + banco REAIS: prova o fluxo "menu → serviço → Postgres" e a exportação da
 * tabela (§12.2).
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

async function montarRodada(qtdJogos: number) {
  const jogos = [];
  for (let i = 0; i < qtdJogos; i++) {
    const e = await prisma.selecao.create({ data: { nome: `E${i}`, bandeira: "🏳️" } });
    const d = await prisma.selecao.create({ data: { nome: `D${i}`, bandeira: "🏳️" } });
    jogos.push({ selecaoEsquerdaId: e.id, selecaoDireitaId: d.id });
  }
  return rodadaService.montarRodada("OITAVAS", jogos);
}

describe.skipIf(!temBanco)("menuPalpites (CLI leve, com Postgres)", () => {
  beforeEach(async () => {
    await limparBanco();
    select.mockReset();
    number.mockReset();
  });

  it("palpita jogo a jogo pelo menu (incremental); pular deixa o outro em branco", async () => {
    const rodada = await montarRodada(2);
    const ana = await prisma.participante.create({ data: { nome: "Ana" } });
    const j1 = rodada.jogos[0];
    if (!j1) throw new Error("setup");

    // Fluxo incremental: escolhe rodada e participante, palpita SÓ o J1, e "Voltar"
    // (saída real do while). O J2 não é escolhido → fica em branco ("pular" implícito).
    select
      .mockResolvedValueOnce("registrar") // menu principal: entrar em registrar
      .mockResolvedValueOnce(rodada.id) // qual rodada
      .mockResolvedValueOnce(ana.id) // qual participante
      .mockResolvedValueOnce(j1.id) // laço de palpites: palpitar o J1
      .mockResolvedValueOnce("voltar") // laço de palpites: sair (volta ao menu)
      .mockResolvedValueOnce("voltar"); // menu principal: sair (término real)
    number
      .mockResolvedValueOnce(2) // J1 esquerda
      .mockResolvedValueOnce(1); // J1 direita
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await menuPalpites();
    log.mockRestore();

    expect(await prisma.palpite.count()).toBe(1); // só o J1 (J2 pulado)
    const j1Palpite = await prisma.palpite.findUnique({
      where: { participanteId_jogoId: { participanteId: ana.id, jogoId: j1.id } },
    });
    expect(j1Palpite).toMatchObject({ golsEsquerda: 2, golsDireita: 1 });
  });

  it("exporta a tabela de palpites (§12.2)", async () => {
    const rodada = await montarRodada(1);
    const ana = await prisma.participante.create({ data: { nome: "Ana" } });
    const j1 = rodada.jogos[0];
    if (!j1) throw new Error("setup");
    await palpiteService.registrarPalpites(rodada.id, ana.id, [
      { jogoId: j1.id, golsEsquerda: 2, golsDireita: 1 },
    ]);

    select
      .mockResolvedValueOnce("tabela")
      .mockResolvedValueOnce(rodada.id)
      .mockResolvedValueOnce("voltar");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await menuPalpites();
    const saida = log.mock.calls.map((c) => c.join(" ")).join("\n");
    log.mockRestore();

    expect(saida).toContain("PALPITES —");
    expect(saida).toContain("J1 2x1");
  });
});
