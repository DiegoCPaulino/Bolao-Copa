import { reais } from "../../domain/whatsapp/formato.js";
import * as painel from "../../services/painelService.js";
import { ESTADO_LABEL, FASE_LABEL } from "../rotulos.js";

/**
 * Resumo geral no terminal — ADAPTADOR (CLAUDE.md §5): só lê o resumo (composto pelo
 * serviço) e IMPRIME num relance. Nenhum cálculo aqui. É o "painel" da Entrega 1.
 */
export async function menuPainel(): Promise<void> {
  const { pagamentos, rodadaAtual } = await painel.gerarResumo();

  console.log("\n📊 Resumo geral do bolão\n");

  console.log("Pagamentos:");
  console.log(`  Pagos: ${pagamentos.pagos}/${pagamentos.total}`);
  console.log(
    `  Esperado: ${reais(pagamentos.esperado)} | Recebido: ${reais(pagamentos.recebido)} | Falta: ${reais(pagamentos.falta)}`,
  );
  // Divisão do pote (tela privada → mostra os dois lados). Formato: atual / potencial.
  console.log(
    `  🏆 Premiação (75%): ${reais(pagamentos.premiacaoAtual)} / ${reais(pagamentos.premiacaoPotencial)} (potencial)`,
  );
  console.log(
    `  💼 Organizador (25%): ${reais(pagamentos.ganhoAtual)} / ${reais(pagamentos.ganhoPotencial)} (potencial)`,
  );

  console.log("\nRodada atual:");
  if (!rodadaAtual) {
    console.log("  (nenhuma rodada montada)");
  } else {
    console.log(
      `  ${FASE_LABEL[rodadaAtual.fase]} (rodada ${rodadaAtual.ordem}) — ${ESTADO_LABEL[rodadaAtual.estado]}`,
    );
    console.log(
      `  Jogos: ${rodadaAtual.jogos} | Palpitaram: ${rodadaAtual.palpitaram}/${rodadaAtual.totalParticipantes}`,
    );
  }
  console.log("");
}
