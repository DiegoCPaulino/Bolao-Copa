import { select } from "@inquirer/prompts";
import { dividirPote } from "../../domain/premiacao.js";
import { reais } from "../../domain/whatsapp/formato.js";
import { formatarPagamentos } from "../../domain/whatsapp/pagamentos.js";
import { alternarStatusInputSchema } from "../../schemas/pagamentoSchemas.js";
import type { PagamentoParticipante } from "../../services/pagamentoService.js";
import * as pagamentos from "../../services/pagamentoService.js";

/**
 * Submenu de Pagamentos — ADAPTADOR (CLAUDE.md §5): pergunta, chama o serviço e
 * IMPRIME. Nenhum cálculo aqui: valor a pagar e totais vêm DERIVADOS do serviço, e o
 * texto do WhatsApp vem do formatador puro (§12.7) — o CLI só decide o destino
 * (imprimir no terminal). Erros tipados são traduzidos no `menuPrincipal`.
 */
export async function menuPagamentos(): Promise<void> {
  let voltar = false;
  while (!voltar) {
    const acao = await select({
      message: "Pagamentos",
      choices: [
        { name: "Listar pagamentos", value: "listar" },
        { name: "Alternar status (Pago/Pendente)", value: "alternar" },
        { name: "Exportar para o WhatsApp", value: "exportar" },
        { name: "Voltar", value: "voltar" },
      ],
    });

    switch (acao) {
      case "listar":
        await listar();
        break;
      case "alternar":
        await alternar();
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

async function listar(): Promise<void> {
  const { participantes, totais } = await pagamentos.listarPagamentos();
  if (participantes.length === 0) {
    console.log("\n(nenhum participante cadastrado ainda)\n");
    return;
  }
  console.log(`\n${participantes.length} participante(s):`);
  for (const p of participantes) {
    console.log(`  • ${rotulo(p)} — ${reais(p.valorAPagar)} [${descricaoStatus(p.status)}]`);
  }
  console.log(
    `\nEsperado: ${reais(totais.esperado)} | Recebido: ${reais(totais.recebido)} | Falta: ${reais(totais.falta)}\n`,
  );
}

async function alternar(): Promise<void> {
  const { participantes } = await pagamentos.listarPagamentos();
  if (participantes.length === 0) {
    console.log("\n(nenhum participante cadastrado ainda)\n");
    return;
  }
  const escolhido = await select({
    message: "Alternar status de quem?",
    choices: participantes.map((p) => ({
      name: `${rotulo(p)} [${descricaoStatus(p.status)}]`,
      value: p.id,
    })),
  });

  const { participanteId } = alternarStatusInputSchema.parse({ participanteId: escolhido });
  const atualizado = await pagamentos.alternarStatus(participanteId);
  console.log(`\n✅ ${atualizado.nome} agora está ${descricaoStatus(atualizado.status)}.\n`);
}

async function exportar(): Promise<void> {
  const { participantes, totais } = await pagamentos.listarPagamentos();
  // Só os 75% (premiação) vão para o grupo, no formato atual / potencial. `dividirPote`
  // é a MESMA regra de domínio do Resumo geral (não reimplementamos cálculo aqui); o
  // formatador (§12.7) recebe os valores JÁ prontos e devolve string — o CLI só imprime.
  const premiacao = {
    premiacaoAtual: dividirPote(totais.recebido).premiacao,
    premiacaoPotencial: dividirPote(totais.esperado).premiacao,
  };
  const texto = formatarPagamentos(
    participantes.map((p) => ({
      nome: p.nome,
      apelido: p.apelido ?? undefined,
      valorAPagar: p.valorAPagar,
      status: p.status,
    })),
    premiacao,
  );
  console.log(`\n${texto}\n`);
}

// — apresentação (só do CLI) ——————————————————————————————————————————————————

function rotulo(p: Pick<PagamentoParticipante, "nome" | "apelido">): string {
  return p.apelido ? `${p.nome} "${p.apelido}"` : p.nome;
}

function descricaoStatus(status: PagamentoParticipante["status"]): string {
  return status === "PAGO" ? "pago" : "pendente";
}
