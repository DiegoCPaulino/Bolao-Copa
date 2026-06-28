import { PrismaClient } from "@prisma/client";
import { ID_SELECAO_A_DEFINIR } from "../src/domain/selecoes.js";

const prisma = new PrismaClient();

/**
 * Catálogo de seleções da Copa 2026 (nome + bandeira emoji) — dado de
 * referência, populado por seed (arquitetura §6).
 *
 * Catálogo COMPLETO das 48 seleções. O seed é IDEMPOTENTE (upsert por `nome`):
 * rodar N vezes = rodar uma — só acrescenta o que faltar, nunca duplica. As "home
 * nations" (Inglaterra, Escócia) usam emojis de bandeira de subdivisão
 * (tag-sequences 🏴…); alguns terminais os mostram como bandeira preta, mas o
 * WhatsApp renderiza certo.
 */
const SELECOES: ReadonlyArray<{ nome: string; bandeira: string }> = [
  // Anfitriões (CONCACAF)
  { nome: "Estados Unidos", bandeira: "🇺🇸" },
  { nome: "México", bandeira: "🇲🇽" },
  { nome: "Canadá", bandeira: "🇨🇦" },
  { nome: "Panamá", bandeira: "🇵🇦" },
  { nome: "Haiti", bandeira: "🇭🇹" },
  { nome: "Curaçao", bandeira: "🇨🇼" },
  // CONMEBOL
  { nome: "Brasil", bandeira: "🇧🇷" },
  { nome: "Argentina", bandeira: "🇦🇷" },
  { nome: "Uruguai", bandeira: "🇺🇾" },
  { nome: "Colômbia", bandeira: "🇨🇴" },
  { nome: "Equador", bandeira: "🇪🇨" },
  { nome: "Paraguai", bandeira: "🇵🇾" },
  // UEFA
  { nome: "França", bandeira: "🇫🇷" },
  { nome: "Espanha", bandeira: "🇪🇸" },
  { nome: "Portugal", bandeira: "🇵🇹" },
  { nome: "Alemanha", bandeira: "🇩🇪" },
  { nome: "Holanda", bandeira: "🇳🇱" },
  { nome: "Bélgica", bandeira: "🇧🇪" },
  { nome: "Croácia", bandeira: "🇭🇷" },
  { nome: "Suíça", bandeira: "🇨🇭" },
  { nome: "Inglaterra", bandeira: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { nome: "Escócia", bandeira: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { nome: "Áustria", bandeira: "🇦🇹" },
  { nome: "Noruega", bandeira: "🇳🇴" },
  { nome: "Bósnia e Herzegovina", bandeira: "🇧🇦" },
  { nome: "República Tcheca", bandeira: "🇨🇿" },
  { nome: "Turquia", bandeira: "🇹🇷" },
  { nome: "Suécia", bandeira: "🇸🇪" },
  // AFC
  { nome: "Japão", bandeira: "🇯🇵" },
  { nome: "Coreia do Sul", bandeira: "🇰🇷" },
  { nome: "Austrália", bandeira: "🇦🇺" },
  { nome: "Irã", bandeira: "🇮🇷" },
  { nome: "Arábia Saudita", bandeira: "🇸🇦" },
  { nome: "Catar", bandeira: "🇶🇦" },
  { nome: "Jordânia", bandeira: "🇯🇴" },
  { nome: "Uzbequistão", bandeira: "🇺🇿" },
  { nome: "Iraque", bandeira: "🇮🇶" },
  // CAF
  { nome: "Marrocos", bandeira: "🇲🇦" },
  { nome: "Senegal", bandeira: "🇸🇳" },
  { nome: "Egito", bandeira: "🇪🇬" },
  { nome: "Costa do Marfim", bandeira: "🇨🇮" },
  { nome: "Argélia", bandeira: "🇩🇿" },
  { nome: "África do Sul", bandeira: "🇿🇦" },
  { nome: "Tunísia", bandeira: "🇹🇳" },
  { nome: "Gana", bandeira: "🇬🇭" },
  { nome: "Cabo Verde", bandeira: "🇨🇻" },
  { nome: "República Democrática do Congo", bandeira: "🇨🇩" },
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

  // "A definir": placeholder para um lado de jogo ainda não decidido (mata-mata). É uma
  // seleção NORMAL do catálogo, mas com ID FIXO (ID_SELECAO_A_DEFINIR, fonte única) — é
  // por esse id que a regra de domínio a reconhece (nunca pelo nome). Bandeira 🏴 (emoji
  // único estável; ⬛ como alternativa se renderizar mal). Idempotente (upsert por nome).
  await prisma.selecao.upsert({
    where: { nome: "A definir" },
    update: { bandeira: "🏴" },
    create: { id: ID_SELECAO_A_DEFINIR, nome: "A definir", bandeira: "🏴" },
  });

  const total = await prisma.selecao.count();
  console.log(
    `Seed: ${SELECOES.length} seleções + "A definir" processadas; catálogo agora tem ${total}.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
