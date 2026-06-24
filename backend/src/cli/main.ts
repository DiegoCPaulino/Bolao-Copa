import { select } from "@inquirer/prompts";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { ErroDeDominio } from "../domain/erros.js";
import { menuCatalogo } from "./menus/catalogoMenu.js";
import { menuPagamentos } from "./menus/pagamentosMenu.js";
import { menuPainel } from "./menus/painelMenu.js";
import { menuPalpites } from "./menus/palpitesMenu.js";
import { menuParticipantes } from "./menus/participantesMenu.js";
import { menuResultados } from "./menus/resultadosMenu.js";
import { menuRodadas } from "./menus/rodadasMenu.js";

/**
 * Adaptador de TERMINAL (Entrega 1) — o ponto de entrada do sistema (CLAUDE.md §5).
 * Estilo ratificado: MENU INTERATIVO (confortável para operar rápido durante os
 * jogos). Esta casca conhece o terminal; o núcleo (serviços/domínio) não.
 *
 * Menu principal EXTENSÍVEL de propósito: as próximas fatias da Fase 4 (Pagamentos,
 * Rodadas, Palpites…) só ACRESCENTAM uma entrada em `choices` e um `case`, sem mexer
 * em nada do núcleo.
 *
 * Tratamento de erro centralizado (CLAUDE.md §8.6): erros de domínio viram mensagem
 * clara e o loop continua; qualquer outro erro (bug) sobe e encerra com código ≠ 0.
 */

const MSG_BANCO_FORA =
  "⚠️  Não consegui falar com o banco de dados.\n" +
  "   Ele está no ar? Rode `docker compose up -d` na raiz do projeto e tente de novo.";

/** Reconhece falhas de conexão com o Postgres (banco fora do ar) para dar uma
 * mensagem amigável em vez de despejar o erro cru do Prisma no organizador. */
function ehBancoIndisponivel(erro: unknown): boolean {
  return (
    erro instanceof Prisma.PrismaClientInitializationError ||
    (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P1001")
  );
}

async function menuPrincipal(): Promise<void> {
  let sair = false;
  while (!sair) {
    const opcao = await select({
      message: "Bolão Copa 2026 — menu principal",
      choices: [
        { name: "Resumo geral", value: "painel" },
        { name: "Participantes", value: "participantes" },
        { name: "Pagamentos", value: "pagamentos" },
        { name: "Catálogo de seleções", value: "catalogo" },
        { name: "Rodadas e jogos", value: "rodadas" },
        { name: "Palpites", value: "palpites" },
        { name: "Resultados e pontuação", value: "resultados" },
        { name: "Sair", value: "sair" },
      ],
    });

    try {
      switch (opcao) {
        case "painel":
          await menuPainel();
          break;
        case "participantes":
          await menuParticipantes();
          break;
        case "pagamentos":
          await menuPagamentos();
          break;
        case "catalogo":
          await menuCatalogo();
          break;
        case "rodadas":
          await menuRodadas();
          break;
        case "palpites":
          await menuPalpites();
          break;
        case "resultados":
          await menuResultados();
          break;
        case "sair":
          sair = true;
          break;
      }
    } catch (erro) {
      if (erro instanceof ErroDeDominio) {
        // Erro esperado (regra de negócio): mostra a mensagem e segue operando.
        console.error(`\n⚠️  ${erro.message}\n`);
      } else {
        throw erro;
      }
    }
  }
}

async function iniciar(): Promise<void> {
  // Conecta cedo: se o banco estiver fora, falha AQUI com mensagem amigável, antes
  // de o organizador navegar e tomar um erro no meio de uma ação.
  await prisma.$connect();
  await menuPrincipal();
}

iniciar()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Até a próxima! 👋");
  })
  .catch(async (erro: unknown) => {
    await prisma.$disconnect();
    // Ctrl+C dentro de um prompt: o inquirer lança ExitPromptError — saída limpa.
    if (erro instanceof Error && erro.name === "ExitPromptError") {
      process.exit(0);
    }
    if (ehBancoIndisponivel(erro)) {
      console.error(`\n${MSG_BANCO_FORA}\n`);
      process.exit(1);
    }
    console.error("Erro inesperado:", erro);
    process.exit(1);
  });
