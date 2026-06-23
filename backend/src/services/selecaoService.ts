import type { Selecao } from "../repositories/selecaoRepository.js";
import * as repo from "../repositories/selecaoRepository.js";

/**
 * Serviço de Catálogo de seleções — AGNÓSTICO de interface (CLAUDE.md §3.1). É SÓ
 * LEITURA: o catálogo se completa pelo seed (decisão opção A; funcional decisão #13).
 *
 * `listarSelecoes` devolve a seleção completa (id + nome + bandeira) de propósito: a
 * fatia de Rodadas vai REUSAR isto para o usuário SELECIONAR os times (precisa do id
 * para montar o jogo; do nome/bandeira para exibir).
 */

export type { Selecao };

export function listarSelecoes(): Promise<Selecao[]> {
  return repo.listar();
}
