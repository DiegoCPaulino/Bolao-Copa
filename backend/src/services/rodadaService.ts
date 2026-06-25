import { JogoInvalido, RodadaNaoEncontrada, SelecaoInvalida } from "../domain/erros.js";
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
    if (jogo.selecaoEsquerdaId === jogo.selecaoDireitaId) {
      throw new JogoInvalido("Um jogo não pode ter a mesma seleção nos dois lados.");
    }
    await garantirSelecaoExiste(jogo.selecaoEsquerdaId);
    await garantirSelecaoExiste(jogo.selecaoDireitaId);
  }

  const ordem = await rodadaRepo.proximaOrdem();
  const dadosJogos = jogos.map((jogo, indice) => ({ ordem: indice + 1, ...jogo }));
  return rodadaRepo.criarComJogos(fase, ordem, dadosJogos);
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

async function garantirSelecaoExiste(id: string): Promise<void> {
  if (!(await selecaoRepo.buscarPorId(id))) {
    throw new SelecaoInvalida(id);
  }
}
