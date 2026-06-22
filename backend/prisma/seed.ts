import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Catálogo de seleções da Copa 2026 (nome + bandeira emoji) — dado de
 * referência, populado por seed (arquitetura §6).
 *
 * ⚠️ LISTA PARCIAL (subconjunto inicial de alta confiança: anfitriões + seleções
 * tradicionais). COMPLETAR até as 48 com a lista oficial. Como o seed é
 * IDEMPOTENTE (upsert por `nome`), rodar de novo com a lista cheia apenas
 * ACRESCENTA as faltantes — nunca duplica. As "home nations" (Inglaterra,
 * Escócia, País de Gales) usam emojis de bandeira de subdivisão (🏴…); adicionar
 * aqui ao completar.
 */
const SELECOES: ReadonlyArray<{ nome: string; bandeira: string }> = [
  // Anfitriões (CONCACAF)
  { nome: "Estados Unidos", bandeira: "🇺🇸" },
  { nome: "México", bandeira: "🇲🇽" },
  { nome: "Canadá", bandeira: "🇨🇦" },
  // CONMEBOL
  { nome: "Brasil", bandeira: "🇧🇷" },
  { nome: "Argentina", bandeira: "🇦🇷" },
  { nome: "Uruguai", bandeira: "🇺🇾" },
  { nome: "Colômbia", bandeira: "🇨🇴" },
  { nome: "Equador", bandeira: "🇪🇨" },
  // UEFA
  { nome: "França", bandeira: "🇫🇷" },
  { nome: "Espanha", bandeira: "🇪🇸" },
  { nome: "Portugal", bandeira: "🇵🇹" },
  { nome: "Alemanha", bandeira: "🇩🇪" },
  { nome: "Holanda", bandeira: "🇳🇱" },
  { nome: "Bélgica", bandeira: "🇧🇪" },
  { nome: "Croácia", bandeira: "🇭🇷" },
  { nome: "Suíça", bandeira: "🇨🇭" },
  // AFC
  { nome: "Japão", bandeira: "🇯🇵" },
  { nome: "Coreia do Sul", bandeira: "🇰🇷" },
  { nome: "Austrália", bandeira: "🇦🇺" },
  { nome: "Irã", bandeira: "🇮🇷" },
  // CAF
  { nome: "Marrocos", bandeira: "🇲🇦" },
  { nome: "Senegal", bandeira: "🇸🇳" },
  { nome: "Egito", bandeira: "🇪🇬" },
  // OFC
  { nome: "Nova Zelândia", bandeira: "🇳🇿" },
];

async function main() {
  // Upsert por `nome` (coluna @unique): cria se não existir, atualiza a bandeira
  // se já existir. É o que torna o seed idempotente — rodar N vezes = 1 vez.
  for (const selecao of SELECOES) {
    await prisma.selecao.upsert({
      where: { nome: selecao.nome },
      update: { bandeira: selecao.bandeira },
      create: selecao,
    });
  }

  const total = await prisma.selecao.count();
  console.log(`Seed: ${SELECOES.length} seleções processadas; catálogo agora tem ${total}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
