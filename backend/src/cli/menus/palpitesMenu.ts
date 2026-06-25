import { number, select } from "@inquirer/prompts";
import { formatarPendencias } from "../../domain/whatsapp/pendencias.js";
import { formatarTabelaPalpites } from "../../domain/whatsapp/tabelaPalpites.js";
import { registrarPalpitesInputSchema } from "../../schemas/palpiteSchemas.js";
import * as palpites from "../../services/palpiteService.js";
import * as participantesSvc from "../../services/participanteService.js";
import * as rodadas from "../../services/rodadaService.js";
import { FASE_LABEL } from "../rotulos.js";

/**
 * Submenu de Palpites — ADAPTADOR (CLAUDE.md §5): pergunta, chama o serviço e IMPRIME.
 * Nenhum cálculo aqui; quem deriva pendências e monta a tabela é o serviço, e o texto
 * do WhatsApp vem dos formatadores puros (§12.2/§12.8). Erros são traduzidos no
 * `menuPrincipal`.
 */
export async function menuPalpites(): Promise<void> {
  let voltar = false;
  while (!voltar) {
    const acao = await select({
      message: "Palpites",
      choices: [
        { name: "Registrar palpites", value: "registrar" },
        { name: "Ver quem falta palpitar", value: "pendentes" },
        { name: "Exportar tabela de palpites", value: "tabela" },
        { name: "Exportar pendências", value: "pendencias" },
        { name: "Voltar", value: "voltar" },
      ],
    });

    switch (acao) {
      case "registrar":
        await registrar();
        break;
      case "pendentes":
        await verPendentes();
        break;
      case "tabela":
        await exportarTabela();
        break;
      case "pendencias":
        await exportarPendencias();
        break;
      case "voltar":
        voltar = true;
        break;
    }
  }
}

async function registrar(): Promise<void> {
  const rodada = await escolherRodada("Registrar palpites de qual rodada?");
  if (!rodada) {
    return;
  }
  const detalhe = await rodadas.detalharRodada(rodada.id);
  if (detalhe.jogos.length === 0) {
    console.log("\n(rodada sem jogos)\n");
    return;
  }
  const participante = await escolherParticipante();
  if (!participante) {
    return;
  }

  // Pré-preenche com o palpite atual (upsert/correção §8.6): editar é só relançar.
  const atuais = await palpites.palpitesDoParticipante(rodada.id, participante.id);
  const atualPorJogo = new Map(atuais.map((p) => [p.jogoId, p]));

  const entradas: palpites.PalpiteEntrada[] = [];
  for (const jogo of detalhe.jogos) {
    const atual = atualPorJogo.get(jogo.id);
    console.log(
      `\nJogo ${jogo.ordem}: ${jogo.selecaoEsquerda.bandeira} ${jogo.selecaoEsquerda.nome} x ${jogo.selecaoDireita.nome} ${jogo.selecaoDireita.bandeira}`,
    );
    const golsEsquerda = await number({
      message: `Gols ${jogo.selecaoEsquerda.nome}`,
      default: atual?.golsEsquerda ?? 0,
      min: 0,
      required: true,
    });
    const golsDireita = await number({
      message: `Gols ${jogo.selecaoDireita.nome}`,
      default: atual?.golsDireita ?? 0,
      min: 0,
      required: true,
    });
    entradas.push({
      jogoId: jogo.id,
      golsEsquerda: golsEsquerda ?? 0,
      golsDireita: golsDireita ?? 0,
    });
  }

  const dados = registrarPalpitesInputSchema.parse({
    rodadaId: rodada.id,
    participanteId: participante.id,
    palpites: entradas,
  });
  const salvos = await palpites.registrarPalpites(
    dados.rodadaId,
    dados.participanteId,
    dados.palpites,
  );
  console.log(`\n✅ ${salvos.length} palpite(s) registrados para ${rotulo(participante)}.\n`);
}

async function verPendentes(): Promise<void> {
  const rodada = await escolherRodada("Ver pendências de qual rodada?");
  if (!rodada) {
    return;
  }
  const pendentes = await palpites.participantesPendentes(rodada.id);
  if (pendentes.length === 0) {
    console.log("\n✅ Todos já palpitaram nesta rodada.\n");
    return;
  }
  console.log(`\nFaltam palpitar (${pendentes.length}):`);
  for (const p of pendentes) {
    console.log(`  • ${rotulo(p)}`);
  }
  console.log("");
}

async function exportarTabela(): Promise<void> {
  const rodada = await escolherRodada("Exportar a tabela de qual rodada?");
  if (!rodada) {
    return;
  }
  const linhas = await palpites.dadosTabelaPalpites(rodada.id);
  if (linhas.length === 0) {
    console.log("\n(ninguém palpitou ainda nesta rodada)\n");
    return;
  }
  // Formatador puro §12.2: recebe os palpites prontos e devolve string; o CLI imprime.
  const texto = formatarTabelaPalpites(
    linhas.map((l) => ({
      nome: l.nome,
      apelido: l.apelido ?? undefined,
      palpites: l.palpites.map((p) => ({
        jogo: p.jogoOrdem,
        placar: { golsEsquerda: p.golsEsquerda, golsDireita: p.golsDireita },
      })),
    })),
    FASE_LABEL[rodada.fase].toUpperCase(),
  );
  console.log(`\n${texto}\n`);
}

async function exportarPendencias(): Promise<void> {
  const rodada = await escolherRodada("Exportar as pendências de qual rodada?");
  if (!rodada) {
    return;
  }
  const pendentes = await palpites.participantesPendentes(rodada.id);
  if (pendentes.length === 0) {
    console.log("\n✅ Ninguém pendente — todos já palpitaram.\n");
    return;
  }
  // Formatador puro §12.8 (recebe a lista já derivada por participantesSemPalpite).
  const texto = formatarPendencias(
    pendentes.map((p) => ({ nome: p.nome, apelido: p.apelido ?? undefined })),
    FASE_LABEL[rodada.fase].toUpperCase(),
  );
  console.log(`\n${texto}\n`);
}

// — helpers (só do CLI) ————————————————————————————————————————————————————————

function rotulo(p: { nome: string; apelido: string | null }): string {
  return p.apelido ? `${p.nome} "${p.apelido}"` : p.nome;
}

async function escolherRodada(message: string): Promise<rodadas.RodadaResumo | null> {
  const lista = await rodadas.listarRodadas();
  if (lista.length === 0) {
    console.log("\n(nenhuma rodada montada)\n");
    return null;
  }
  const id = await select({
    message,
    choices: lista.map((r) => ({
      name: `${r.ordem}. ${FASE_LABEL[r.fase]} (${r._count.jogos} jogos)`,
      value: r.id,
    })),
  });
  return lista.find((r) => r.id === id) ?? null;
}

async function escolherParticipante(): Promise<participantesSvc.ParticipanteComIndicador | null> {
  const todos = await participantesSvc.listarParticipantes();
  if (todos.length === 0) {
    console.log("\n(nenhum participante cadastrado)\n");
    return null;
  }
  const id = await select({
    message: "Palpites de qual participante?",
    choices: todos.map((p) => ({ name: rotulo(p), value: p.id })),
  });
  return todos.find((p) => p.id === id) ?? null;
}
