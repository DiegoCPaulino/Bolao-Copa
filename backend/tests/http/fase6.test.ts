import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";
import { buildAppTeste, SENHA_TESTE } from "./fixtures.js";

/**
 * Fatia 6.3b — replica do molde de rota (6.3a) para os demais serviços. Via `inject`,
 * autenticado, com banco REAL (os handlers chamam os serviços → Prisma). Cobre o
 * caminho feliz de cada rota, uma amostra de 401, e os erros relevantes (404/400/placar
 * negativo). As 8 exportações conferem `text/plain` + um trecho do formatador certo.
 */
const temBanco = await bancoDisponivel();
if (!temBanco) console.warn("[integração] banco indisponível — testes HTTP da 6.3b PULADOS.");

const app: FastifyInstance = buildAppTeste();
let sessao: Record<string, string>;

const get = (url: string) => app.inject({ method: "GET", url, cookies: sessao });
const post = (url: string, payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url, cookies: sessao, payload });
const put = (url: string, payload?: Record<string, unknown>) =>
  app.inject({ method: "PUT", url, cookies: sessao, payload });

/** Cria duas seleções no catálogo (insumo das rodadas). */
async function criarSelecoes() {
  const e = await prisma.selecao.create({ data: { nome: "Brasil", bandeira: "🇧🇷" } });
  const d = await prisma.selecao.create({ data: { nome: "Argentina", bandeira: "🇦🇷" } });
  return { e, d };
}

