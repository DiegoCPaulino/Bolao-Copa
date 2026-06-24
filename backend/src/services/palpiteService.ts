import {
  JogoForaDaRodada,
  PalpiteInvalido,
  ParticipanteNaoEncontrado,
  RodadaNaoEncontrada,
} from "../domain/erros.js";
import { participantesSemPalpite } from "../domain/palpites.js";
import type { Palpite } from "../repositories/palpiteRepository.js";
import * as palpiteRepo from "../repositories/palpiteRepository.js";
import type { Participante } from "../repositories/participanteRepository.js";
import * as participanteRepo from "../repositories/participanteRepository.js";
import * as rodadaRepo from "../repositories/rodadaRepository.js";

/**
 * Serviço de Palpites — AGNÓSTICO de interface (CLAUDE.md §3.1). Reusa a função PURA
 * `participantesSemPalpite` (Fase 1) e o `@@unique` do schema (Fase 3); não duplica
 * regra nem fala com terminal/HTTP.
 */

export type { Palpite, Participante };

/** Um palpite a registrar: o jogo e o placar (90 min). */
export type PalpiteEntrada = {
  jogoId: string;
  golsEsquerda: number;
  golsDireita: number;
};

/** Uma linha da tabela de palpites: o participante e seus palpites por jogo. */
export type LinhaPalpiteParticipante = {
  nome: string;
  apelido: string | null;
  palpites: { jogoOrdem: number; golsEsquerda: number; golsDireita: number }[];
};

/**
 * Registra os palpites de um participante numa rodada — UPSERT por jogo: cria se é o
 * primeiro, ATUALIZA se já existia (correção sempre livre, §8.6; nunca duplica, pelo
 * `@@unique`). Valida: rodada e participante existem; cada jogo pertence à rodada;
 * gols inteiros >= 0.
 */
export async function registrarPalpites(
  rodadaId: string,
  participanteId: string,
  palpites: ReadonlyArray<PalpiteEntrada>,
): Promise<Palpite[]> {
  const rodada = await rodadaRepo.buscarPorId(rodadaId);
  if (!rodada) {
    throw new RodadaNaoEncontrada(rodadaId);
  }
  if (!(await participanteRepo.buscarPorId(participanteId))) {
    throw new ParticipanteNaoEncontrado(participanteId);
  }

  const jogosDaRodada = new Set(rodada.jogos.map((jogo) => jogo.id));
  for (const palpite of palpites) {
    if (!placarValido(palpite)) {
      throw new PalpiteInvalido("Os gols devem ser números inteiros maiores ou iguais a zero.");
    }
    if (!jogosDaRodada.has(palpite.jogoId)) {
      throw new JogoForaDaRodada(palpite.jogoId, rodadaId);
    }
  }

  return palpiteRepo.upsertMuitos(palpites.map((palpite) => ({ participanteId, ...palpite })));
}

/** Palpites já registrados de um participante na rodada (para pré-preencher a edição). */
export function palpitesDoParticipante(
  rodadaId: string,
  participanteId: string,
): Promise<Palpite[]> {
  return palpiteRepo.listarPorParticipanteNaRodada(participanteId, rodadaId);
}

/**
 * Quem ainda NÃO palpitou na rodada. O serviço só busca os dados (jogos da rodada,
 * participantes, vínculos de palpite) e delega à PURA `participantesSemPalpite`, que
 * trata "não palpitou" como BINÁRIO (zero palpites = pendente; parcial conta como
 * palpitou).
 */
export async function participantesPendentes(rodadaId: string): Promise<Participante[]> {
  const rodada = await rodadaRepo.buscarPorId(rodadaId);
  if (!rodada) {
    throw new RodadaNaoEncontrada(rodadaId);
  }
  const jogoIds = rodada.jogos.map((jogo) => jogo.id);
  const participantes = await participanteRepo.listarTodos();
  const palpites = await palpiteRepo.listarPorRodada(rodadaId);
  const vinculos = palpites.map((p) => ({ participanteId: p.participanteId, jogoId: p.jogoId }));
  return participantesSemPalpite(jogoIds, participantes, vinculos);
}

/**
 * Dados da tabela de palpites da rodada (§12.2): uma linha por participante que
 * palpitou, com os palpites ordenados pela ordem do jogo. Quem não palpitou não tem
 * linha (aparece nas pendências, não na tabela).
 */
export async function dadosTabelaPalpites(rodadaId: string): Promise<LinhaPalpiteParticipante[]> {
  if (!(await rodadaRepo.buscarPorId(rodadaId))) {
    throw new RodadaNaoEncontrada(rodadaId);
  }
  const palpites = await palpiteRepo.listarPorRodada(rodadaId);

  const porParticipante = new Map<string, LinhaPalpiteParticipante>();
  for (const palpite of palpites) {
    let linha = porParticipante.get(palpite.participanteId);
    if (!linha) {
      linha = {
        nome: palpite.participante.nome,
        apelido: palpite.participante.apelido,
        palpites: [],
      };
      porParticipante.set(palpite.participanteId, linha);
    }
    linha.palpites.push({
      jogoOrdem: palpite.jogo.ordem,
      golsEsquerda: palpite.golsEsquerda,
      golsDireita: palpite.golsDireita,
    });
  }
  return [...porParticipante.values()];
}

function placarValido({ golsEsquerda, golsDireita }: PalpiteEntrada): boolean {
  return (
    Number.isInteger(golsEsquerda) &&
    Number.isInteger(golsDireita) &&
    golsEsquerda >= 0 &&
    golsDireita >= 0
  );
}
