import { describe, expect, it } from "vitest";
import { calcularEstatisticas, type JogoComResultado } from "../../src/domain/estatisticas.js";

/**
 * Testes da agregação PURA (sem banco) — onde mora o risco da fatia. Usa os casos
 * canônicos do funcional §8.3 e prova o tratamento de PALPITE AUSENTE (§8.4).
 */
describe("calcularEstatisticas (agregação pura)", () => {
  // Resultado real 2x1 em todos os jogos abaixo, para reusar os casos da §8.3.
  const real: JogoComResultado["resultado"] = { golsEsquerda: 2, golsDireita: 1 };

  it("sem nenhum palpite, zera tudo mesmo com jogos decididos", () => {
    const jogos: JogoComResultado[] = [{ jogoId: "j1", resultado: real }];
    expect(calcularEstatisticas(jogos, [])).toEqual({
      pontos: 0,
      placaresExatos: 0,
      resultadosCertos: 0,
      empatesAcertados: 0,
      vitoriasAcertadas: 0,
    });
  });

  it("placar exato → 3 pts (exato e certo)", () => {
    const stats = calcularEstatisticas(
      [{ jogoId: "j1", resultado: real }],
      [{ jogoId: "j1", palpite: { golsEsquerda: 2, golsDireita: 1 } }],
    );
    expect(stats).toEqual({
      pontos: 3,
      placaresExatos: 1,
      resultadosCertos: 1,
      empatesAcertados: 0,
      vitoriasAcertadas: 0,
    });
  });

  it("resultado certo, placar errado → 1 pt (certo, não exato) — conta VITÓRIA", () => {
    const stats = calcularEstatisticas(
      [{ jogoId: "j1", resultado: real }],
      [{ jogoId: "j1", palpite: { golsEsquerda: 1, golsDireita: 0 } }],
    );
    expect(stats).toEqual({
      pontos: 1,
      placaresExatos: 0,
      resultadosCertos: 1,
      empatesAcertados: 0,
      vitoriasAcertadas: 1,
    });
  });

  it("acertou o EMPATE, placar errado → 1 pt — conta EMPATE (real 1x1, palpite 2x2)", () => {
    const stats = calcularEstatisticas(
      [{ jogoId: "j1", resultado: { golsEsquerda: 1, golsDireita: 1 } }],
      [{ jogoId: "j1", palpite: { golsEsquerda: 2, golsDireita: 2 } }],
    );
    expect(stats).toEqual({
      pontos: 1,
      placaresExatos: 0,
      resultadosCertos: 1,
      empatesAcertados: 1,
      vitoriasAcertadas: 0,
    });
  });

  it("desfecho errado → 0", () => {
    const stats = calcularEstatisticas(
      [{ jogoId: "j1", resultado: real }],
      [{ jogoId: "j1", palpite: { golsEsquerda: 1, golsDireita: 1 } }],
    );
    expect(stats).toEqual({
      pontos: 0,
      placaresExatos: 0,
      resultadosCertos: 0,
      empatesAcertados: 0,
      vitoriasAcertadas: 0,
    });
  });

  it("mix com jogo SEM palpite (ausente conta 0)", () => {
    const jogos: JogoComResultado[] = [
      { jogoId: "j1", resultado: real }, // exato
      { jogoId: "j2", resultado: real }, // certo
      { jogoId: "j3", resultado: real }, // sem palpite → 0
    ];
    const stats = calcularEstatisticas(jogos, [
      { jogoId: "j1", palpite: { golsEsquerda: 2, golsDireita: 1 } },
      { jogoId: "j2", palpite: { golsEsquerda: 3, golsDireita: 1 } },
    ]);
    expect(stats).toEqual({
      pontos: 4,
      placaresExatos: 1,
      resultadosCertos: 2,
      empatesAcertados: 0,
      vitoriasAcertadas: 1, // j1 exato (não conta split), j2 vitória certa
    });
  });

  it("ignora palpite de jogo ainda SEM resultado", () => {
    const jogos: JogoComResultado[] = [{ jogoId: "j1", resultado: real }];
    const stats = calcularEstatisticas(jogos, [
      { jogoId: "j1", palpite: { golsEsquerda: 2, golsDireita: 1 } },
      { jogoId: "jX", palpite: { golsEsquerda: 9, golsDireita: 9 } }, // jogo não decidido
    ]);
    expect(stats).toEqual({
      pontos: 3,
      placaresExatos: 1,
      resultadosCertos: 1,
      empatesAcertados: 0,
      vitoriasAcertadas: 0,
    });
  });
});
