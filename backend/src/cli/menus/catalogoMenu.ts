import * as selecoes from "../../services/selecaoService.js";

/**
 * Catálogo de seleções no terminal — ADAPTADOR (CLAUDE.md §5): só lê e IMPRIME.
 * Não há submenu de CRUD: por decisão (opção A), adicionar/editar seleção é editar
 * `prisma/seed.ts` e rodar `db:seed` (idempotente por nome) — e a UI deixa isso claro.
 */
export async function menuCatalogo(): Promise<void> {
  const lista = await selecoes.listarSelecoes();
  if (lista.length === 0) {
    console.log("\n(catálogo vazio — rode `npm run db:seed` para populá-lo)\n");
    return;
  }
  console.log(`\n${lista.length} seleções no catálogo:`);
  for (const s of lista) {
    console.log(`  ${s.bandeira} ${s.nome}`);
  }
  console.log("\nPara adicionar/editar seleções: edite prisma/seed.ts e rode `npm run db:seed`.\n");
}
