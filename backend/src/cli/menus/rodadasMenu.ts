import { confirm, select } from "@inquirer/prompts";
import type { EstadoRodada, FaseRodada } from "@prisma/client";
import { formatarMensagemRodada } from "../../domain/whatsapp/mensagemRodada.js";
import {
  criarRodadaInputSchema,
  estadoRodadaSchema,
  jogoInputSchema,
} from "../../schemas/rodadaSchemas.js";
import * as rodadas from "../../services/rodadaService.js";
import * as selecoes from "../../services/selecaoService.js";
import { ESTADO_LABEL, FASE_LABEL } from "../rotulos.js";

/** Um jogo já detalhado (com as duas seleções), como vem na rodada detalhada. */
type JogoDetalhado = rodadas.RodadaDetalhada["jogos"][number];

/**
 * Submenu de Rodadas e Jogos — ADAPTADOR (CLAUDE.md §5): pergunta, chama o serviço e
 * IMPRIME. Esquerda/direita são POSICIONAIS (decisão #15) — a UI nunca fala em
 * casa/fora. O estado é um GUIA (§3.7): a opção de estado só muda o rótulo.
 */

export async function menuRodadas(): Promise<void> {
  let voltar = false;
  while (!voltar) {
    const acao = await select({
      message: "Rodadas e jogos",
      choices: [
        { name: "Montar rodada (nova)", value: "montar" },
        { name: "Adicionar/editar jogos de uma rodada", value: "jogos" },
        { name: "Listar rodadas", value: "listar" },
        { name: "Detalhar rodada", value: "detalhar" },
        { name: "Definir estado (apenas um guia)", value: "estado" },
        { name: "Exportar mensagem da rodada", value: "exportar" },
        { name: "Voltar", value: "voltar" },
      ],
    });

    switch (acao) {
      case "montar":
        await montarNova();
        break;
      case "jogos":
        await gerenciarJogosDeRodadaExistente();
        break;
      case "listar":
        await listar();
        break;
      case "detalhar":
        await detalhar();
        break;
      case "estado":
        await mudarEstado();
        break;
      case "exportar":
        await exportar();
        break;
      case "voltar":
        voltar = true;
        break;
    }
  }
}

async function montarNova(): Promise<void> {
  const fase = await select<FaseRodada>({ message: "Fase da rodada", choices: fasesChoices() });
  const dados = criarRodadaInputSchema.parse({ fase });
  // A ordem da rodada é derivada pelo SERVIÇO — o adaptador só passa a fase.
  const rodada = await rodadas.criarRodada(dados.fase);
  console.log(
    `\n✅ Rodada criada: ${FASE_LABEL[rodada.fase]} (rodada ${rodada.ordem}). Adicione os jogos — pode parar e voltar depois.\n`,
  );
  await gerenciarJogos(rodada.id);
}

async function gerenciarJogosDeRodadaExistente(): Promise<void> {
  const id = await escolherRodada("Adicionar/editar jogos de qual rodada?");
  if (!id) {
    return;
  }
  await gerenciarJogos(id);
}

/**
 * Laço da montagem INCREMENTAL: mostra os jogos já adicionados (J1, J2…) e deixa
 * Adicionar/Editar/Remover/Voltar. É o "parar e continuar depois" — entra-se aqui ao
 * criar uma rodada nova e ao escolher uma já existente. Nenhuma ação é bloqueada pelo
 * estado da rodada (§3.7) — o serviço cuida da sanidade.
 */
