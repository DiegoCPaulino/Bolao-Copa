import { select } from "@inquirer/prompts";
import { prisma } from "../config/prisma.js";
import { ErroDeDominio } from "../domain/erros.js";
import { menuCatalogo } from "./menus/catalogoMenu.js";
import { menuPagamentos } from "./menus/pagamentosMenu.js";
import { menuPalpites } from "./menus/palpitesMenu.js";
import { menuParticipantes } from "./menus/participantesMenu.js";
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
async function menuPrincipal(): Promise<void> {
  let sair = false;
  while (!sair) {
    const opcao = await select({
      message: "Bolão Copa 2026 — menu principal",
      choices: [
        { name: "Participantes", value: "participantes" },
        { name: "Pagamentos", value: "pagamentos" },
        { name: "Catálogo de seleções", value: "catalogo" },
        { name: "Rodadas e jogos", value: "rodadas" },
        { name: "Palpites", value: "palpites" },
        { name: "Sair", value: "sair" },
      ],
    });

    try {
      switch (opcao) {
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

menuPrincipal()
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
    console.error("Erro inesperado:", erro);
    process.exit(1);
  });
