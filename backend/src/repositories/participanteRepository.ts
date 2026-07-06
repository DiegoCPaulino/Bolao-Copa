import type { Participante, Prisma, StatusPagamento } from "@prisma/client";
import { prisma } from "../config/prisma.js";

/**
 * Repositório de Participante — ÚNICA camada que fala Prisma (CLAUDE.md §3.5/§5).
 *
 * CRUD CRU, sem regra de negócio: ele lê/escreve dados como estão. Quem valida,
 * orquestra e decide o que pode acontecer é o serviço; quem imprime é o CLI.
 * Expor os tipos do Prisma daqui (e não importá-los no serviço) mantém o resto do
 * núcleo sem dependência direta do ORM.
 */

/** Participante cru, como vem do banco. */
export type { Participante, StatusPagamento };

/** Participante com o indicador resolvido (para exibir "indicado por X"). */
export type ParticipanteComIndicador = Prisma.ParticipanteGetPayload<{
  include: { indicador: true };
}>;

/** Campos que o repositório aceita gravar (nunca derivados — CLAUDE.md §3.2). */
export type DadosGravaveis = {
  nome: string;
  apelido: string | null;
  indicadorId: string | null;
  isento: boolean;
  // Override de APRESENTAÇÃO (funcional §8.8): é INPUT do organizador, por isso se
  // grava — não é derivado. Só afeta a EXPORTAÇÃO; `status` segue sendo a verdade.
  exibirComoPago: boolean;
  // Override do VALOR a pagar (fatia #4): INPUT (o valor DIGITADO, não um derivado —
  // §3.2). NULL = sem override (usa a fórmula). Substitui base/desconto/piso.
  valorCustomizado: number | null;
};

/** Opções de listagem: busca/filtro/ordenação simples (funcional §9.1, item 2). */
export type OpcoesListagem = {
  /** Substring (case-insensitive) casada contra nome E apelido. */
  busca?: string;
  status?: StatusPagamento;
  ordenarPor?: "nome" | "criadoEm";
};

export function criar(dados: DadosGravaveis): Promise<Participante> {
  return prisma.participante.create({ data: dados });
}

export function listar(opcoes: OpcoesListagem = {}): Promise<ParticipanteComIndicador[]> {
  const { busca, status, ordenarPor = "nome" } = opcoes;

  // `where` é montado só com o que foi pedido — chaves `undefined` o Prisma ignora.
  const filtroBusca: Prisma.ParticipanteWhereInput | undefined = busca
    ? {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { apelido: { contains: busca, mode: "insensitive" } },
        ],
      }
    : undefined;

  return prisma.participante.findMany({
    where: { status, ...filtroBusca },
    orderBy: ordenarPor === "criadoEm" ? { criadoEm: "desc" } : { nome: "asc" },
    include: { indicador: true },
  });
}

export function buscarPorId(id: string): Promise<Participante | null> {
  return prisma.participante.findUnique({ where: { id } });
}

/**
 * Todos os participantes na forma crua (sem o grafo de indicador), ordenados por
 * nome — é o insumo dos cálculos DERIVADOS de pagamento (valor a pagar e totais).
 * Cada linha já traz `indicadorId` e `status`; quem deriva é o serviço.
 */
export function listarTodos(): Promise<Participante[]> {
  return prisma.participante.findMany({ orderBy: { nome: "asc" } });
}

/**
 * Atualiza SÓ o status de pagamento. É o único dado de pagamento que se escreve —
 * valor a pagar e totais são derivados, nunca colunas (CLAUDE.md §3.2).
 */
export function atualizarStatus(id: string, status: StatusPagamento): Promise<Participante> {
  return prisma.participante.update({ where: { id }, data: { status } });
}

export function atualizar(id: string, dados: DadosGravaveis): Promise<Participante> {
  return prisma.participante.update({ where: { id }, data: dados });
}

export async function apagar(id: string): Promise<void> {
  // A FK auto-referente é ON DELETE SET NULL (migration init): apagar um indicador
  // apenas desfaz o vínculo dos indicados — não os apaga em cascata.
  await prisma.participante.delete({ where: { id } });
}

/**
 * Conta quantos participantes têm este `id` como indicador direto.
 *
 * Usado já aqui (aviso na remoção) e, depois, por Pagamentos para o desconto por
 * indicação (funcional §8.7) — por isso o repositório já o expõe.
 */
export function contarIndicadosDiretos(indicadorId: string): Promise<number> {
  return prisma.participante.count({ where: { indicadorId } });
}

/**
 * Quantos palpites o participante já tem — insumo da guarda de remoção (palpite é
 * histórico, não se apaga em cascata). Espelha `contarPalpitesDoJogo` do rodadaRepository.
 */
export function contarPalpitesDoParticipante(participanteId: string): Promise<number> {
  return prisma.palpite.count({ where: { participanteId } });
}
