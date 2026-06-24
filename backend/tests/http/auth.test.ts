import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAppTeste, SENHA_TESTE } from "./fixtures.js";

/**
 * Auth single-user (Fatia 6.2) via `app.inject` — sem porta nem banco. Exercita o
 * loop completo: rota protegida nega sem sessão; login com senha certa devolve cookie
 * httpOnly; o mesmo cookie abre a rota protegida; logout fecha de novo.
 *
 * O hash usado é o de teste (senha descartável), injetado pelo `buildAppTeste` — o
 * `.env` real (com a senha do organizador) nunca entra aqui.
 */
const app: FastifyInstance = buildAppTeste();

beforeAll(async () => {
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

const login = (senha: string) =>
  app.inject({ method: "POST", url: "/auth/login", payload: { senha } });

/** Extrai o par nome=valor do cookie de sessão de uma resposta com Set-Cookie. */
function cookieDaResposta(res: Awaited<ReturnType<typeof login>>): Record<string, string> {
  const c = res.cookies.find((k) => k.name === "bolao_sessao");
  if (!c) throw new Error("resposta sem cookie de sessão");
  return { [c.name]: c.value };
}

describe("auth single-user — Fatia 6.2", () => {
  it("/me sem cookie → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ erro: { codigo: "NAO_AUTENTICADO" } });
  });

  it("login com senha errada → 401 (mensagem genérica)", async () => {
    const res = await login("senha-errada");
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ erro: { codigo: "NAO_AUTORIZADO" } });
    expect(res.cookies.find((c) => c.name === "bolao_sessao")).toBeUndefined();
  });

  it("login com senha certa → 200 + cookie httpOnly/SameSite=strict", async () => {
    const res = await login(SENHA_TESTE);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ autenticado: true });

    const cookie = res.cookies.find((c) => c.name === "bolao_sessao");
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite?.toLowerCase()).toBe("strict");
    expect(cookie?.secure).toBeFalsy(); // dev/teste sem TLS
  });

  it("/me COM o cookie da sessão → 200 { autenticado: true }", async () => {
    const loginRes = await login(SENHA_TESTE);
    const res = await app.inject({
      method: "GET",
      url: "/me",
      cookies: cookieDaResposta(loginRes),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ autenticado: true });
  });

  it("logout limpa a sessão → /me volta a 401", async () => {
    const loginRes = await login(SENHA_TESTE);
    const sessao = cookieDaResposta(loginRes);

    const logoutRes = await app.inject({ method: "POST", url: "/auth/logout", cookies: sessao });
    expect(logoutRes.statusCode).toBe(200);

    // O logout devolve o cookie LIMPO (o navegador passaria a mandar isto); /me nega.
    const limpo = cookieDaResposta(logoutRes);
    const res = await app.inject({ method: "GET", url: "/me", cookies: limpo });
    expect(res.statusCode).toBe(401);
  });
});
