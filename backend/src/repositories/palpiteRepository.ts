import type { Palpite, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

/**
 * Repositório de Palpite — ÚNICA camada que fala Prisma (CLAUDE.md §3.5). Sem coluna
 * derivada: o palpite guarda só o placar cru (gols esquerda/direita); pontos são
 * calculados sob demanda (fatia de Resultados). A regra mora no serviço.
 */

export type { Palpite };

/** Palpite com o que a tabela/pendências precisam: dono e ordem do jogo. */
export type PalpiteComContexto = Prisma.PalpiteGetPayload<{
  include: {
    participante: { select: { nome: true; apelido: true } };
    jogo: { select: { ordem: true } };
  };
}>;

export type DadosPalpite = {
  participanteId: string;
  jogoId: string;
  golsEsquerda: number;
  golsDireita: number;
};

/**
 * Cria OU atualiza um palpite (correção livre — §8.6), pela chave única
 * `@@unique([participanteId, jogoId])`: nunca há dois palpites do mesmo
 * participante no mesmo jogo.
 */
export function upsert(dados: DadosPalpite): Promise<Palpite> {
  const { participanteId, jogoId, golsEsquerda, golsDireita } = dados;
  return prisma.palpite.upsert({
    where: { participanteId_jogoId: { participanteId, jogoId } },
    create: dados,
    update: { golsEsquerda, golsDireita },
  });
}

/** Upsert de vários palpites de uma vez, atomicamente (tudo ou nada). */
export function upsertMuitos(palpites: ReadonlyArray<DadosPalpite>): Promise<Palpite[]> {
  return prisma.$transaction(
    palpites.map((dados) =>
      prisma.palpite.upsert({
        where: {
          participanteId_jogoId: {
            participanteId: dados.participanteId,
            jogoId: dados.jogoId,
          },
        },
        create: dados,
        update: { golsEsquerda: dados.golsEsquerda, golsDireita: dados.golsDireita },
      }),
    ),
  );
}

/** Todos os palpites dos jogos de uma rodada (para a tabela e as pendências). */
export function listarPorRodada(rodadaId: string): Promise<PalpiteComContexto[]> {
  return prisma.palpite.findMany({
    where: { jogo: { rodadaId } },
    include: {
      participante: { select: { nome: true, apelido: true } },
      jogo: { select: { ordem: true } },
    },
    orderBy: [{ participanteId: "asc" }, { jogo: { ordem: "asc" } }],
  });
}

/** Todos os palpites do torneio (insumo do acumulado da classificação geral). */
export function listarTodos(): Promise<Palpite[]> {
  return prisma.palpite.findMany();
}

/** Palpites de um participante numa rodada (para pré-preencher a correção). */
export function listarPorParticipanteNaRodada(
  participanteId: string,
  rodadaId: string,
): Promise<Palpite[]> {
  return prisma.palpite.findMany({ where: { participanteId, jogo: { rodadaId } } });
}
