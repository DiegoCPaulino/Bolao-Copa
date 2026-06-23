import type { EstadoRodada, FaseRodada, Prisma, Rodada } from "@prisma/client";
import { prisma } from "../config/prisma.js";

/**
 * Repositório de Rodada — ÚNICA camada que fala Prisma (CLAUDE.md §3.5). CRU: a regra
 * (seleções válidas/distintas, ordem dos jogos) mora no serviço.
 *
 * Jogo guarda `selecaoEsquerdaId`/`selecaoDireitaId` POSICIONAIS (decisão #15: só
 * importam para o placar, NÃO são mando de campo) e nasce com gols reais NULOS.
 */

export type { EstadoRodada, FaseRodada, Rodada };

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

export function buscarPorId(id: string): Promise<RodadaDetalhada | null> {
  return prisma.rodada.findUnique({ where: { id }, include: { jogos: JOGOS_DETALHADOS } });
}

export function atualizarEstado(id: string, estado: EstadoRodada): Promise<Rodada> {
  return prisma.rodada.update({ where: { id }, data: { estado } });
}
