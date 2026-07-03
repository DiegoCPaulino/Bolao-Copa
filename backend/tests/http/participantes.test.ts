import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";
import { buildAppTeste, SENHA_TESTE } from "./fixtures.js";

/**
 * Rota-piloto de Participantes (Fatia 6.3a) via `app.inject` — autenticado, com banco
 * REAL (o handler chama participanteService → Prisma). Mesma estratégia das fatias de
 * serviço: limpa as tabelas entre casos e se auto-pula sem banco.
 *
 * Sessão: faz login UMA vez (o cookie é stateless — não depende do banco) e reusa o
 * cookie nas requisições autenticadas. As requisições sem `cookies` provam o 401.
 */
const temBanco = await bancoDisponivel();
if (!temBanco) {
  console.warn("[integração] banco indisponível — testes da rota de participantes PULADOS.");
}

const app: FastifyInstance = buildAppTeste();
let sessao: Record<string, string>;

beforeAll(async () => {
  await app.ready();
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { senha: SENHA_TESTE },
  });
  const cookie = res.cookies.find((c) => c.name === "bolao_sessao");
  if (!cookie) throw new Error("login de teste não devolveu cookie");
  sessao = { [cookie.name]: cookie.value };
});
afterAll(async () => {
  await app.close();
  if (temBanco) await prisma.$disconnect();
});

const criar = (corpo: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/participantes", cookies: sessao, payload: corpo });

describe.skipIf(!temBanco)("rotas de participantes (HTTP, autenticado)", () => {
  beforeEach(limparBanco);

  it("sem cookie → 401 (toda rota nasce protegida)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/participantes" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ erro: { codigo: "NAO_AUTENTICADO" } });
  });

  it("POST cria → 201 com o recurso criado", async () => {
    const res = await criar({ nome: "Ana", isento: false });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ nome: "Ana", status: "PENDENTE", isento: false });
    expect(res.json().id).toBeTruthy();
  });

  it("POST inválido (sem nome) → 400 pelo Zod", async () => {
    const res = await criar({ apelido: "Sem Nome" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ erro: { codigo: "VALIDACAO" } });
  });

  it("GET coleção → 200 com array (e filtro por busca via query)", async () => {
    await criar({ nome: "Ana" });
    await criar({ nome: "Bruno" });

    const todos = await app.inject({ method: "GET", url: "/api/participantes", cookies: sessao });
    expect(todos.statusCode).toBe(200);
    expect(todos.json().map((p: { nome: string }) => p.nome)).toEqual(["Ana", "Bruno"]);

    const filtrado = await app.inject({
      method: "GET",
      url: "/api/participantes?busca=bru",
      cookies: sessao,
    });
    expect(filtrado.json().map((p: { nome: string }) => p.nome)).toEqual(["Bruno"]);
  });

  it("GET /:id → 200; id inexistente → 404 (via handler central)", async () => {
    const criado = (await criar({ nome: "Ana" })).json();

    const ok = await app.inject({
      method: "GET",
      url: `/api/participantes/${criado.id}`,
      cookies: sessao,
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ id: criado.id, nome: "Ana" });

    const naoExiste = await app.inject({
      method: "GET",
      url: "/api/participantes/nao-existe",
      cookies: sessao,
    });
    expect(naoExiste.statusCode).toBe(404);
    expect(naoExiste.json()).toMatchObject({ erro: { codigo: "PARTICIPANTE_NAO_ENCONTRADO" } });
  });

  it("PUT edita → 200 com o atualizado", async () => {
    const criado = (await criar({ nome: "Ana" })).json();
    const res = await app.inject({
      method: "PUT",
      url: `/api/participantes/${criado.id}`,
      cookies: sessao,
      payload: { nome: "Ana Paula", apelido: "Aninha", isento: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ nome: "Ana Paula", apelido: "Aninha", isento: true });
  });

  it("DELETE → 204 sem corpo; depois GET /:id → 404", async () => {
    const criado = (await criar({ nome: "Ana" })).json();
    const del = await app.inject({
      method: "DELETE",
      url: `/api/participantes/${criado.id}`,
      cookies: sessao,
    });
    expect(del.statusCode).toBe(204);
    expect(del.body).toBe("");

    const apos = await app.inject({
      method: "GET",
      url: `/api/participantes/${criado.id}`,
      cookies: sessao,
    });
    expect(apos.statusCode).toBe(404);
  });

  it("GET /export → 200 text/plain com o artefato §12.6", async () => {
    await criar({ nome: "Ana" });
    await criar({ nome: "Bruno" });

    const res = await app.inject({
      method: "GET",
      url: "/api/participantes/export",
      cookies: sessao,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.body).toContain("👥 *PARTICIPANTES (2)*");
    // Lista numerada em ordem alfabética (§13.6).
    expect(res.body).toContain("1. Ana");
    expect(res.body).toContain("2. Bruno");
  });
});