async function gerenciarJogos(rodadaId: string): Promise<void> {
  let voltar = false;
  while (!voltar) {
    const r = await rodadas.detalharRodada(rodadaId);
    console.log(
      `\n${FASE_LABEL[r.fase]} (rodada ${r.ordem}) — ${ESTADO_LABEL[r.estado]} — ${r.jogos.length} jogo(s):`,
    );
    if (r.jogos.length === 0) {
      console.log("  (nenhum jogo ainda)");
    }
    for (const j of r.jogos) {
      console.log(
        `  ${j.ordem}. ${j.selecaoEsquerda.bandeira} ${j.selecaoEsquerda.nome} x ${j.selecaoDireita.nome} ${j.selecaoDireita.bandeira}`,
      );
    }
    console.log("");

    const acao = await select({
      message: "Jogos da rodada",
      choices: [
        { name: "Adicionar jogo", value: "adicionar" },
        { name: "Editar jogo", value: "editar" },
        { name: "Remover jogo", value: "remover" },
        { name: "Voltar", value: "voltar" },
      ],
    });

    switch (acao) {
      case "adicionar":
        await adicionarJogoFluxo(rodadaId);
        break;
      case "editar":
        await editarJogoFluxo(r.jogos);
        break;
      case "remover":
        await removerJogoFluxo(r.jogos);
        break;
      case "voltar":
        voltar = true;
        break;
    }
  }
}

async function adicionarJogoFluxo(rodadaId: string): Promise<void> {
  const par = await escolherParDeSelecoes();
  if (!par) {
    return;
  }
  const dados = jogoInputSchema.parse(par);
  const r = await rodadas.adicionarJogo(rodadaId, dados.selecaoEsquerdaId, dados.selecaoDireitaId);
  console.log(`\n✅ Jogo ${r.jogos.at(-1)?.ordem} adicionado (${r.jogos.length} no total).\n`);
}

async function editarJogoFluxo(jogos: ReadonlyArray<JogoDetalhado>): Promise<void> {
  if (jogos.length === 0) {
    console.log("\n(nenhum jogo para editar)\n");
    return;
  }
  const jogoId = await select({ message: "Editar qual jogo?", choices: jogos.map(opcaoJogo) });
  const par = await escolherParDeSelecoes();
  if (!par) {
    return;
  }
  const dados = jogoInputSchema.parse(par);
  await rodadas.editarJogo(jogoId, dados.selecaoEsquerdaId, dados.selecaoDireitaId);
  console.log("\n✅ Jogo atualizado.\n");
}

async function removerJogoFluxo(jogos: ReadonlyArray<JogoDetalhado>): Promise<void> {
  if (jogos.length === 0) {
    console.log("\n(nenhum jogo para remover)\n");
    return;
  }
  const jogoId = await select({ message: "Remover qual jogo?", choices: jogos.map(opcaoJogo) });
  const jogo = jogos.find((j) => j.id === jogoId);
  const ok = await confirm({
    message: `Remover o jogo ${jogo?.ordem} (${jogo?.selecaoEsquerda.nome} x ${jogo?.selecaoDireita.nome})?`,
    default: false,
  });
  if (!ok) {
    console.log("\nRemoção cancelada.\n");
    return;
  }
  // O serviço RECUSA se o jogo já tiver palpites (JogoComPalpites, traduzido no menuPrincipal).
  await rodadas.removerJogo(jogoId);
  console.log("\n🗑️  Jogo removido.\n");
}

/** Escolhe o par de seleções (esquerda, depois direita ≠ esquerda). null se sem catálogo. */
async function escolherParDeSelecoes(): Promise<rodadas.JogoParaMontar | null> {
  const catalogo = await selecoes.listarSelecoes();
  if (catalogo.length < 2) {
    console.log("\n(catálogo insuficiente — rode `npm run db:seed` para popular as seleções)\n");
    return null;
  }
  // Posições são só para o placar (2×1 ≠ 1×2) — não é mando de campo (decisão #15).
  const selecaoEsquerdaId = await select({
    message: "Time da esquerda",
    choices: catalogo.map(opcaoSelecao),
  });
  const selecaoDireitaId = await select({
    message: "Time da direita",
    choices: catalogo.filter((s) => s.id !== selecaoEsquerdaId).map(opcaoSelecao),
  });
  return { selecaoEsquerdaId, selecaoDireitaId };
}