/** Monta uma rodada de 1 jogo via API; devolve a rodada detalhada (com o jogo). */
async function criarRodada() {
  const { e, d } = await criarSelecoes();
  const res = await post("/rodadas", {
    fase: "OITAVAS",
    jogos: [{ selecaoEsquerdaId: e.id, selecaoDireitaId: d.id }],
  });
  return res.json() as { id: string; jogos: { id: string; ordem: number }[] };
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

describe.skipIf(!temBanco)("Fase 6.3b — rotas HTTP autenticadas", () => {
  beforeEach(limparBanco);

  it("sem cookie → 401 (amostra representativa)", async () => {
    expect((await app.inject({ method: "GET", url: "/pagamentos" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/selecoes" })).statusCode).toBe(401);
  });

  describe("catálogo", () => {
    it("GET /selecoes → 200 array", async () => {
      await criarSelecoes();
      const res = await get("/selecoes");
      expect(res.statusCode).toBe(200);
      expect(
        res
          .json()
          .map((s: { nome: string }) => s.nome)
          .sort(),
      ).toEqual(["Argentina", "Brasil"]);
    });
  });

  describe("pagamentos", () => {
    it("GET lista (derivado, isentos fora) + PUT alterna status + export text/plain", async () => {
      const ana = await prisma.participante.create({ data: { nome: "Ana" } });
      await prisma.participante.create({ data: { nome: "Zé", isento: true } });

      const lista = await get("/pagamentos");
      expect(lista.statusCode).toBe(200);
      expect(lista.json().participantes.map((p: { nome: string }) => p.nome)).toEqual(["Ana"]); // Zé isento fora
      expect(lista.json().totais.esperado).toBe(40);

      const alt = await put(`/pagamentos/${ana.id}`);
      expect(alt.statusCode).toBe(200);
      expect(alt.json().status).toBe("PAGO");

      const exp = await get("/pagamentos/export");
      expect(exp.statusCode).toBe(200);
      expect(exp.headers["content-type"]).toContain("text/plain");
      expect(exp.body).toContain("💰 *PAGAMENTOS*");
      expect(exp.body).toContain("🏆 *Prêmio*:");
    });
  });

  describe("rodadas e jogos", () => {
    it("POST → 201; GET lista/detalhe; 404 e 400; PUT estado; export mensagem", async () => {
      const { e, d } = await criarSelecoes();
      const criada = await post("/rodadas", {
        fase: "OITAVAS",
        jogos: [{ selecaoEsquerdaId: e.id, selecaoDireitaId: d.id }],
      });
      expect(criada.statusCode).toBe(201);
      const rodadaId = criada.json().id;

      expect((await get("/rodadas")).json()).toHaveLength(1);
      expect((await get(`/rodadas/${rodadaId}`)).statusCode).toBe(200);
      expect((await get("/rodadas/nao-existe")).statusCode).toBe(404);

      // payload inválido: rodada sem jogos → 400 (Zod)
      expect((await post("/rodadas", { fase: "OITAVAS", jogos: [] })).statusCode).toBe(400);

      const estado = await put(`/rodadas/${rodadaId}/estado`, { estado: "PALPITES_ABERTOS" });
      expect(estado.statusCode).toBe(200);
      expect(estado.json().estado).toBe("PALPITES_ABERTOS");

      const msg = await get(`/rodadas/${rodadaId}/export/mensagem`);
      expect(msg.headers["content-type"]).toContain("text/plain");
      expect(msg.body).toContain("BOLÃO COPA 2026 — OITAVAS DE FINAL");
      expect(msg.body).toContain("Brasil × Argentina");
    });

    it("PUT /jogos/:id/resultado registra placar; placar negativo → 400; resumo do jogo", async () => {
      const rodada = await criarRodada();
      const jogoId = rodada.jogos[0]?.id ?? "";
      const ana = await prisma.participante.create({ data: { nome: "Ana" } });
      await put(`/participantes/${ana.id}/rodadas/${rodada.id}/palpites`, {
        palpites: [{ jogoId, golsEsquerda: 2, golsDireita: 1 }],
      });

      expect(
        (await put(`/jogos/${jogoId}/resultado`, { golsEsquerda: -1, golsDireita: 0 })).statusCode,
      ).toBe(400);

      const ok = await put(`/jogos/${jogoId}/resultado`, { golsEsquerda: 2, golsDireita: 1 });
      expect(ok.statusCode).toBe(200);
      expect(ok.json()).toMatchObject({ golsEsquerdaReal: 2, golsDireitaReal: 1 });

      const resumo = await get(`/jogos/${jogoId}/export/resumo`);
      expect(resumo.headers["content-type"]).toContain("text/plain");
      expect(resumo.body).toContain("RESULTADO — Jogo 1");
      expect(resumo.body).toContain("🎯 Ana 2x1"); // cravou

      const resumoRodada = await get(`/rodadas/${rodada.id}/export/resumo`);
      expect(resumoRodada.statusCode).toBe(200);
      expect(resumoRodada.body).toContain("FIM DAS OITAVAS DE FINAL");
    });
  });

  describe("palpites", () => {
    it("PUT upsert; GET pendentes; export tabela e pendências", async () => {
      const rodada = await criarRodada();
      const jogoId = rodada.jogos[0]?.id ?? "";
      const ana = await prisma.participante.create({ data: { nome: "Ana" } });
      await prisma.participante.create({ data: { nome: "Bruno" } }); // não palpita → fica pendente

      const palp = await put(`/participantes/${ana.id}/rodadas/${rodada.id}/palpites`, {
        palpites: [{ jogoId, golsEsquerda: 1, golsDireita: 0 }],
      });
      expect(palp.statusCode).toBe(200);
      expect(palp.json()).toHaveLength(1);

      const pendentes = await get(`/rodadas/${rodada.id}/pendentes`);
      expect(pendentes.statusCode).toBe(200);
      expect(pendentes.json().map((p: { nome: string }) => p.nome)).toEqual(["Bruno"]); // Ana já palpitou

      const tabela = await get(`/rodadas/${rodada.id}/export/tabela`);
      expect(tabela.headers["content-type"]).toContain("text/plain");
      expect(tabela.body).toContain("📋 *PALPITES — OITAVAS DE FINAL*");

      const pend = await get(`/rodadas/${rodada.id}/export/pendencias`);
      expect(pend.body).toContain("FALTAM PALPITES");
      expect(pend.body).toContain("Bruno");
    });
  });

  describe("classificação e painel", () => {
    it("GET /painel → 200 JSON (tela privada); /classificacao/export → text/plain", async () => {
      await prisma.participante.create({ data: { nome: "Ana", status: "PAGO" } });

      const painel = await get("/painel");
      expect(painel.statusCode).toBe(200);
      expect(painel.json().pagamentos).toMatchObject({
        esperado: 40,
        recebido: 40,
        premiacaoAtual: 30,
        ganhoAtual: 10,
      });

      const clas = await get("/classificacao/export");
      expect(clas.headers["content-type"]).toContain("text/plain");
      expect(clas.body).toContain("CLASSIFICAÇÃO GERAL");
    });
  });
});
