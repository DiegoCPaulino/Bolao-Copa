import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";
import { buildAppTeste, SENHA_TESTE } from "./fixtures.js";

/**
 * Fatia 8.4-A — rotas HTTP que faltavam para a Rodada-detalhe: palpite SINGULAR,
 * palpites-do-participante e os 3 reads JSON (pontuação, resumo do jogo, tabela). Via
 * `app.inject` autenticado e banco REAL. Prova o sob-demanda (lançar resultado → ler
 * pontuação/resumo/tabela já recalculados) e a coexistência com o palpite PLURAL.
 */
const temBanco = await bancoDisponivel();
if (!temBanco) console.warn("[integração] banco indisponível — testes HTTP 8.4-A PULADOS.");

const app: FastifyInstance = buildAppTeste();
let sessao: Record<string, string>;

const get = (url: string) => app.inject({ method: "GET", url, cookies: sessao });
const put = (url: string, payload?: Record<string, unknown>) =>
  app.inject({ method: "PUT", url, cookies: sessao, payload });
const post = (url: string, payload?: Record<string, unknown>) =>
  app.inject({ method: "POST", url, cookies: sessao, payload });

let selSeq = 0;
async function novaSelecao(): Promise<string> {
  const s = await prisma.selecao.create({ data: { nome: `S${selSeq++}`, bandeira: "🏳️" } });
  return s.id;
}

/** Monta uma rodada de 1 jogo (via POST atômico) + um participante; devolve os ids. */
async function setup() {
  const [e, d] = await Promise.all([novaSelecao(), novaSelecao()]);
  const rodada = (
    await post("/rodadas", {
      fase: "OITAVAS",
      jogos: [{ selecaoEsquerdaId: e, selecaoDireitaId: d }],
    })
  ).json() as { id: string; jogos: { id: string; ordem: number }[] };
  const ana = await prisma.participante.create({ data: { nome: "Ana" } });
  return { rodadaId: rodada.id, jogoId: rodada.jogos[0]?.id ?? "", anaId: ana.id };
}

beforeAll(async () => {
  await app.ready();
  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { senha: SENHA_TESTE },
  });
  const cookie = login.cookies.find((c) => c.name === "bolao_sessao");
  if (!cookie) throw new Error("login de teste não devolveu cookie");
  sessao = { [cookie.name]: cookie.value };
});
afterAll(async () => {
  await app.close();
  if (temBanco) await prisma.$disconnect();
});

