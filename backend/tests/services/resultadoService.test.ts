import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  JogoNaoEncontrado,
  ResultadoInvalido,
  ResultadoNaoRegistrado,
} from "../../src/domain/erros.js";
import * as palpiteService from "../../src/services/palpiteService.js";
import * as resultados from "../../src/services/resultadoService.js";
import * as rodadaService from "../../src/services/rodadaService.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Testes do serviço de Resultados — PRIORIDADE MÁXIMA (é onde mora o risco). Provam o
 * recálculo SOB DEMANDA: registrar reflete, CORREÇÃO recalcula sozinha, palpite
 * ausente = 0, desempate em cascata; e que NADA derivado virou coluna.
 */
const temBanco = await bancoDisponivel();
if (!temBanco) {
  console.warn(
    "[integração] banco indisponível — testes de resultado PULADOS. Rode `npm run test:db`.",
  );
}

// Contador só para nomear seleções de forma única entre chamadas (nome é @unique); a
// ORDEM da rodada não é mais passada — o serviço a deriva.
let selSeq = 0;

async function montarRodada(qtdJogos: number) {
  const jogos = [];
  for (let i = 0; i < qtdJogos; i++) {
    const tag = selSeq++;
    const e = await prisma.selecao.create({ data: { nome: `E${tag}`, bandeira: "🏳️" } });
    const d = await prisma.selecao.create({ data: { nome: `D${tag}`, bandeira: "🏳️" } });
    jogos.push({ selecaoEsquerdaId: e.id, selecaoDireitaId: d.id });
  }
  return rodadaService.montarRodada("OITAVAS", jogos);
}

function criar(nome: string) {
  return prisma.participante.create({ data: { nome } });
}

