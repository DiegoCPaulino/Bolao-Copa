import { confirm, input, select } from "@inquirer/prompts";
import { participanteInputSchema } from "../../schemas/participanteSchemas.js";
import type { Participante, ParticipanteComIndicador } from "../../services/participanteService.js";
import * as participantes from "../../services/participanteService.js";

/**
 * Submenu de Participantes — parte do ADAPTADOR (CLAUDE.md §5): pergunta, chama o
 * serviço e IMPRIME. Nenhuma regra de negócio mora aqui; o serviço é que valida e
 * orquestra. É também o único lugar onde mexemos no terminal (prompts/console).
 *
 * Padrão a ser repetido pelas próximas 6 fatias da Fase 4: cada ação coleta entrada
 * crua → valida com Zod → chama o serviço → imprime resultado. Erros de domínio são
 * traduzidos no `menuPrincipal` (try/catch único), para não repetir tratamento aqui.
 */
export async function menuParticipantes(): Promise<void> {
  let voltar = false;
  while (!voltar) {
    const acao = await select({
      message: "Participantes",
      choices: [
        { name: "Listar", value: "listar" },
        { name: "Cadastrar", value: "cadastrar" },
        { name: "Editar", value: "editar" },
        { name: "Remover", value: "remover" },
        { name: "Voltar", value: "voltar" },
      ],
    });

    switch (acao) {
      case "listar":
        await listar();
        break;
      case "cadastrar":
        await cadastrar();
        break;
      case "editar":
        await editar();
        break;
      case "remover":
        await remover();
        break;
      case "voltar":
        voltar = true;
        break;
    }
  }
}

// — ações ——————————————————————————————————————————————————————————————————————

async function listar(): Promise<void> {
  const ordenarPor = await select({
    message: "Ordenar por",
    default: "nome" as const,
    choices: [
      { name: "Nome (A→Z)", value: "nome" as const },
      { name: "Cadastro (mais recentes)", value: "criadoEm" as const },
    ],
  });
  const filtroStatus = await select({
    message: "Filtrar por status",
    default: "todos" as const,
    choices: [
      { name: "Todos", value: "todos" as const },
      { name: "Pagos", value: "PAGO" as const },
      { name: "Pendentes", value: "PENDENTE" as const },
    ],
  });
  const busca = (await input({ message: "Buscar por nome/apelido (Enter p/ todos)" })).trim();

  const lista = await participantes.listarParticipantes({
    busca: busca === "" ? undefined : busca,
    status: filtroStatus === "todos" ? undefined : filtroStatus,
    ordenarPor,
  });

  if (lista.length === 0) {
    console.log("\n(nenhum participante encontrado)\n");
    return;
  }
  console.log(`\n${lista.length} participante(s):`);
  for (const p of lista) {
    console.log(`  • ${linhaParticipante(p)}`);
  }
  console.log("");
}

async function cadastrar(): Promise<void> {
  const nome = await input({
    message: "Nome",
    validate: (v) => v.trim() !== "" || "O nome é obrigatório.",
  });
  const apelido = await input({ message: "Apelido (opcional, Enter p/ pular)" });
  const indicadorId = await selecionarIndicador("Indicado por", null, null);
  const isento = await confirm({ message: "Isento de pagamento?", default: false });

  // Zod (casca) transforma a entrada crua no dado tipado do serviço.
  const dados = participanteInputSchema.parse({ nome, apelido, indicadorId, isento });
  const criado = await participantes.criarParticipante(dados);
  console.log(`\n✅ Cadastrado: ${rotulo(criado)}\n`);
}

async function editar(): Promise<void> {
  const alvo = await escolherParticipante("Editar qual participante?");
  if (!alvo) {
    return;
  }
  const nome = await input({
    message: "Nome",
    default: alvo.nome,
    validate: (v) => v.trim() !== "" || "O nome é obrigatório.",
  });
  const apelido = await input({ message: "Apelido (opcional)", default: alvo.apelido ?? "" });
  // Exclui o próprio da lista de indicadores (ninguém indica a si mesmo).
  const indicadorId = await selecionarIndicador("Indicado por", alvo.id, alvo.indicadorId);
  const isento = await confirm({ message: "Isento de pagamento?", default: alvo.isento });

  const dados = participanteInputSchema.parse({ nome, apelido, indicadorId, isento });
  const atualizado = await participantes.atualizarParticipante(alvo.id, dados);
  console.log(`\n✅ Atualizado: ${rotulo(atualizado)}\n`);
}

async function remover(): Promise<void> {
  const alvo = await escolherParticipante("Remover qual participante?");
  if (!alvo) {
    return;
  }
  // Aviso honesto sobre o efeito colateral do ON DELETE SET NULL (migration init):
  // os indicados não somem, só perdem o vínculo de indicação.
  const indicados = await participantes.contarIndicadosDiretos(alvo.id);
  const aviso =
    indicados > 0
      ? ` Atenção: ele indicou ${indicados} participante(s) — eles NÃO serão apagados, apenas deixarão de constar como indicados por ele.`
      : "";

  const ok = await confirm({
    message: `Remover ${rotulo(alvo)}?${aviso}`,
    default: false,
  });
  if (!ok) {
    console.log("\nRemoção cancelada.\n");
    return;
  }
  await participantes.removerParticipante(alvo.id);
  console.log(`\n🗑️  Removido: ${rotulo(alvo)}\n`);
}

// — helpers de apresentação (só do CLI) ————————————————————————————————————————

/** Rótulo curto para seleção/confirmação: nome + apelido entre aspas, se houver. */
function rotulo(p: Pick<Participante, "nome" | "apelido">): string {
  return p.apelido ? `${p.nome} "${p.apelido}"` : p.nome;
}

/** Linha de listagem: rótulo + status + indicador resolvido. */
function linhaParticipante(p: ParticipanteComIndicador): string {
  // Isento aparece na lista de Participantes (ele disputa!), mas com o status de
  // pagamento substituído por "isento" — ele não está nem "pago" nem "pendente".
  const situacao = p.isento ? "isento" : p.status === "PAGO" ? "pago" : "pendente";
  const indicacao = p.indicador ? ` — indicado por ${rotulo(p.indicador)}` : "";
  return `${rotulo(p)} [${situacao}]${indicacao}`;
}

/** Escolhe um participante existente; null (e avisa) se ainda não há nenhum. */
async function escolherParticipante(message: string): Promise<ParticipanteComIndicador | null> {
  const todos = await participantes.listarParticipantes();
  if (todos.length === 0) {
    console.log("\n(nenhum participante cadastrado ainda)\n");
    return null;
  }
  const id = await select({
    message,
    choices: todos.map((p) => ({ name: rotulo(p), value: p.id })),
  });
  return todos.find((p) => p.id === id) ?? null;
}

/**
 * Seleção do "indicado por" LISTANDO os existentes (decisão #10: nunca se digita o
 * nome). `excluirId` tira o próprio da lista (na edição); `atualId` pré-seleciona o
 * indicador vigente. Devolve `null` quando "Nenhum" ou quando não há candidatos.
 */
async function selecionarIndicador(
  message: string,
  excluirId: string | null,
  atualId: string | null,
): Promise<string | null> {
  const candidatos = (await participantes.listarParticipantes()).filter((p) => p.id !== excluirId);
  if (candidatos.length === 0) {
    return null;
  }
  return select<string | null>({
    message,
    default: atualId,
    choices: [
      { name: "Nenhum", value: null },
      ...candidatos.map((p) => ({ name: rotulo(p), value: p.id })),
    ],
  });
}
