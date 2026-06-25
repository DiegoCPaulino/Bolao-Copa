import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAppTeste, ORIGEM_TESTE } from "./fixtures.js";

/**
 * CORS (Fatia 7.1) — o front (origem própria) precisa falar com a API levando o cookie
 * de sessão. Via `inject` (sem porta nem banco): preflight e requisição cross-origin da
 * origem PERMITIDA recebem os cabeçalhos certos (incl. credentials); origem estranha NÃO
 * recebe `Access-Control-Allow-Origin` (o browser bloquearia a resposta).
 */
const app: FastifyInstance = buildAppTeste();
const OUTRA_ORIGEM = "http://evil.example";

beforeAll(async () => {
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe("CORS — libera só a origem do front, com credenciais", () => {
  it("preflight (OPTIONS) da origem permitida → libera método e credenciais", async () => {
    const res = await app.inject({
      method: "OPTIONS",
      url: "/auth/login",
      headers: {
        origin: ORIGEM_TESTE,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    expect(res.statusCode).toBeLessThan(300); // 204/200
    expect(res.headers["access-control-allow-origin"]).toBe(ORIGEM_TESTE);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
  });

  it("requisição cross-origin da origem permitida → ecoa a origem + credentials", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: ORIGEM_TESTE },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(ORIGEM_TESTE);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("origem NÃO permitida → sem Access-Control-Allow-Origin (barrada pelo browser)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: OUTRA_ORIGEM },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("nunca usa o coringa '*' (incompatível com cookie de credencial)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: ORIGEM_TESTE },
    });
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
  });
});