async function listar(): Promise<void> {
  const lista = await rodadas.listarRodadas();
  if (lista.length === 0) {
    console.log("\n(nenhuma rodada montada)\n");
    return;
  }
  console.log(`\n${lista.length} rodada(s):`);
  for (const r of lista) {
    console.log(
      `  ${r.ordem}. ${FASE_LABEL[r.fase]} — ${r._count.jogos} jogo(s) — ${ESTADO_LABEL[r.estado]}`,
    );
  }
  console.log("");
}

async function detalhar(): Promise<void> {
  const id = await escolherRodada("Detalhar qual rodada?");
  if (!id) {
    return;
  }
  const r = await rodadas.detalharRodada(id);
  console.log(`\n${FASE_LABEL[r.fase]} (rodada ${r.ordem}) — ${ESTADO_LABEL[r.estado]}`);
  for (const j of r.jogos) {
    console.log(
      `  ${j.ordem}. ${j.selecaoEsquerda.bandeira} ${j.selecaoEsquerda.nome} x ${j.selecaoDireita.nome} ${j.selecaoDireita.bandeira}`,
    );
  }
  console.log("");
}

async function mudarEstado(): Promise<void> {
  const id = await escolherRodada("Mudar o estado de qual rodada?");
  if (!id) {
    return;
  }
  const escolhido = await select({
    message: "Novo estado (só um guia — não bloqueia correções)",
    choices: estadosChoices(),
  });
  const estado = estadoRodadaSchema.parse(escolhido);
  const atualizada = await rodadas.definirEstado(id, estado);
  console.log(
    `\n✅ Estado: ${ESTADO_LABEL[atualizada.estado]}. (É só um guia; correções continuam livres em qualquer estado.)\n`,
  );
}

async function exportar(): Promise<void> {
  const id = await escolherRodada("Exportar a mensagem de qual rodada?");
  if (!id) {
    return;
  }
  const r = await rodadas.detalharRodada(id);
  // Formatador puro da Fase 2 (§12.1): recebe os jogos prontos e devolve string; o
  // CLI só imprime o text/plain. 16-avos (16 jogos) exercita o fallback de keycap.
  const texto = formatarMensagemRodada(
    r.jogos.map((j) => ({
      ordem: j.ordem,
      esquerda: { nome: j.selecaoEsquerda.nome, bandeira: j.selecaoEsquerda.bandeira },
      direita: { nome: j.selecaoDireita.nome, bandeira: j.selecaoDireita.bandeira },
    })),
    FASE_LABEL[r.fase].toUpperCase(),
  );
  console.log(`\n${texto}\n`);
}

// — apresentação / helpers (só do CLI) ————————————————————————————————————————

function opcaoSelecao(s: { id: string; nome: string; bandeira: string }) {
  return { name: `${s.bandeira} ${s.nome}`, value: s.id };
}

function opcaoJogo(j: JogoDetalhado) {
  return { name: `${j.ordem}. ${j.selecaoEsquerda.nome} x ${j.selecaoDireita.nome}`, value: j.id };
}

function fasesChoices() {
  return (Object.keys(FASE_LABEL) as FaseRodada[]).map((f) => ({ name: FASE_LABEL[f], value: f }));
}

function estadosChoices() {
  return (Object.keys(ESTADO_LABEL) as EstadoRodada[]).map((e) => ({
    name: ESTADO_LABEL[e],
    value: e,
  }));
}

async function escolherRodada(message: string): Promise<string | null> {
  const lista = await rodadas.listarRodadas();
  if (lista.length === 0) {
    console.log("\n(nenhuma rodada montada)\n");
    return null;
  }
  return select({
    message,
    choices: lista.map((r) => ({
      name: `${r.ordem}. ${FASE_LABEL[r.fase]} (${ESTADO_LABEL[r.estado]})`,
      value: r.id,
    })),
  });
}
