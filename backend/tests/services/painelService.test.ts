import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as painel from "../../src/services/painelService.js";
import * as palpiteService from "../../src/services/palpiteService.js";
import * as rodadaService from "../../src/services/rodadaService.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Teste do serviço do Painel (composição) — confere que os números agregados batem:
 * pagamentos derivados, "rodada atual" correta e contagem de quem palpitou.
 */
const temBanco = await bancoDisponivel();
if (!temBanco) {
  console.warn(
    "[integração] banco indisponível — testes de painel PULADOS. Rode `npm run test:db`.",
  );
}

// Contador só para nomear seleções de forma única entre chamadas (nome é @unique). A
// ORDEM da rodada vem do serviço (sequência de criação): a 1ª montada é 1, a 2ª é 2.
let selSeq = 0;

async function montarRodada(qtdJogos = 1) {
  const jogos = [];
  for (let i = 0; i < qtdJogos; i++) {
    const tag = selSeq++;
    const e = await prisma.selecao.create({ data: { nome: `E${tag}`, bandeira: "🏳️" } });
    const d = await prisma.selecao.create({ data: { nome: `D${tag}`, bandeira: "🏳️" } });
    jogos.push({ selecaoEsquerdaId: e.id, selecaoDireitaId: d.id });
  }
  return rodadaService.montarRodada("OITAVAS", jogos);
}

describe.skipIf(!temBanco)("painelService (integração com Postgres)", () => {
  beforeEach(limparBanco);
  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it("agrega pagamentos, rodada atual (não encerrada de maior ordem) e quem palpitou", async () => {
    const ana = await prisma.participante.create({ data: { nome: "Ana", status: "PAGO" } });
    const bruno = await prisma.participante.create({ data: { nome: "Bruno" } }); // PENDENTE
    await prisma.participante.create({ data: { nome: "Carla", status: "PAGO" } });

    const r1 = await montarRodada(1);
    await rodadaService.definirEstado(r1.id, "ENCERRADA");
    const r2 = await montarRodada(1);
    const jogo = r2.jogos[0];
    if (!jogo) throw new Error("setup");
    // Ana e Bruno palpitam na rodada 2; Carla não.
    await palpiteService.registrarPalpites(r2.id, ana.id, [
      { jogoId: jogo.id, golsEsquerda: 1, golsDireita: 0 },
    ]);
    await palpiteService.registrarPalpites(r2.id, bruno.id, [
      { jogoId: jogo.id, golsEsquerda: 2, golsDireita: 0 },
    ]);

    const resumo = await painel.gerarResumo();

    // 3 participantes × R$40 (sem indicação) → esperado 120; 2 pagos → recebido 80.
    // Premiação 75%: do recebido 80 → 60/20; do esperado 120 → 90/30.
    expect(resumo.pagamentos).toEqual({
      pagos: 2,
      total: 3,
      esperado: 120,
      recebido: 80,
      falta: 40,
      premiacaoAtual: 60,
      ganhoAtual: 20,
      premiacaoPotencial: 90,
      ganhoPotencial: 30,
    });
    // Atual = rodada 2 (maior ordem não encerrada).
    expect(resumo.rodadaAtual?.ordem).toBe(2);
    expect(resumo.rodadaAtual?.estado).toBe("MONTADA");
    expect(resumo.rodadaAtual?.palpitaram).toBe(2);
    expect(resumo.rodadaAtual?.totalParticipantes).toBe(3);
  });

  it("com todas as rodadas encerradas, a atual é a última (maior ordem)", async () => {
    const r1 = await montarRodada(1);
    const r2 = await montarRodada(1);
    await rodadaService.definirEstado(r1.id, "ENCERRADA");
    await rodadaService.definirEstado(r2.id, "ENCERRADA");

    const resumo = await painel.gerarResumo();
    expect(resumo.rodadaAtual?.ordem).toBe(2);
  });

  it("sem rodadas, rodadaAtual é null (mas pagamentos ainda agregam)", async () => {
    await prisma.participante.create({ data: { nome: "Ana" } });
    const resumo = await painel.gerarResumo();
    expect(resumo.rodadaAtual).toBeNull();
    expect(resumo.pagamentos.total).toBe(1);
  });
});