describe.skipIf(!temBanco)("resultadoService (integração com Postgres)", () => {
  beforeEach(limparBanco);
  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  describe("registrar resultado e recálculo sob demanda", () => {
    it("registrar reflete em pontosDaRodada e classificacaoGeral", async () => {
      const rodada = await montarRodada(2);
      const j1 = rodada.jogos[0];
      const j2 = rodada.jogos[1];
      if (!j1 || !j2) throw new Error("setup");
      const ana = await criar("Ana");
      const bruno = await criar("Bruno");

      await palpiteService.registrarPalpites(rodada.id, ana.id, [
        { jogoId: j1.id, golsEsquerda: 2, golsDireita: 1 },
        { jogoId: j2.id, golsEsquerda: 0, golsDireita: 0 },
      ]);
      await palpiteService.registrarPalpites(rodada.id, bruno.id, [
        { jogoId: j1.id, golsEsquerda: 1, golsDireita: 0 },
        { jogoId: j2.id, golsEsquerda: 0, golsDireita: 0 },
      ]);

      await resultados.registrarResultado(j1.id, 2, 1);
      await resultados.registrarResultado(j2.id, 0, 0);

      // Ana: 3+3=6 (dois exatos). Bruno: 1 (J1 certo) + 3 (J2 exato) = 4.
      const rodadaPts = await resultados.pontosDaRodada(rodada.id);
      expect(rodadaPts.map((l) => [l.nome, l.pontos])).toEqual([
        ["Ana", 6],
        ["Bruno", 4],
      ]);
      const geral = await resultados.classificacaoGeral();
      expect(geral.map((l) => [l.nome, l.pontos])).toEqual([
        ["Ana", 6],
        ["Bruno", 4],
      ]);
    });

    it("CORREÇÃO recalcula a classificação sozinha (derivado sob demanda)", async () => {
      const rodada = await montarRodada(2);
      const j1 = rodada.jogos[0];
      const j2 = rodada.jogos[1];
      if (!j1 || !j2) throw new Error("setup");
      const ana = await criar("Ana");
      const bruno = await criar("Bruno");

      await palpiteService.registrarPalpites(rodada.id, ana.id, [
        { jogoId: j1.id, golsEsquerda: 2, golsDireita: 1 },
        { jogoId: j2.id, golsEsquerda: 0, golsDireita: 0 },
      ]);
      await palpiteService.registrarPalpites(rodada.id, bruno.id, [
        { jogoId: j1.id, golsEsquerda: 1, golsDireita: 0 },
        { jogoId: j2.id, golsEsquerda: 0, golsDireita: 0 },
      ]);

      await resultados.registrarResultado(j1.id, 2, 1);
      await resultados.registrarResultado(j2.id, 0, 0);
      expect((await resultados.classificacaoGeral())[0]?.nome).toBe("Ana"); // Ana 6 × Bruno 4

      // Corrige SÓ o placar do J1 para 1x0 (sem nenhum passo manual de pontuação):
      // Ana passa a 1+3=4, Bruno a 3+3=6 — a ordem VIRA, recalculada na leitura.
      await resultados.registrarResultado(j1.id, 1, 0);
      const geral = await resultados.classificacaoGeral();
      expect(geral.map((l) => [l.nome, l.pontos])).toEqual([
        ["Bruno", 6],
        ["Ana", 4],
      ]);
    });

    it("palpite ausente pontua 0 no acumulado", async () => {
      const rodada = await montarRodada(1);
      const j1 = rodada.jogos[0];
      if (!j1) throw new Error("setup");
      const ana = await criar("Ana");
      await criar("Bruno"); // existe mas NÃO palpita nada

      await palpiteService.registrarPalpites(rodada.id, ana.id, [
        { jogoId: j1.id, golsEsquerda: 2, golsDireita: 1 },
      ]);
      await resultados.registrarResultado(j1.id, 2, 1);

      const geral = await resultados.classificacaoGeral();
      expect(geral.find((l) => l.nome === "Ana")?.pontos).toBe(3);
      expect(geral.find((l) => l.nome === "Bruno")?.pontos).toBe(0);
    });

    it("desempata pela cascata: mesmos pontos, mais placares exatos vem primeiro", async () => {
      const rodada = await montarRodada(3);
      const [j1, j2, j3] = rodada.jogos;
      if (!j1 || !j2 || !j3) throw new Error("setup");
      const ana = await criar("Ana");
      const bruno = await criar("Bruno");

      // Resultado 2x1 em todos. Ana: {exato, errado, errado} = 3 pts, 1 exato.
      await palpiteService.registrarPalpites(rodada.id, ana.id, [
        { jogoId: j1.id, golsEsquerda: 2, golsDireita: 1 },
        { jogoId: j2.id, golsEsquerda: 1, golsDireita: 2 },
        { jogoId: j3.id, golsEsquerda: 0, golsDireita: 1 },
      ]);
      // Bruno: {certo, certo, certo} = 3 pts, 0 exatos.
      await palpiteService.registrarPalpites(rodada.id, bruno.id, [
        { jogoId: j1.id, golsEsquerda: 3, golsDireita: 0 },
        { jogoId: j2.id, golsEsquerda: 5, golsDireita: 1 },
        { jogoId: j3.id, golsEsquerda: 4, golsDireita: 2 },
      ]);
      for (const j of [j1, j2, j3]) {
        await resultados.registrarResultado(j.id, 2, 1);
      }

      const geral = await resultados.classificacaoGeral();
      expect(geral.map((l) => [l.nome, l.pontos, l.placaresExatos])).toEqual([
        ["Ana", 3, 1], // empate em pontos, mas 1 exato
        ["Bruno", 3, 0], // 0 exatos → fica atrás
      ]);
    });
  });

  describe("validações", () => {
    it("rejeita gols negativos e jogo inexistente", async () => {
      const rodada = await montarRodada(1);
      const j1 = rodada.jogos[0];
      if (!j1) throw new Error("setup");
      await expect(resultados.registrarResultado(j1.id, -1, 0)).rejects.toBeInstanceOf(
        ResultadoInvalido,
      );
      await expect(resultados.registrarResultado("nao-existe", 1, 0)).rejects.toBeInstanceOf(
        JogoNaoEncontrado,
      );
    });

    it("dadosResumoJogo traz os pontos calculados; sem placar lança erro", async () => {
      const rodada = await montarRodada(1);
      const j1 = rodada.jogos[0];
      if (!j1) throw new Error("setup");
      const ana = await criar("Ana");
      await palpiteService.registrarPalpites(rodada.id, ana.id, [
        { jogoId: j1.id, golsEsquerda: 2, golsDireita: 1 },
      ]);

      await expect(resultados.dadosResumoJogo(j1.id)).rejects.toBeInstanceOf(
        ResultadoNaoRegistrado,
      );

      await resultados.registrarResultado(j1.id, 2, 1);
      const resumo = await resultados.dadosResumoJogo(j1.id);
      expect(resumo.resultado).toEqual({ golsEsquerda: 2, golsDireita: 1 });
      expect(resumo.palpites[0]).toMatchObject({ nome: "Ana", pontos: 3 });
    });
  });

  describe("nada derivado é coluna (CLAUDE.md §3.2)", () => {
    it("Palpite/Jogo/Participante não têm coluna de pontos/posição/valor", async () => {
      const colunas = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('Palpite', 'Jogo', 'Participante')
      `;
      const nomes = colunas.map((c) => c.column_name.toLowerCase());
      for (const proibida of ["pontos", "posicao", "valorapagar", "classificacao"]) {
        expect(nomes).not.toContain(proibida);
      }
    });
  });
});
