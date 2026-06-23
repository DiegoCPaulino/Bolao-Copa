import type { Selecao } from "@prisma/client";
import { prisma } from "../config/prisma.js";

/**
 * Repositório de Selecao — ÚNICA camada que fala Prisma (CLAUDE.md §3.5). SÓ LEITURA:
 * o catálogo é populado/editado pelo seed (decisão opção A; funcional decisão #13),
 * não por CRUD de menu. `buscarPorId` já fica pronto para a fatia de Rodadas validar
 * os times escolhidos.
 */

export type { Selecao };

/** Todas as seleções do catálogo, ordenadas por nome. */
export function listar(): Promise<Selecao[]> {
  return prisma.selecao.findMany({ orderBy: { nome: "asc" } });
}

export function buscarPorId(id: string): Promise<Selecao | null> {
  return prisma.selecao.findUnique({ where: { id } });
}
