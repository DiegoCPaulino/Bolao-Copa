import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";
import { buildAppTeste, SENHA_TESTE } from "./fixtures.js";

/**
 * Fatia 8.5-A — endpoint consolidado do PERFIL (§12.4). Via `app.inject` autenticado e
 * banco REAL. Prova que o DTO junta os 4 blocos (identidade, indicações, pagamento,
 * desempenho) corretamente — incluindo o valor a pagar derivado (com desconto por
 * indicação), a posição na geral e o breakdown por rodada (decidida vs. aguardando).
 */
const temBanco = await bancoDisponivel();
if (!temBanco) console.warn("[integração] banco indisponível — teste HTTP 8.5-A PULADO.");

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

/** Monta uma rodada de 1 jogo (POST atômico); devolve rodadaId + jogoId. */
async function novaRodada(fase: string): Promise<{ rodadaId: string; jogoId: string }> {
  const [e, d] = await Promise.all([novaSelecao(), novaSelecao()]);
  const r = (
    await post("/rodadas", { fase, jogos: [{ selecaoEsquerdaId: e, selecaoDireitaId: d }] })
  ).json() as { id: string; jogos: { id: string }[] };
  return { rodadaId: r.id, jogoId: r.jogos[0]?.id ?? "" };
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

describe.skipIf(!temBanco)("GET /participantes/:id/perfil (8.5-A, HTTP autenticado)", () => {
  beforeEach(limparBanco);

  it("junta os 4 blocos: indicações, pagamento (−5 por indicado), desempenho + breakdown", async () => {
    // Bruno → Ana → Carla (Ana é indicada por Bruno e indicou Carla).
    const bruno = await prisma.participante.create({ data: { nome: "Bruno" } });
    const ana = await prisma.participante.create({
      data: { nome: "Ana", indicadorId: bruno.id },
    });
    const carla = await prisma.participante.create({
      data: { nome: "Carla", indicadorId: ana.id },
    });

    // Rodada 1 DECIDIDA: Ana crava 2x1 (3 pts). Rodada 2 sem resultado (aguardando).
    const r1 = await novaRodada("OITAVAS");
    await put(`/participantes/${ana.id}/rodadas/${r1.rodadaId}/jogos/${r1.jogoId}/palpite`, {
      golsEsquerda: 2,
      golsDireita: 1,
    });
    await put(`/jogos/${r1.jogoId}/resultado`, { golsEsquerda: 2, golsDireita: 1 });
    const r2 = await novaRodada("QUARTAS");

    const resp = await get(`/participantes/${ana.id}/perfil`);
    expect(resp.statusCode).toBe(200);
    const perfil = resp.json();

    // Bloco 1 — identidade.
    expect(perfil.participante).toMatchObject({ id: ana.id, nome: "Ana" });

    // Bloco 2 — indicações (indicador + indicados).
    expect(perfil.indicacoes.indicador).toMatchObject({ id: bruno.id, nome: "Bruno" });
    expect(perfil.indicacoes.indicados).toHaveLength(1);
    expect(perfil.indicacoes.indicados[0]).toMatchObject({ id: carla.id, nome: "Carla" });

    // Bloco 3 — pagamento: 1 indicado direto → 40 − 5 = 35; status padrão PENDENTE.
    expect(perfil.pagamento).toEqual({ isento: false, valorAPagar: 35, status: "PENDENTE" });

    // Bloco 4 — desempenho: total 3, líder (posição 1 de 3), breakdown por rodada.
    expect(perfil.desempenho).toMatchObject({
      pontos: 3,
      placaresExatos: 1,
      posicao: 1,
      totalClassificados: 3,
    });
    expect(perfil.desempenho.porRodada).toHaveLength(2);
    const porOrdem = (o: number) =>
      perfil.desempenho.porRodada.find((r: { ordem: number }) => r.ordem === o);
    expect(porOrdem(1)).toMatchObject({ rodadaId: r1.rodadaId, pontos: 3, decidida: true });
    expect(porOrdem(2)).toMatchObject({ rodadaId: r2.rodadaId, pontos: 0, decidida: false });
  });

  it("participante isento: valorAPagar null (fora do universo de cobrança)", async () => {
    const p = await prisma.participante.create({ data: { nome: "Isento", isento: true } });
    const resp = await get(`/participantes/${p.id}/perfil`);
    expect(resp.statusCode).toBe(200);
    expect(resp.json().pagamento).toEqual({ isento: true, valorAPagar: null, status: "PENDENTE" });
  });

  it("404 id inexistente", async () => {
    expect((await get("/participantes/nao-existe/perfil")).statusCode).toBe(404);
  });

  it("sem cookie → 401 (rota nasce protegida)", async () => {
    expect((await app.inject({ method: "GET", url: "/participantes/x/perfil" })).statusCode).toBe(
      401,
    );
  });
});
