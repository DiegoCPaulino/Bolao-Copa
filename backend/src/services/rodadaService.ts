import {
  JogoComPalpites,
  JogoInvalido,
  JogoNaoEncontrado,
  RodadaNaoEncontrada,
  SelecaoInvalida,
} from "../domain/erros.js";
import type {
  EstadoRodada,
  FaseRodada,
  Rodada,
  RodadaDetalhada,
  RodadaResumo,
} from "../repositories/rodadaRepository.js";
import * as rodadaRepo from "../repositories/rodadaRepository.js";
import * as selecaoRepo from "../repositories/selecaoRepository.js";

/**
 * Serviço de Rodadas e Jogos — AGNÓSTICO de interface (CLAUDE.md §3.1). Orquestra os
 * repositórios e reusa o catálogo (selecaoRepository) para validar os times.
 */

export type { EstadoRodada, FaseRodada, Rodada, RodadaDetalhada, RodadaResumo };

/** Um jogo a montar: as duas seleções, por id (POSICIONAIS — decisão #15). */
export type JogoParaMontar = {
  selecaoEsquerdaId: string;
  selecaoDireitaId: string;
};

/**
 * Monta a rodada: cria a Rodada (estado inicial MONTADA) e seus jogos. `N` é livre —
 * o chamador decide quantos jogos (acomoda a rodada final de 2 jogos, decisão #19,
 * sem código especial).
 *
 * A `ordem` da RODADA é responsabilidade do SERVIÇO (não do adaptador, CLAUDE.md §3.3):
 * é a próxima da sequência, derivada AQUI no momento da criação (`proximaOrdem`). Os
 * jogos também são numerados aqui (1..N). Single-user, sem concorrência — não há corrida
 * pela próxima ordem.
 *
 * Valida: ao menos um jogo; em cada jogo, as duas seleções EXISTEM no catálogo e são
 * DISTINTAS (2x1 ≠ 1x2, mas um time não joga contra si mesmo).
 */
export async function montarRodada(
  fase: FaseRodada,
  jogos: ReadonlyArray<JogoParaMontar>,
): Promise<RodadaDetalhada> {
  if (jogos.length === 0) {
    throw new JogoInvalido("A rodada precisa de pelo menos um jogo.");
  }
  for (const jogo of jogos) {
    await validarParDeSelecoes(jogo.selecaoEsquerdaId, jogo.selecaoDireitaId);
  }

  const ordem = await rodadaRepo.proximaOrdem();
  const dadosJogos = jogos.map((jogo, indice) => ({ ordem: indice + 1, ...jogo }));
  return rodadaRepo.criarComJogos(fase, ordem, dadosJogos);
}

/**
 * Cria uma rodada VAZIA (montagem INCREMENTAL): os jogos entram depois, um a um, via
 * `adicionarJogo`. A `ordem` da rodada é derivada AQUI (próxima da sequência). Útil
 * porque os confrontos de uma fase só se definem conforme a anterior acontece.
 */
export async function criarRodada(fase: FaseRodada): Promise<RodadaDetalhada> {
  const ordem = await rodadaRepo.proximaOrdem();
  return rodadaRepo.criarRodadaVazia(fase, ordem);
}

/**
 * Adiciona UM jogo a uma rodada existente. A `ordem` do jogo é MAX+1 dentro da rodada
 * (espelha a ordem da rodada). Devolve a rodada DETALHADA (lista atualizada, para o
 * adaptador reexibir J1, J2…). NÃO é bloqueado pelo estado da rodada (§3.7).
 */
export async function adicionarJogo(
  rodadaId: string,
  selecaoEsquerdaId: string,
  selecaoDireitaId: string,
): Promise<RodadaDetalhada> {
  if (!(await rodadaRepo.buscarPorId(rodadaId))) {
    throw new RodadaNaoEncontrada(rodadaId);
  }
  await validarParDeSelecoes(selecaoEsquerdaId, selecaoDireitaId);
  const ordem = await rodadaRepo.proximaOrdemJogo(rodadaId);
  await rodadaRepo.criarJogo(rodadaId, ordem, selecaoEsquerdaId, selecaoDireitaId);
  return detalharRodada(rodadaId);
}

