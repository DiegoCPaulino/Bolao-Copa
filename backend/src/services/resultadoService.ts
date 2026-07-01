import { ordenarClassificacao } from "../domain/classificacao.js";
import {
  JogoNaoEncontrado,
  ResultadoInvalido,
  ResultadoNaoRegistrado,
  RodadaNaoEncontrada,
} from "../domain/erros.js";
import {
  calcularEstatisticas,
  type JogoComResultado,
  type PalpiteDoParticipante,
} from "../domain/estatisticas.js";
import { calcularPontos, type Placar, type Pontos } from "../domain/pontuacao.js";
import * as palpiteRepo from "../repositories/palpiteRepository.js";
import type { Participante } from "../repositories/participanteRepository.js";
import * as participanteRepo from "../repositories/participanteRepository.js";
import type { FaseRodada, Jogo } from "../repositories/rodadaRepository.js";
import * as rodadaRepo from "../repositories/rodadaRepository.js";

/**
 * Serviço de Resultados e Pontuação — AGNÓSTICO de interface (CLAUDE.md §3.1) e o
 * CORAÇÃO da orquestração: lançar um placar grava SÓ o resultado cru; toda a
 * pontuação (rodada, classificação, resumo do jogo) é recalculada SOB DEMANDA a
 * partir dos dados crus (palpites + resultados), reusando as PURAS da Fase 1.
 *
 * NADA derivado é armazenado (CLAUDE.md §3.2): é o que faz a correção "se propagar
 * sozinha" — reeditar o placar e ler de novo já reflete em tudo, sem passo manual.
 */

/** Uma linha de pontuação (derivada) de um participante. */
export type LinhaPontuacao = {
  id: string;
  nome: string;
  apelido: string | null;
  pontos: number;
  placaresExatos: number;
  resultadosCertos: number;
};

/**
 * Pontos de UM participante em UMA rodada (derivado). `decidida` = a rodada já tem ao
 * menos um jogo com placar; quando false, `pontos` é 0 mas ainda "não jogou" — o
 * consumidor distingue "fez 0" de "aguardando" (perfil §12.4).
 */
export type DesempenhoRodada = {
  rodadaId: string;
  fase: FaseRodada;
  ordem: number;
  pontos: number;
  placaresExatos: number;
  decidida: boolean;
};

/** Palpite de um participante com os pontos JÁ calculados, para o resumo do jogo. */
export type PalpiteResumo = {
  nome: string;
  apelido: string | null;
  palpite: Placar;
  pontos: Pontos;
};

/** Dados do resumo de um jogo (§12.3): o confronto, o placar real e os palpites pontuados. */
export type ResumoJogo = {
  ordem: number;
  esquerda: { nome: string; bandeira: string };
  direita: { nome: string; bandeira: string };
  resultado: Placar;
  palpites: PalpiteResumo[];
};

/**
 * Registra (ou corrige) o placar real de um jogo. Grava SÓ os gols reais; valida que
 * o jogo existe e que os gols são inteiros >= 0. Reeditar apenas regrava — a
 * pontuação não é tocada aqui (é derivada), então a correção é livre (§8.6).
 */
export async function registrarResultado(
  jogoId: string,
  golsEsquerda: number,
  golsDireita: number,
): Promise<Jogo> {
  if (!(await rodadaRepo.buscarJogoPorId(jogoId))) {
    throw new JogoNaoEncontrado(jogoId);
  }
  if (!placarValido(golsEsquerda, golsDireita)) {
    throw new ResultadoInvalido("Os gols devem ser números inteiros maiores ou iguais a zero.");
  }
  return rodadaRepo.registrarResultadoJogo(jogoId, golsEsquerda, golsDireita);
}

/**
 * Pontos DA RODADA por participante (só os jogos decididos da rodada), já ordenados
 * pela cascata de desempate — insumo do resumo da rodada (§12.4).
 */
export async function pontosDaRodada(rodadaId: string): Promise<LinhaPontuacao[]> {
  if (!(await rodadaRepo.buscarPorId(rodadaId))) {
    throw new RodadaNaoEncontrada(rodadaId);
  }
  const jogos = paraJogosComResultado(await rodadaRepo.listarJogosComResultado(rodadaId));
  const participantes = await participanteRepo.listarTodos();
  const palpites = await palpiteRepo.listarPorRodada(rodadaId);
  return ranquear(jogos, participantes, palpites);
}

/**
 * Classificação geral: pontos ACUMULADOS de todas as rodadas com resultado, ordenados
 * pela cascata de desempate (§8.5) — insumo do §12.5.
 */
export async function classificacaoGeral(): Promise<LinhaPontuacao[]> {
  const jogos = paraJogosComResultado(await rodadaRepo.listarJogosComResultado());
  const participantes = await participanteRepo.listarTodos();
  const palpites = await palpiteRepo.listarTodos();
  return ranquear(jogos, participantes, palpites);
}