describe.skipIf(!temBanco)("rotas da Rodada-detalhe (8.4-A, HTTP autenticado)", () => {
  beforeEach(limparBanco);

  it("palpite SINGULAR: registra (200), lê de volta, e relançar ATUALIZA sem duplicar", async () => {
    const { rodadaId, jogoId, anaId } = await setup();

    const reg = await put(`/participantes/${anaId}/rodadas/${rodadaId}/jogos/${jogoId}/palpite`, {
      golsEsquerda: 2,
      golsDireita: 1,
    });
    expect(reg.statusCode).toBe(200);
    expect(reg.json()).toMatchObject({
      jogoId,
      participanteId: anaId,
      golsEsquerda: 2,
      golsDireita: 1,
    });

    const lido = await get(`/participantes/${anaId}/rodadas/${rodadaId}/palpites`);
    expect(lido.statusCode).toBe(200);
    expect(lido.json()).toHaveLength(1);
    expect(lido.json()[0]).toMatchObject({ jogoId, golsEsquerda: 2, golsDireita: 1 });

    // upsert (correção §8.6): relançar o mesmo jogo atualiza, não cria outro.
    await put(`/participantes/${anaId}/rodadas/${rodadaId}/jogos/${jogoId}/palpite`, {
      golsEsquerda: 3,
      golsDireita: 1,
    });
    const lido2 = await get(`/participantes/${anaId}/rodadas/${rodadaId}/palpites`);
    expect(lido2.json()).toHaveLength(1);
    expect(lido2.json()[0].golsEsquerda).toBe(3);
  });

  it("sob-demanda: lançar resultado → pontuação/resumo/tabela já vêm RECALCULADOS", async () => {
    const { rodadaId, jogoId, anaId } = await setup();
    await put(`/participantes/${anaId}/rodadas/${rodadaId}/jogos/${jogoId}/palpite`, {
      golsEsquerda: 2,
      golsDireita: 1,
    });

    const res = await put(`/jogos/${jogoId}/resultado`, { golsEsquerda: 2, golsDireita: 1 }); // cravou
    expect(res.statusCode).toBe(200);

    const pont = await get(`/rodadas/${rodadaId}/pontuacao`);
    expect(pont.statusCode).toBe(200);
    expect(pont.json().find((l: { id: string }) => l.id === anaId)).toMatchObject({
      pontos: 3,
      placaresExatos: 1,
    });

    const resumo = await get(`/jogos/${jogoId}/resumo`);
    expect(resumo.statusCode).toBe(200);
    expect(resumo.json()).toMatchObject({ resultado: { golsEsquerda: 2, golsDireita: 1 } });
    expect(resumo.json().palpites.find((p: { nome: string }) => p.nome === "Ana")).toMatchObject({
      pontos: 3,
    });

    const tabela = await get(`/rodadas/${rodadaId}/tabela`);
    expect(tabela.statusCode).toBe(200);
    expect(
      tabela.json().find((l: { nome: string }) => l.nome === "Ana")?.palpites?.[0],
    ).toMatchObject({
      jogoOrdem: 1,
      golsEsquerda: 2,
      golsDireita: 1,
    });
  });

  it("erros: 404 rodada/participante (palpite), 404 jogo (resumo), 400 jogo de outra rodada", async () => {
    const { rodadaId, jogoId, anaId } = await setup();
    const corpo = { golsEsquerda: 1, golsDireita: 0 };

    expect(
      (await put(`/participantes/${anaId}/rodadas/nao-existe/jogos/${jogoId}/palpite`, corpo))
        .statusCode,
    ).toBe(404);
    expect(
      (await put(`/participantes/nao-existe/rodadas/${rodadaId}/jogos/${jogoId}/palpite`, corpo))
        .statusCode,
    ).toBe(404);
    expect((await get("/rodadas/nao-existe/pontuacao")).statusCode).toBe(404);
    expect((await get("/rodadas/nao-existe/tabela")).statusCode).toBe(404);
    expect((await get("/jogos/nao-existe/resumo")).statusCode).toBe(404);

    // jogo que existe mas é de OUTRA rodada → JogoForaDaRodada → 400
    const outra = await setup();
    const fora = await put(
      `/participantes/${anaId}/rodadas/${rodadaId}/jogos/${outra.jogoId}/palpite`,
      corpo,
    );
    expect(fora.statusCode).toBe(400);
    expect(fora.json()).toMatchObject({ erro: { codigo: "JOGO_FORA_DA_RODADA" } });
  });

  it("400 palpite inválido (gols negativos) e 400 resumo sem resultado", async () => {
    const { rodadaId, jogoId, anaId } = await setup();

    const invalido = await put(
      `/participantes/${anaId}/rodadas/${rodadaId}/jogos/${jogoId}/palpite`,
      {
        golsEsquerda: -1,
        golsDireita: 0,
      },
    );
    expect(invalido.statusCode).toBe(400);

    const semResultado = await get(`/jogos/${jogoId}/resumo`);
    expect(semResultado.statusCode).toBe(400);
    expect(semResultado.json()).toMatchObject({ erro: { codigo: "RESULTADO_NAO_REGISTRADO" } });
  });

  it("sem cookie → 401 (rotas novas nascem protegidas)", async () => {
    expect((await app.inject({ method: "GET", url: "/rodadas/x/pontuacao" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/jogos/x/resumo" })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: "/participantes/p/rodadas/r/jogos/j/palpite",
          payload: { golsEsquerda: 1, golsDireita: 0 },
        })
      ).statusCode,
    ).toBe(401);
  });

  it("coexistência: o palpite PLURAL continua funcionando", async () => {
    const { rodadaId, jogoId, anaId } = await setup();
    const plural = await put(`/participantes/${anaId}/rodadas/${rodadaId}/palpites`, {
      palpites: [{ jogoId, golsEsquerda: 1, golsDireita: 1 }],
    });
    expect(plural.statusCode).toBe(200);
    expect(plural.json()).toHaveLength(1);
  });
});