/**
 * Edita as duas seleções de um jogo (correção livre §3.7) — não toca `ordem`, placar
 * real nem palpites. Devolve a rodada detalhada.
 */
export async function editarJogo(
  jogoId: string,
  selecaoEsquerdaId: string,
  selecaoDireitaId: string,
): Promise<RodadaDetalhada> {
  const jogo = await rodadaRepo.buscarJogoPorId(jogoId);
  if (!jogo) {
    throw new JogoNaoEncontrado(jogoId);
  }
  await validarParDeSelecoes(selecaoEsquerdaId, selecaoDireitaId);
  await rodadaRepo.atualizarJogoSelecoes(jogoId, selecaoEsquerdaId, selecaoDireitaId);
  return detalharRodada(jogo.rodadaId);
}

/**
 * Remove um jogo. RECUSA se já houver palpites (palpite é dado real — não se apaga em
 * cascata; o operador zera/remove os palpites antes). A `ordem` dos demais jogos NÃO é
 * renumerada: `ordem` é um FATO (pode ter circulado no grupo), não rótulo cosmético.
 */
export async function removerJogo(jogoId: string): Promise<RodadaDetalhada> {
  const jogo = await rodadaRepo.buscarJogoPorId(jogoId);
  if (!jogo) {
    throw new JogoNaoEncontrado(jogoId);
  }
  if ((await rodadaRepo.contarPalpitesDoJogo(jogoId)) > 0) {
    throw new JogoComPalpites(jogoId);
  }
  await rodadaRepo.removerJogo(jogoId);
  return detalharRodada(jogo.rodadaId);
}

export function listarRodadas(): Promise<RodadaResumo[]> {
  return rodadaRepo.listar();
}

export async function detalharRodada(id: string): Promise<RodadaDetalhada> {
  const rodada = await rodadaRepo.buscarPorId(id);
  if (!rodada) {
    throw new RodadaNaoEncontrada(id);
  }
  return rodada;
}

/**
 * Define o estado da rodada. ⚠️ O estado é um GUIA, NÃO uma trava (CLAUDE.md §3.7;
 * funcional §8.6/§11): qualquer estado pode ir para qualquer outro e NENHUMA ação do
 * sistema é bloqueada pelo estado. Por isso a única validação é "a rodada existe" —
 * de propósito não há "validação de transição". Correções são sempre livres.
 */
export async function definirEstado(id: string, estado: EstadoRodada): Promise<Rodada> {
  if (!(await rodadaRepo.buscarPorId(id))) {
    throw new RodadaNaoEncontrada(id);
  }
  return rodadaRepo.atualizarEstado(id, estado);
}

/**
 * Sanidade de ENTRADA de um par de seleções (não é regra de negócio nova — é a mesma
 * já aplicada hoje): as duas seleções devem ser DISTINTAS (um time não joga contra si;
 * 2×1 ≠ 1×2 continua posicional) e ambas EXISTIR no catálogo. Reusada por `montarRodada`
 * (atômico) e pelos `adicionarJogo`/`editarJogo` (incrementais).
 */
async function validarParDeSelecoes(
  selecaoEsquerdaId: string,
  selecaoDireitaId: string,
): Promise<void> {
  if (selecaoEsquerdaId === selecaoDireitaId) {
    throw new JogoInvalido("Um jogo não pode ter a mesma seleção nos dois lados.");
  }
  await garantirSelecaoExiste(selecaoEsquerdaId);
  await garantirSelecaoExiste(selecaoDireitaId);
}

async function garantirSelecaoExiste(id: string): Promise<void> {
  if (!(await selecaoRepo.buscarPorId(id))) {
    throw new SelecaoInvalida(id);
  }
}
