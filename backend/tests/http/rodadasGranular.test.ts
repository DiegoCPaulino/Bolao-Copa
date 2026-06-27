import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";
import { buildAppTeste, SENHA_TESTE } from "./fixtures.js";

/**
 * Fatia 8.3-A — rotas HTTP GRANULARES de rodada/jogo (montagem incremental), via
 * `app.inject` autenticado e banco REAL. Provam o fluxo "montar rodada inteira pela
 * API": criar vazia → adicionar jogos → editar → remover → estado → detalhar. Cobrem
 * os erros (404/400/409) e a COEXISTÊNCIA com o POST atômico (Fase 6, intacto).
 */
const temBanco = await bancoDisponivel();
if (!temBanco) console.warn("[integração] banco indisponível — testes HTTP granulares PULADOS.");

const app: FastifyInstance = buildAppTeste();
let sessao: Record<string, string>;

const get = (url: string) => app.inject({ method: "GET", url, cookies: sessao });
const post = (url: string, payload?: Record<string, unknown>) =>
  app.inject({ method: "POST", url, cookies: sessao, payload });
const put = (url: string, payload?: Record<string, unknown>) =>
  app.inject({ method: "PUT", url, cookies: sessao, payload });
const del = (url: string) => app.inject({ method: "DELETE", url, cookies: sessao });

let selSeq = 0;
/** Cria uma seleção com nome único (nome é @unique) e devolve o id. */
async function novaSelecao(): Promise<string> {
  const tag = selSeq++;
  const s = await prisma.selecao.create({ data: { nome: `S${tag}`, bandeira: "🏳️" } });
  return s.id;
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

describe.skipIf(!temBanco)("rotas granulares de rodada/jogo (HTTP, autenticado)", () => {
  beforeEach(limparBanco);

  it("monta uma rodada INTEIRA incrementalmente: criar vazia → +jogos → editar → remover → estado → detalhar", async () => {
    // criar VAZIA (jogos ausente) → 201, sem jogos
    const criada = await post("/rodadas", { fase: "OITAVAS" });
    expect(criada.statusCode).toBe(201);
    expect(criada.json().estado).toBe("MONTADA");
    expect(criada.json().jogos).toHaveLength(0);
    const rodadaId = criada.json().id;

    // adicionar 2 jogos → 201, devolve a rodada detalhada com a lista atualizada
    const [a, b, c, d] = await Promise.all([
      novaSelecao(),
      novaSelecao(),
      novaSelecao(),
      novaSelecao(),
    ]);
    const ap1 = await post(`/rodadas/${rodadaId}/jogos`, {
      selecaoEsquerdaId: a,
      selecaoDireitaId: b,
    });
    expect(ap1.statusCode).toBe(201);
    expect(ap1.json().jogos).toHaveLength(1);
    expect(ap1.json().jogos[0]).toMatchObject({
      ordem: 1,
      selecaoEsquerdaId: a,
      selecaoDireitaId: b,
    });

    const ap2 = await post(`/rodadas/${rodadaId}/jogos`, {
      selecaoEsquerdaId: c,
      selecaoDireitaId: d,
    });
    expect(ap2.json().jogos.map((j: { ordem: number }) => j.ordem)).toEqual([1, 2]);

    // editar o 1º jogo (troca a direita) → 200, ordem preservada
    const j1Id = ap2.json().jogos[0].id;
    const editado = await put(`/jogos/${j1Id}`, { selecaoEsquerdaId: a, selecaoDireitaId: c });
    expect(editado.statusCode).toBe(200);
    const j1 = editado.json().jogos.find((j: { id: string }) => j.id === j1Id);
    expect(j1).toMatchObject({ ordem: 1, selecaoEsquerdaId: a, selecaoDireitaId: c });

    // remover o 2º jogo → 200 + rodada detalhada (sobra o J1; ordem NÃO renumera)
    const j2Id = ap2.json().jogos[1].id;
    const removido = await del(`/jogos/${j2Id}`);
    expect(removido.statusCode).toBe(200);
    expect(removido.json().jogos.map((j: { ordem: number }) => j.ordem)).toEqual([1]);

    // avançar o estado (ciclo de vida — guia, sem trava)
    const estado = await put(`/rodadas/${rodadaId}/estado`, { estado: "PALPITES_ABERTOS" });
    expect(estado.statusCode).toBe(200);
    expect(estado.json().estado).toBe("PALPITES_ABERTOS");

    // detalhar e conferir o resultado final
    const detalhe = await get(`/rodadas/${rodadaId}`);
    expect(detalhe.statusCode).toBe(200);
    expect(detalhe.json().jogos).toHaveLength(1);
    expect(detalhe.json().estado).toBe("PALPITES_ABERTOS");
  });

  it("DELETE de jogo COM palpites → 409 (JogoComPalpites); o jogo continua lá", async () => {
    const criada = await post("/rodadas", { fase: "OITAVAS" });
    const rodadaId = criada.json().id;
    const [a, b] = await Promise.all([novaSelecao(), novaSelecao()]);
    const jogoId = (
      await post(`/rodadas/${rodadaId}/jogos`, { selecaoEsquerdaId: a, selecaoDireitaId: b })
    ).json().jogos[0].id;

    // cria um palpite nesse jogo (dado real)
    const ana = await prisma.participante.create({ data: { nome: "Ana" } });
    await prisma.palpite.create({
      data: { participanteId: ana.id, jogoId, golsEsquerda: 1, golsDireita: 0 },
    });

    const res = await del(`/jogos/${jogoId}`);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ erro: { codigo: "JOGO_COM_PALPITES" } });
    // não removeu
    expect((await get(`/rodadas/${rodadaId}`)).json().jogos).toHaveLength(1);
  });

  it("erros: rodada/jogo inexistente → 404; par igual → 400", async () => {
    expect(
      (await post("/rodadas/nao-existe/jogos", { selecaoEsquerdaId: "x", selecaoDireitaId: "y" }))
        .statusCode,
    ).toBe(404);
    expect(
      (await put("/jogos/nao-existe", { selecaoEsquerdaId: "x", selecaoDireitaId: "y" }))
        .statusCode,
    ).toBe(404);
    expect((await del("/jogos/nao-existe")).statusCode).toBe(404);

    // par igual (mesma seleção dos dois lados) → JogoInvalido → 400
    const criada = await post("/rodadas", { fase: "OITAVAS" });
    const a = await novaSelecao();
    const parIgual = await post(`/rodadas/${criada.json().id}/jogos`, {
      selecaoEsquerdaId: a,
      selecaoDireitaId: a,
    });
    expect(parIgual.statusCode).toBe(400);
    expect(parIgual.json()).toMatchObject({ erro: { codigo: "JOGO_INVALIDO" } });
  });

  it("coexistência: POST atômico {fase, jogos[≥1]} → 201; jogos:[] → 400; sem cookie → 401", async () => {
    const [a, b] = await Promise.all([novaSelecao(), novaSelecao()]);
    const atomico = await post("/rodadas", {
      fase: "FINAL",
      jogos: [{ selecaoEsquerdaId: a, selecaoDireitaId: b }],
    });
    expect(atomico.statusCode).toBe(201);
    expect(atomico.json().jogos).toHaveLength(1);

    // jogos presente mas vazio → 400 (preserva o contrato da Fase 6)
    expect((await post("/rodadas", { fase: "OITAVAS", jogos: [] })).statusCode).toBe(400);

    // toda rota nova nasce protegida
    expect((await app.inject({ method: "POST", url: "/rodadas" })).statusCode).toBe(401);
  });
});
