import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { NomeObrigatorio, ParticipanteNaoEncontrado } from "../../src/domain/erros.js";
import { buildApp } from "../../src/http/app.js";

/**
 * Teste de API leve do bootstrap (Fatia 6.1). Usa `app.inject` — não abre porta nem
 * toca o banco (/health e o handler de erro independem de Postgres). Logger desligado
 * para não poluir a saída dos testes.
 *
 * Cobre o caminho feliz (/health) e o mapa erro-de-domínio → status: as rotas de
 * teste abaixo (`/_*`) só existem aqui para provocar cada ramo do handler central —
 * não vão para produção.
 */
const app = buildApp({ logger: false });

// Rotas sintéticas, só para o teste exercitar o handler de erro central.
app.get("/_nao-encontrado", async () => {
  throw new ParticipanteNaoEncontrado("abc"); // → 404 (mapeado)
});
app.get("/_regra", async () => {
  throw new NomeObrigatorio(); // ErroDeDominio sem mapa → 400 (default)
});
app.get("/_zod", async () => {
  z.object({ x: z.string() }).parse({}); // ZodError → 400
});
app.get("/_bug", async () => {
  throw new Error("kaboom"); // não-domínio → 500
});

beforeAll(async () => {
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe("bootstrap HTTP (Fastify) — Fatia 6.1", () => {
  it("GET /health responde 200 { ok: true }", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("erro de domínio 'não encontrado' vira 404 com corpo consistente", async () => {
    const res = await app.inject({ method: "GET", url: "/_nao-encontrado" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ erro: { codigo: "PARTICIPANTE_NAO_ENCONTRADO" } });
  });

  it("erro de domínio sem mapa (violação de regra) cai no default 400", async () => {
    const res = await app.inject({ method: "GET", url: "/_regra" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ erro: { codigo: "NOME_OBRIGATORIO" } });
  });

  it("erro de validação (Zod) vira 400 VALIDACAO", async () => {
    const res = await app.inject({ method: "GET", url: "/_zod" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ erro: { codigo: "VALIDACAO" } });
  });

  it("erro inesperado (bug) vira 500 sem vazar detalhes", async () => {
    const res = await app.inject({ method: "GET", url: "/_bug" });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ erro: { codigo: "ERRO_INTERNO", mensagem: "Erro interno." } });
  });

  it("rota desconhecida vira 404 no mesmo formato de erro", async () => {
    const res = await app.inject({ method: "GET", url: "/nao-existe" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ erro: { codigo: "ROTA_NAO_ENCONTRADA" } });
  });
});
