import { number, select } from "@inquirer/prompts";
import type { EstadoRodada, FaseRodada } from "@prisma/client";
import { formatarMensagemRodada } from "../../domain/whatsapp/mensagemRodada.js";
import { estadoRodadaSchema, montarRodadaInputSchema } from "../../schemas/rodadaSchemas.js";
import * as rodadas from "../../services/rodadaService.js";
import * as selecoes from "../../services/selecaoService.js";
import { ESTADO_LABEL, FASE_LABEL } from "../rotulos.js";

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
        { name: "Montar rodada", value: "montar" },
        { name: "Listar rodadas", value: "listar" },
        { name: "Detalhar rodada", value: "detalhar" },
        { name: "Definir estado (apenas um guia)", value: "estado" },
        { name: "Exportar mensagem da rodada", value: "exportar" },
        { name: "Voltar", value: "voltar" },
      ],
    });

    switch (acao) {
      case "montar":
        await montar();
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

async function montar(): Promise<void> {
  const catalogo = await selecoes.listarSelecoes();
  if (catalogo.length < 2) {
    console.log("\n(catálogo insuficiente — rode `npm run db:seed` para popular as seleções)\n");
    return;
  }

  const fase = await select<FaseRodada>({ message: "Fase da rodada", choices: fasesChoices() });
  const quantos = await number({
    message: "Quantos jogos nesta rodada?",
    default: jogosSugeridos(fase), // sugestão por fase; a rodada final usa 2 sem código especial
    min: 1,
    required: true,
  });
  const total = quantos ?? 1;

  const jogos: rodadas.JogoParaMontar[] = [];
  for (let i = 1; i <= total; i++) {
    // Posições são só para o placar (2×1 ≠ 1×2) — não é mando de campo (decisão #15).
    const selecaoEsquerdaId = await select({
      message: `Jogo ${i} — time da esquerda`,
      choices: catalogo.map(opcaoSelecao),
    });
    const selecaoDireitaId = await select({
      message: `Jogo ${i} — time da direita`,
      choices: catalogo.filter((s) => s.id !== selecaoEsquerdaId).map(opcaoSelecao),
    });
    jogos.push({ selecaoEsquerdaId, selecaoDireitaId });
  }

  // A ordem da rodada é a próxima na sequência (1..5); o serviço numera os jogos 1..N.
  const ordem = (await rodadas.listarRodadas()).length + 1;
  const dados = montarRodadaInputSchema.parse({ fase, jogos });
  const criada = await rodadas.montarRodada(dados.fase, ordem, dados.jogos);
  console.log(
    `\n✅ Rodada montada: ${FASE_LABEL[criada.fase]} — ${criada.jogos.length} jogo(s).\n`,
  );
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

function fasesChoices() {
  return (Object.keys(FASE_LABEL) as FaseRodada[]).map((f) => ({ name: FASE_LABEL[f], value: f }));
}

function estadosChoices() {
  return (Object.keys(ESTADO_LABEL) as EstadoRodada[]).map((e) => ({
    name: ESTADO_LABEL[e],
    value: e,
  }));
}

function jogosSugeridos(fase: FaseRodada): number {
  switch (fase) {
    case "DEZESSEIS_AVOS":
      return 16;
    case "OITAVAS":
      return 8;
    case "QUARTAS":
      return 4;
    case "SEMIFINAIS":
      return 2;
    case "FINAL":
      return 2; // 3º lugar + final
  }
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
