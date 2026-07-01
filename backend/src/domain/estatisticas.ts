import { calcularPontos, classificarPalpite, type Placar } from "./pontuacao.js";

/**
 * AGREGAÇÃO de pontuação — a peça PURA que faltava (funcional §8.2–§8.5; CLAUDE.md
 * §3.3). Cruza os palpites de UM participante com os resultados dos jogos e devolve
 * suas estatísticas. Entram dados, saem dados — sem banco, sem efeito colateral.
 *
 * PALPITE AUSENTE → 0 no jogo (§8.4) mora AQUI, não em `calcularPontos`: o universo é
 * o conjunto de jogos COM resultado; quem não palpitou um jogo simplesmente não soma
 * nada por ele (não conta exato nem certo). Palpite de jogo SEM resultado é ignorado
 * (não está no universo).
 *
 * `resultadosCertos` inclui os exatos (todo placar exato é também um resultado certo,
 * §8.5): conta todo palpite que pontuou >= 1 — é o valor que a cascata de desempate
 * usa, então NÃO muda. `empatesAcertados`/`vitoriasAcertadas` são o SPLIT estatístico
 * dos palpites de EXATAMENTE 1 ponto (o exato tem categoria própria e fica de fora):
 * resultadosCertos = placaresExatos + empatesAcertados + vitoriasAcertadas.
 */

/** Um jogo já decidido: seu id e o placar real (90 min). */
export type JogoComResultado = {
  jogoId: string;
  resultado: Placar;
};

/** Um palpite de um participante, ligado ao jogo. */
export type PalpiteDoParticipante = {
  jogoId: string;
  palpite: Placar;
};

/** Estatísticas agregadas de um participante (todas derivadas, nunca armazenadas). */
export type EstatisticasParticipante = {
  pontos: number;
  placaresExatos: number;
  resultadosCertos: number;
  // Split estatístico dos palpites de EXATAMENTE 1 ponto (o exato NÃO entra aqui). Só
  // para relatório nas telas; a soma dos dois + placaresExatos = resultadosCertos.
  empatesAcertados: number;
  vitoriasAcertadas: number;
};

export function calcularEstatisticas(
  jogosComResultado: ReadonlyArray<JogoComResultado>,
  palpitesDoParticipante: ReadonlyArray<PalpiteDoParticipante>,
): EstatisticasParticipante {
  const palpitePorJogo = new Map(palpitesDoParticipante.map((p) => [p.jogoId, p.palpite]));

  let pontos = 0;
  let placaresExatos = 0;
  let resultadosCertos = 0;
  let empatesAcertados = 0;
  let vitoriasAcertadas = 0;

  for (const { jogoId, resultado } of jogosComResultado) {
    const palpite = palpitePorJogo.get(jogoId);
    if (palpite === undefined) {
      continue; // palpite ausente → 0 no jogo (§8.4): não soma nem conta
    }
    const ponto = calcularPontos(palpite, resultado);
    pontos += ponto;
    if (ponto === 3) {
      placaresExatos += 1;
    }
    if (ponto >= 1) {
      resultadosCertos += 1;
    }
    // Split estatístico (não toca nos pontos): só os de 1 ponto viram empate/vitória.
    const categoria = classificarPalpite(palpite, resultado);
    if (categoria === "EMPATE_ACERTADO") {
      empatesAcertados += 1;
    } else if (categoria === "VITORIA_ACERTADA") {
      vitoriasAcertadas += 1;
    }
  }

  return { pontos, placaresExatos, resultadosCertos, empatesAcertados, vitoriasAcertadas };
}
