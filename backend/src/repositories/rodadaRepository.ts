import type { EstadoRodada, FaseRodada, Jogo, Prisma, Rodada } from "@prisma/client";
import { prisma } from "../config/prisma.js";

/**
 * Repositório de Rodada — ÚNICA camada que fala Prisma (CLAUDE.md §3.5). CRU: a regra
 * (seleções válidas/distintas, ordem dos jogos) mora no serviço.
 *
 * Jogo guarda `selecaoEsquerdaId`/`selecaoDireitaId` POSICIONAIS (decisão #15: só
 * importam para o placar, NÃO são mando de campo) e nasce com gols reais NULOS.
 */

export type { EstadoRodada, FaseRodada, Jogo, Rodada };

/** Rodada com os jogos e as duas seleções de cada jogo (para detalhe/exportação). */
export type RodadaDetalhada = Prisma.RodadaGetPayload<{
  include: { jogos: { include: { selecaoEsquerda: true; selecaoDireita: true } } };
}>;

/** Rodada com a contagem de jogos (para a listagem). */
export type RodadaResumo = Prisma.RodadaGetPayload<{
  include: { _count: { select: { jogos: true } } };
}>;

export type DadosJogo = {
  ordem: number;
  selecaoEsquerdaId: string;
  selecaoDireitaId: string;
};

const JOGOS_DETALHADOS = {
  include: { selecaoEsquerda: true, selecaoDireita: true },
  orderBy: { ordem: "asc" },
} as const satisfies Prisma.Rodada$jogosArgs;

/**
 * Cria a rodada e seus jogos atomicamente: o `create` aninhado do Prisma roda a
 * rodada-mãe e os jogos-filhos numa única transação implícita.
 */
export function criarComJogos(
  fase: FaseRodada,
  ordem: number,
  jogos: ReadonlyArray<DadosJogo>,
): Promise<RodadaDetalhada> {
  return prisma.rodada.create({
    data: {
      fase,
      ordem,
      jogos: { create: jogos.map((j) => ({ ...j })) },
    },
    include: { jogos: JOGOS_DETALHADOS },
  });
}

export function listar(): Promise<RodadaResumo[]> {
  return prisma.rodada.findMany({
    orderBy: { ordem: "asc" },
    include: { _count: { select: { jogos: true } } },
  });
}

/**
 * Próxima `ordem` na sequência de rodadas: MAX(ordem) + 1 (ou 1 se não houver
 * nenhuma). Usa MAX (não contagem) para a sequência seguir monotônica mesmo se uma
 * rodada for removida — assim a ordem nunca é reusada.
 */
export async function proximaOrdem(): Promise<number> {
  const { _max } = await prisma.rodada.aggregate({ _max: { ordem: true } });
  return (_max.ordem ?? 0) + 1;
}

export function buscarPorId(id: string): Promise<RodadaDetalhada | null> {
  return prisma.rodada.findUnique({ where: { id }, include: { jogos: JOGOS_DETALHADOS } });
}

export function atualizarEstado(id: string, estado: EstadoRodada): Promise<Rodada> {
  return prisma.rodada.update({ where: { id }, data: { estado } });
}

// — Jogos (parte do agregado Rodada): leitura/escrita do RESULTADO real —————————

/** Jogo com seleções e palpites (com o dono), para o resumo do jogo (§12.3). */
export type JogoComPalpites = Prisma.JogoGetPayload<{
  include: {
    selecaoEsquerda: true;
    selecaoDireita: true;
    palpites: { include: { participante: { select: { nome: true; apelido: true } } } };
  };
}>;

export function buscarJogoPorId(id: string): Promise<Jogo | null> {
  return prisma.jogo.findUnique({ where: { id } });
}

/**
 * Grava SÓ o placar real do jogo (90 min). Nunca pontos/derivado (CLAUDE.md §3.2):
 * a pontuação é recalculada sob demanda. Reeditar é só regravar (correção livre §8.6).
 */
export function registrarResultadoJogo(
  id: string,
  golsEsquerdaReal: number,
  golsDireitaReal: number,
): Promise<Jogo> {
  return prisma.jogo.update({ where: { id }, data: { golsEsquerdaReal, golsDireitaReal } });
}

/** Jogos JÁ decididos (com placar real); de uma rodada ou, sem filtro, de todas. */
export function listarJogosComResultado(rodadaId?: string): Promise<Jogo[]> {
  return prisma.jogo.findMany({
    where: { golsEsquerdaReal: { not: null }, ...(rodadaId !== undefined ? { rodadaId } : {}) },
  });
}

export function buscarJogoComPalpites(id: string): Promise<JogoComPalpites | null> {
  return prisma.jogo.findUnique({
    where: { id },
    include: {
      selecaoEsquerda: true,
      selecaoDireita: true,
      palpites: { include: { participante: { select: { nome: true, apelido: true } } } },
    },
  });
}