/**
 * Desempenho de UM participante rodada a rodada (breakdown por fase — §12.4). AGREGA,
 * não recalcula: reusa `pontosDaRodada` (a regra 3/1/0 e a cascata já vivem lá) e só
 * filtra a linha da pessoa. Inclui TODAS as rodadas na ordem — o `decidida` deixa o
 * consumidor distinguir "fez 0 pontos" de "rodada ainda sem resultado".
 */
export async function desempenhoPorRodada(participanteId: string): Promise<DesempenhoRodada[]> {
  const rodadas = await rodadaRepo.listar(); // já ordenadas por `ordem` asc
  const linhas: DesempenhoRodada[] = [];
  for (const rodada of rodadas) {
    const ranking = await pontosDaRodada(rodada.id);
    const linha = ranking.find((l) => l.id === participanteId);
    const decidida = (await rodadaRepo.listarJogosComResultado(rodada.id)).length > 0;
    linhas.push({
      rodadaId: rodada.id,
      fase: rodada.fase,
      ordem: rodada.ordem,
      pontos: linha?.pontos ?? 0,
      placaresExatos: linha?.placaresExatos ?? 0,
      decidida,
    });
  }
  return linhas;
}

/** Dados do resumo de um jogo (§12.3): cada palpite com seus pontos já calculados. */
export async function dadosResumoJogo(jogoId: string): Promise<ResumoJogo> {
  const jogo = await rodadaRepo.buscarJogoComPalpites(jogoId);
  if (!jogo) {
    throw new JogoNaoEncontrado(jogoId);
  }
  if (jogo.golsEsquerdaReal === null || jogo.golsDireitaReal === null) {
    throw new ResultadoNaoRegistrado(jogoId);
  }
  const resultado: Placar = {
    golsEsquerda: jogo.golsEsquerdaReal,
    golsDireita: jogo.golsDireitaReal,
  };
  const palpites: PalpiteResumo[] = jogo.palpites.map((p) => {
    const palpite: Placar = { golsEsquerda: p.golsEsquerda, golsDireita: p.golsDireita };
    return {
      nome: p.participante.nome,
      apelido: p.participante.apelido,
      palpite,
      pontos: calcularPontos(palpite, resultado),
    };
  });
  return {
    ordem: jogo.ordem,
    esquerda: { nome: jogo.selecaoEsquerda.nome, bandeira: jogo.selecaoEsquerda.bandeira },
    direita: { nome: jogo.selecaoDireita.nome, bandeira: jogo.selecaoDireita.bandeira },
    resultado,
    palpites,
  };
}

// — internos —————————————————————————————————————————————————————————————————————

type VinculoPalpite = {
  participanteId: string;
  jogoId: string;
  golsEsquerda: number;
  golsDireita: number;
};

/**
 * Núcleo do recálculo: agrega as estatísticas de cada participante (pura
 * `calcularEstatisticas`, que trata palpite ausente como 0) e ordena pela cascata
 * de desempate (pura `ordenarClassificacao`). Serve tanto à rodada quanto ao geral —
 * só muda o universo de jogos/palpites passado.
 */
function ranquear(
  jogos: ReadonlyArray<JogoComResultado>,
  participantes: ReadonlyArray<Participante>,
  palpites: ReadonlyArray<VinculoPalpite>,
): LinhaPontuacao[] {
  const palpitesPorParticipante = new Map<string, PalpiteDoParticipante[]>();
  for (const p of palpites) {
    const lista = palpitesPorParticipante.get(p.participanteId) ?? [];
    lista.push({
      jogoId: p.jogoId,
      palpite: { golsEsquerda: p.golsEsquerda, golsDireita: p.golsDireita },
    });
    palpitesPorParticipante.set(p.participanteId, lista);
  }

  const linhasPorId = new Map<string, LinhaPontuacao>();
  const classificaveis = participantes.map((participante) => {
    const stats = calcularEstatisticas(jogos, palpitesPorParticipante.get(participante.id) ?? []);
    linhasPorId.set(participante.id, {
      id: participante.id,
      nome: participante.nome,
      apelido: participante.apelido,
      ...stats,
    });
    return { id: participante.id, ...stats };
  });

  return ordenarClassificacao(classificaveis).flatMap((c) => {
    const linha = linhasPorId.get(c.id);
    return linha ? [linha] : [];
  });
}

/** Converte os jogos do banco (gols reais nulláveis) no shape puro, descartando nulos. */
function paraJogosComResultado(jogos: ReadonlyArray<Jogo>): JogoComResultado[] {
  return jogos.flatMap((jogo) =>
    jogo.golsEsquerdaReal !== null && jogo.golsDireitaReal !== null
      ? [
          {
            jogoId: jogo.id,
            resultado: { golsEsquerda: jogo.golsEsquerdaReal, golsDireita: jogo.golsDireitaReal },
          },
        ]
      : [],
  );
}

function placarValido(golsEsquerda: number, golsDireita: number): boolean {
  return (
    Number.isInteger(golsEsquerda) &&
    Number.isInteger(golsDireita) &&
    golsEsquerda >= 0 &&
    golsDireita >= 0
  );
}
