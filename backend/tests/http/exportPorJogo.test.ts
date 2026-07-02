import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";
import { buildAppTeste, SENHA_TESTE } from "./fixtures.js";

/**
 * Fatia #5.2 — exports POR JOGO (tabela §13.2 e pendências §13.8, variantes por-jogo).
 * Via `app.inject` autenticado e banco REAL. Prova a diferença-chave: nas pendências
 * por-jogo, quem palpitou OUTRO jogo mas não ESTE aparece como pendente do jogo (ao
 * contrário do binário por-rodada). As rotas por-rodada não são exercitadas aqui.
 */
const temBanco = await bancoDisponivel();
if (!temBanco) console.warn("[integração] banco indisponível — testes HTTP #5.2 PULADOS.");

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

/** Rodada de 2 jogos + Ana/Bruno/Carla. Ana palpita só o J1; Bruno só o J2; Carla nada. */
async function setup() {
  const [e1, d1, e2, d2] = await Promise.all([
    novaSelecao(),
    novaSelecao(),
    novaSelecao(),
    novaSelecao(),
  ]);
  const rodada = (
    await post("/rodadas", {
      fase: "OITAVAS",
      jogos: [
        { selecaoEsquerdaId: e1, selecaoDireitaId: d1 },
        { selecaoEsquerdaId: e2, selecaoDireitaId: d2 },
      ],
    })
  ).json() as { id: string; jogos: { id: string; ordem: number }[] };
  const j1 = rodada.jogos[0]?.id ?? "";
  const j2 = rodada.jogos[1]?.id ?? "";

  const ana = await prisma.participante.create({ data: { nome: "Ana" } });
  const bruno = await prisma.participante.create({ data: { nome: "Bruno" } });
  await prisma.participante.create({ data: { nome: "Carla" } });

  await put(`/participantes/${ana.id}/rodadas/${rodada.id}/jogos/${j1}/palpite`, {
    golsEsquerda: 2,
    golsDireita: 1,
  });
  await put(`/participantes/${bruno.id}/rodadas/${rodada.id}/jogos/${j2}/palpite`, {
    golsEsquerda: 1,
    golsDireita: 1,
  });
  return { j1, j2 };
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

describe.skipIf(!temBanco)("exports por jogo (#5.2, HTTP autenticado)", () => {
  beforeEach(limparBanco);

  it("tabela por jogo: só os palpites DAQUELE jogo, um bloco único", async () => {
    const { j1 } = await setup();
    const res = await get(`/jogos/${j1}/export/tabela`);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    // Título identifica o jogo; bloco do J1 com o palpite da Ana; Bruno (palpitou o J2) fora.
    expect(res.body).toContain("PALPITES —");
    expect(res.body).toContain("J1");
    expect(res.body).toContain("Ana");
    expect(res.body).toContain("2x1");
    expect(res.body).not.toContain("Bruno");
  });

  it("pendências por jogo: quem NÃO palpitou ESTE jogo (mesmo tendo palpitado outro)", async () => {
    const { j1, j2 } = await setup();

    const p1 = await get(`/jogos/${j1}/export/pendencias`);
    expect(p1.statusCode).toBe(200);
    expect(p1.body).toContain("FALTAM PALPITES — J1");
    // Bruno palpitou só o J2 → pendente do J1. Carla, nada → pendente. Ana palpitou o J1 → fora.
    expect(p1.body).toContain("Bruno");
    expect(p1.body).toContain("Carla");
    expect(p1.body).not.toContain("Ana");

    const p2 = await get(`/jogos/${j2}/export/pendencias`);
    expect(p2.body).toContain("Ana");
    expect(p2.body).toContain("Carla");
    expect(p2.body).not.toContain("Bruno");
  });

  it("404 jogo inexistente; 401 sem cookie", async () => {
    expect((await get("/jogos/nao-existe/export/tabela")).statusCode).toBe(404);
    expect((await get("/jogos/nao-existe/export/pendencias")).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/jogos/x/export/tabela" })).statusCode).toBe(
      401,
    );
    expect(
      (await app.inject({ method: "GET", url: "/jogos/x/export/pendencias" })).statusCode,
    ).toBe(401);
  });
});
