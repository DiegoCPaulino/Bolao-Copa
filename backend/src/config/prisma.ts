import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma — ÚNICO ponto de instanciação no projeto.
 *
 * Só os repositórios importam daqui (regra de dependência — CLAUDE.md §3.5):
 * domínio e serviços nunca tocam neste módulo. Um único cliente por processo
 * evita estourar o pool de conexões (cada `new PrismaClient()` abre o seu).
 *
 * Lê `DATABASE_URL` do ambiente no momento da construção; quem carrega o `.env`
 * é a borda (o script `cli` usa `node --env-file`; os testes carregam `.env.test`).
 *
 * Para o aprendizado de SQL (CLAUDE.md §4), defina `PRISMA_LOG=1` para ver as
 * queries geradas — desligado por padrão para não poluir o terminal durante o uso.
 */
const opcoes: Prisma.PrismaClientOptions = process.env.PRISMA_LOG ? { log: ["query"] } : {};

export const prisma = new PrismaClient(opcoes);
