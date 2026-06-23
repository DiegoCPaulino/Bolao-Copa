// Prepara o banco de TESTE: cria (se faltar) e sincroniza o schema.
//
// Usa `prisma db push` em vez de `migrate deploy` de propósito — para um banco de
// teste descartável queremos o schema atual sem carregar histórico de migrations.
// `db push` ainda CRIA o banco caso não exista.
//
// Rode uma vez (e sempre que o schema mudar):  npm run test:db

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const ARQUIVO = ".env.test";
if (!existsSync(ARQUIVO)) {
  console.error(`Faltou ${ARQUIVO}. Copie de ${ARQUIVO}.example e ajuste, se preciso.`);
  process.exit(1);
}

// Carrega a DATABASE_URL de teste para esta execução. O Prisma CLI também lê o
// `.env`, mas não sobrescreve variáveis já presentes no ambiente — então a de
// teste, definida aqui, prevalece.
process.loadEnvFile(ARQUIVO);

execSync("npx prisma db push --skip-generate", { stdio: "inherit", env: process.env });
