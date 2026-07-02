import {
  JogoForaDaRodada,
  JogoNaoEncontrado,
  PalpiteInvalido,
  ParticipanteNaoEncontrado,
  RodadaNaoEncontrada,
} from "../domain/erros.js";
import { participantesSemPalpite } from "../domain/palpites.js";
import type { Palpite } from "../repositories/palpiteRepository.js";
import * as palpiteRepo from "../repositories/palpiteRepository.js";
import type { Participante } from "../repositories/participanteRepository.js";
import * as participanteRepo from "../repositories/participanteRepository.js";
import type { FaseRodada, JogoComPalpites } from "../repositories/rodadaRepository.js";
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

/** Cabeçalho de um jogo (ordem + os dois lados) — insumo do rótulo dos exports por-jogo. */
export type CabecalhoJogo = {
  ordem: number;
  esquerda: { nome: string; bandeira: string };
  direita: { nome: string; bandeira: string };
};

function cabecalhoDoJogo(jogo: JogoComPalpites): CabecalhoJogo {
  return {
    ordem: jogo.ordem,
    esquerda: { nome: jogo.selecaoEsquerda.nome, bandeira: jogo.selecaoEsquerda.bandeira },
    direita: { nome: jogo.selecaoDireita.nome, bandeira: jogo.selecaoDireita.bandeira },
  };
}

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
    validarPalpite(jogosDaRodada, rodadaId, palpite);
  }

  return palpiteRepo.upsertMuitos(palpites.map((palpite) => ({ participanteId, ...palpite })));
}

/**
 * Registra UM palpite (montagem INCREMENTAL: palpitar jogo a jogo). É um UPSERT de um
 * jogo só — cria se é o primeiro, ATUALIZA se já existia (correção §8.6; nunca duplica,
 * pelo `@@unique`). Mesmas validações do plural, via `validarPalpite` (rodada e
 * participante existem; gols inteiros >= 0; jogo pertence à rodada). Jogos não tocados
 * ficam EM BRANCO — "pular" é não chamar esta função para eles (a pendência segue
 * binária: zero palpites = pendente).
 */
export async function registrarPalpite(
  rodadaId: string,
  participanteId: string,
  jogoId: string,
  golsEsquerda: number,
  golsDireita: number,
): Promise<Palpite> {
  const rodada = await rodadaRepo.buscarPorId(rodadaId);
  if (!rodada) {
    throw new RodadaNaoEncontrada(rodadaId);
  }
  if (!(await participanteRepo.buscarPorId(participanteId))) {
    throw new ParticipanteNaoEncontrado(participanteId);
  }

  const jogosDaRodada = new Set(rodada.jogos.map((jogo) => jogo.id));
  validarPalpite(jogosDaRodada, rodadaId, { jogoId, golsEsquerda, golsDireita });

  return palpiteRepo.upsert({ participanteId, jogoId, golsEsquerda, golsDireita });
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

/**
 * Dados da tabela de palpites de UM jogo (§13.2, variante por-jogo). Orquestração fina:
 * acha a rodada do jogo e REUSA `dadosTabelaPalpites` (as linhas já vêm marcadas por
 * `jogoOrdem`; o formatador filtra o jogo). Devolve fase + cabeçalho do jogo para o
 * adaptador montar o rótulo. Sem regra nova. 404 se o jogo não existe.
 */
export async function dadosTabelaJogo(
  jogoId: string,
): Promise<{ fase: FaseRodada; jogo: CabecalhoJogo; linhas: LinhaPalpiteParticipante[] }> {
  const jogo = await rodadaRepo.buscarJogoComPalpites(jogoId);
  if (!jogo) {
    throw new JogoNaoEncontrado(jogoId);
  }
  const rodada = await rodadaRepo.buscarPorId(jogo.rodadaId);
  if (!rodada) {
    throw new RodadaNaoEncontrada(jogo.rodadaId); // defensivo (FK garante a rodada)
  }
  const linhas = await dadosTabelaPalpites(jogo.rodadaId);
  return { fase: rodada.fase, jogo: cabecalhoDoJogo(jogo), linhas };
}

/**
 * Quem NÃO palpitou UM jogo específico (§13.8, variante por-jogo). REUSA a MESMA pura
 * `participantesSemPalpite`, apenas trocando o universo de jogos para `[jogoId]` — a
 * regra binária não é reescrita; muda só o argumento. Devolve o cabeçalho do jogo para
 * o rótulo. 404 se o jogo não existe.
 */
export async function participantesPendentesDoJogo(
  jogoId: string,
): Promise<{ jogo: CabecalhoJogo; pendentes: Participante[] }> {
  const jogo = await rodadaRepo.buscarJogoComPalpites(jogoId);
  if (!jogo) {
    throw new JogoNaoEncontrado(jogoId);
  }
  const participantes = await participanteRepo.listarTodos();
  const vinculos = jogo.palpites.map((p) => ({
    participanteId: p.participanteId,
    jogoId: p.jogoId,
  }));
  return {
    jogo: cabecalhoDoJogo(jogo),
    pendentes: participantesSemPalpite([jogoId], participantes, vinculos),
  };
}

/**
 * Sanidade de UM palpite (reusada por `registrarPalpites` e `registrarPalpite`): placar
 * válido (gols inteiros >= 0) e jogo pertencente à rodada. Uma regra, um lugar.
 */
function validarPalpite(
  jogosDaRodada: ReadonlySet<string>,
  rodadaId: string,
  palpite: PalpiteEntrada,
): void {
  if (!placarValido(palpite)) {
    throw new PalpiteInvalido("Os gols devem ser números inteiros maiores ou iguais a zero.");
  }
  if (!jogosDaRodada.has(palpite.jogoId)) {
    throw new JogoForaDaRodada(palpite.jogoId, rodadaId);
  }
}

function placarValido({ golsEsquerda, golsDireita }: PalpiteEntrada): boolean {
  return (
    Number.isInteger(golsEsquerda) &&
    Number.isInteger(golsDireita) &&
    golsEsquerda >= 0 &&
    golsDireita >= 0
  );
}
