import {
  IndicacaoInvalida,
  IndicadorNaoEncontrado,
  NomeObrigatorio,
  ParticipanteNaoEncontrado,
} from "../domain/erros.js";
import type {
  OpcoesListagem,
  Participante,
  ParticipanteComIndicador,
} from "../repositories/participanteRepository.js";
import * as repo from "../repositories/participanteRepository.js";

/**
 * Serviço de Participante — caso de uso AGNÓSTICO de interface (CLAUDE.md §3.1, a
 * regra nº 1). Recebe dados tipados, devolve dados tipados; nada de `console.log`,
 * de prompt do terminal ou de tipos de HTTP aqui dentro. É exatamente este código
 * que a Entrega 2 reusa atrás da API, sem reescrever regra.
 *
 * Divisão de papéis: o serviço VALIDA invariantes e orquestra o repositório; o
 * repositório PERSISTE; o adaptador (CLI/HTTP) traduz entrada/saída e erros.
 */

/** Dado tipado que o serviço espera — o adaptador produz isto via Zod. */
export type DadosParticipante = {
  nome: string;
  apelido: string | null;
  indicadorId: string | null;
  // Isento de PAGAMENTO (funcional §8.7/§8.8): não muda nada da disputa; só tira o
  // participante do universo de cobrança (quem filtra é o pagamentoService).
  // Opcional por conveniência: ausente = não isento (o Zod do adaptador já manda boolean).
  isento?: boolean;
  // Exibir como pago no grupo (funcional §8.8): override de APRESENTAÇÃO, só na
  // exportação. Opcional como `isento`: ausente = false (o Zod do adaptador já resolve).
  exibirComoPago?: boolean;
};

export type { Participante, ParticipanteComIndicador };

export async function criarParticipante(dados: DadosParticipante): Promise<Participante> {
  const nome = exigirNome(dados.nome);
  await garantirIndicadorValido(dados.indicadorId, null);
  return repo.criar({
    nome,
    apelido: dados.apelido,
    indicadorId: dados.indicadorId,
    isento: dados.isento ?? false,
    exibirComoPago: dados.exibirComoPago ?? false,
  });
}

export async function atualizarParticipante(
  id: string,
  dados: DadosParticipante,
): Promise<Participante> {
  await exigirExistente(id);
  const nome = exigirNome(dados.nome);
  await garantirIndicadorValido(dados.indicadorId, id);
  return repo.atualizar(id, {
    nome,
    apelido: dados.apelido,
    indicadorId: dados.indicadorId,
    isento: dados.isento ?? false,
    exibirComoPago: dados.exibirComoPago ?? false,
  });
}

export async function removerParticipante(id: string): Promise<void> {
  await exigirExistente(id);
  await repo.apagar(id);
}

export function listarParticipantes(
  opcoes: OpcoesListagem = {},
): Promise<ParticipanteComIndicador[]> {
  return repo.listar(opcoes);
}

export function buscarParticipante(id: string): Promise<Participante | null> {
  return repo.buscarPorId(id);
}

export function contarIndicadosDiretos(id: string): Promise<number> {
  return repo.contarIndicadosDiretos(id);
}

// — invariantes (privadas) —————————————————————————————————————————————————————

/**
 * Garante o nome não-vazio aqui (e não só no Zod do adaptador) porque é uma
 * invariante do NÚCLEO: vale para qualquer chamador, inclusive o HTTP da Entrega 2.
 */
function exigirNome(nome: string): string {
  const limpo = nome.trim();
  if (limpo === "") {
    throw new NomeObrigatorio();
  }
  return limpo;
}

async function exigirExistente(id: string): Promise<void> {
  if (!(await repo.buscarPorId(id))) {
    throw new ParticipanteNaoEncontrado(id);
  }
}

/**
 * Indicação só direta e por seleção de existente (funcional §8.7, decisão #10):
 * o indicador precisa estar cadastrado, e ninguém indica a si mesmo (vínculo que
 * não faz sentido e atrapalharia a contagem de indicados). `idAtual` é o próprio
 * participante na edição (no cadastro ainda não há id, daí `null`).
 */
async function garantirIndicadorValido(
  indicadorId: string | null,
  idAtual: string | null,
): Promise<void> {
  if (indicadorId === null) {
    return;
  }
  if (indicadorId === idAtual) {
    throw new IndicacaoInvalida("Um participante não pode indicar a si mesmo.");
  }
  if (!(await repo.buscarPorId(indicadorId))) {
    throw new IndicadorNaoEncontrado(indicadorId);
  }
}
