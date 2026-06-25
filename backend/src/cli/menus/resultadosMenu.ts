import { number, select } from "@inquirer/prompts";
import { formatarClassificacaoGeral } from "../../domain/whatsapp/classificacaoGeral.js";
import { formatarResumoJogo } from "../../domain/whatsapp/resumoJogo.js";
import { formatarResumoRodada } from "../../domain/whatsapp/resumoRodada.js";
import { registrarResultadoInputSchema } from "../../schemas/resultadoSchemas.js";
import * as resultados from "../../services/resultadoService.js";
import * as rodadas from "../../services/rodadaService.js";
import { FASE_LABEL } from "../rotulos.js";

/**
 * Submenu de Resultados e Pontuação — ADAPTADOR (CLAUDE.md §5): pergunta, chama o
 * serviço e IMPRIME. O CLI não calcula nada: lançar o placar grava só o resultado, e
 * toda a pontuação vem DERIVADA do serviço (sob demanda). Os textos saem dos
 * formatadores puros (§12.3/§12.4/§12.5). Erros são traduzidos no `menuPrincipal`.
 */
export async function menuResultados(): Promise<void> {
  let voltar = false;
  while (!voltar) {
    const acao = await select({
      message: "Resultados e pontuação",
      choices: [
        { name: "Registrar/editar resultado", value: "registrar" },
        { name: "Exportar resumo do jogo", value: "resumoJogo" },
        { name: "Exportar resumo da rodada", value: "resumoRodada" },
        { name: "Exportar classificação geral", value: "classificacao" },
        { name: "Voltar", value: "voltar" },
      ],
    });

    switch (acao) {
      case "registrar":
        await registrar();
        break;
      case "resumoJogo":
        await exportarResumoJogo();
        break;
      case "resumoRodada":
        await exportarResumoRodada();
        break;
      case "classificacao":
        await exportarClassificacao();
        break;
      case "voltar":
        voltar = true;
        break;
    }
  }
}

async function registrar(): Promise<void> {
  const rodada = await escolherRodada("Resultado de qual rodada?");
  if (!rodada) {
    return;
  }
  const jogo = await escolherJogo(rodada.id, "Registrar resultado de qual jogo?");
  if (!jogo) {
    return;
  }
  console.log(
    `\nJogo ${jogo.ordem}: ${jogo.selecaoEsquerda.bandeira} ${jogo.selecaoEsquerda.nome} x ${jogo.selecaoDireita.nome} ${jogo.selecaoDireita.bandeira}`,
  );
  // Pré-preenche o placar atual, se já houver (correção livre §8.6).
  const golsEsquerda = await number({
    message: `Gols ${jogo.selecaoEsquerda.nome}`,
    default: jogo.golsEsquerdaReal ?? 0,
    min: 0,
    required: true,
  });
  const golsDireita = await number({
    message: `Gols ${jogo.selecaoDireita.nome}`,
    default: jogo.golsDireitaReal ?? 0,
    min: 0,
    required: true,
  });

  const dados = registrarResultadoInputSchema.parse({
    jogoId: jogo.id,
    golsEsquerda: golsEsquerda ?? 0,
    golsDireita: golsDireita ?? 0,
  });
  await resultados.registrarResultado(dados.jogoId, dados.golsEsquerda, dados.golsDireita);
  console.log(
    `\n✅ Resultado: ${jogo.selecaoEsquerda.nome} ${dados.golsEsquerda} x ${dados.golsDireita} ${jogo.selecaoDireita.nome}. (Pontuação recalculada sob demanda.)\n`,
  );
}

async function exportarResumoJogo(): Promise<void> {
  const rodada = await escolherRodada("Resumo de jogo de qual rodada?");
  if (!rodada) {
    return;
  }
  const jogo = await escolherJogo(rodada.id, "Resumo de qual jogo?");
  if (!jogo) {
    return;
  }
  const dados = await resultados.dadosResumoJogo(jogo.id);
  // Formatador puro §12.3: recebe os pontos JÁ calculados pelo serviço.
  const texto = formatarResumoJogo(
    { esquerda: dados.esquerda, direita: dados.direita, placar: dados.resultado },
    dados.palpites.map((p) => ({
      nome: p.nome,
      apelido: p.apelido ?? undefined,
      palpite: p.palpite,
      pontos: p.pontos,
    })),
    `Jogo ${dados.ordem}`,
  );
  console.log(`\n${texto}\n`);
}

async function exportarResumoRodada(): Promise<void> {
  const rodada = await escolherRodada("Resumo de qual rodada?");
  if (!rodada) {
    return;
  }
  const linhas = await resultados.pontosDaRodada(rodada.id);
  // Formatador puro §12.4: a lista já vem ordenada pelos pontos da rodada.
  const texto = formatarResumoRodada(
    linhas.map((l) => ({ nome: l.nome, apelido: l.apelido ?? undefined, pontos: l.pontos })),
    FASE_LABEL[rodada.fase].toUpperCase(),
  );
  console.log(`\n${texto}\n`);
}

async function exportarClassificacao(): Promise<void> {
  const linhas = await resultados.classificacaoGeral();
  if (linhas.length === 0) {
    console.log("\n(nenhum participante cadastrado)\n");
    return;
  }
  // Formatador puro §12.5: a lista já vem ordenada pela cascata de desempate.
  const texto = formatarClassificacaoGeral(
    linhas.map((l) => ({ nome: l.nome, apelido: l.apelido ?? undefined, pontos: l.pontos })),
    "classificação atual",
  );
  console.log(`\n${texto}\n`);
}

// — helpers (só do CLI) ————————————————————————————————————————————————————————

async function escolherRodada(message: string): Promise<rodadas.RodadaResumo | null> {
  const lista = await rodadas.listarRodadas();
  if (lista.length === 0) {
    console.log("\n(nenhuma rodada montada)\n");
    return null;
  }
  const id = await select({
    message,
    choices: lista.map((r) => ({ name: `${r.ordem}. ${FASE_LABEL[r.fase]}`, value: r.id })),
  });
  return lista.find((r) => r.id === id) ?? null;
}

async function escolherJogo(
  rodadaId: string,
  message: string,
): Promise<rodadas.RodadaDetalhada["jogos"][number] | null> {
  const rodada = await rodadas.detalharRodada(rodadaId);
  if (rodada.jogos.length === 0) {
    console.log("\n(rodada sem jogos)\n");
    return null;
  }
  const id = await select({
    message,
    choices: rodada.jogos.map((j) => ({
      name: `J${j.ordem} ${j.selecaoEsquerda.bandeira} ${j.selecaoEsquerda.nome} x ${j.selecaoDireita.nome} ${j.selecaoDireita.bandeira}${placarAtual(j)}`,
      value: j.id,
    })),
  });
  return rodada.jogos.find((j) => j.id === id) ?? null;
}

function placarAtual(jogo: {
  golsEsquerdaReal: number | null;
  golsDireitaReal: number | null;
}): string {
  return jogo.golsEsquerdaReal !== null && jogo.golsDireitaReal !== null
    ? ` [${jogo.golsEsquerdaReal}x${jogo.golsDireitaReal}]`
    : " [sem resultado]";
}
