import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";
import { buildAppTeste, SENHA_TESTE } from "./fixtures.js";

/**
 * Fatia 8.7 — rota JSON da classificação GERAL (para o TOP 3 do Painel). Via
 * `app.inject` autenticado e banco REAL. Prova que a lista vem ORDENADA pela cascata
 * (§8.5) direto do serviço (a tela só exibe) e que a rota nasce protegida (401 sem cookie).
 * O export text/plain (§12.5) tem cobertura própria; aqui é só o JSON novo.
 */
const temBanco = await bancoDisponivel();
if (!temBanco) console.warn("[integração] banco indisponível — teste HTTP 8.7 PULADO.");

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

beforeAll(async () => {
  await app.ready();
  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
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

describe.skipIf(!temBanco)("GET /classificacao (JSON, HTTP autenticado)", () => {
  beforeEach(limparBanco);

  it("200 + lista ORDENADA pela cascata (mais pontos primeiro)", async () => {
    const [e, d] = await Promise.all([novaSelecao(), novaSelecao()]);
    const rodada = (
      await post("/api/rodadas", {
        fase: "OITAVAS",
        jogos: [{ selecaoEsquerdaId: e, selecaoDireitaId: d }],
      })
    ).json() as { id: string; jogos: { id: string }[] };
    const jogoId = rodada.jogos[0]?.id ?? "";

    const ana = await prisma.participante.create({ data: { nome: "Ana" } });
    const bruno = await prisma.participante.create({ data: { nome: "Bruno" } });

    // Resultado 2x1: Ana crava (3 pts); Bruno acerta o vencedor com placar errado (1 pt).
    await put(`/api/participantes/${ana.id}/rodadas/${rodada.id}/jogos/${jogoId}/palpite`, {
      golsEsquerda: 2,
      golsDireita: 1,
    });
    await put(`/api/participantes/${bruno.id}/rodadas/${rodada.id}/jogos/${jogoId}/palpite`, {
      golsEsquerda: 3,
      golsDireita: 1,
    });
    await put(`/api/jogos/${jogoId}/resultado`, { golsEsquerda: 2, golsDireita: 1 });

    const resp = await get("/api/classificacao");
    expect(resp.statusCode).toBe(200);
    const linhas = resp.json() as { id: string; nome: string; pontos: number }[];
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toMatchObject({ id: ana.id, nome: "Ana", pontos: 3 });
    expect(linhas[1]).toMatchObject({ id: bruno.id, nome: "Bruno", pontos: 1 });
    // Invariante da ordenação: nunca sobe quem tem menos pontos.
    expect(linhas[0]?.pontos ?? 0).toBeGreaterThanOrEqual(linhas[1]?.pontos ?? 0);
  });

  it("sem cookie → 401 (rota nasce protegida)", async () => {
    expect((await app.inject({ method: "GET", url: "/api/classificacao" })).statusCode).toBe(401);
  });
});
