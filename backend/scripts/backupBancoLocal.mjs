// Backup do banco local — rede de segurança da Entrega 1 (roteiro Fase 5).
//
// Roda o pg_dump DENTRO do container Postgres (docker compose) e grava um .sql com
// data/hora no nome, em backend/backups/. Não depende de ter pg_dump instalado no
// host. A pasta backups/ é ignorada pelo git (dumps podem ter dados reais).
//
// Uso (com o Postgres no ar):  npm run db:backup
//
// Restaurar num banco LIMPO (manual; cuidado: sobrescreve o destino):
//   docker compose exec -T db psql -U bolao -d <destino> < backend/backups/<arquivo>.sql

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const PASTA = "backups";
if (!existsSync(PASTA)) {
  mkdirSync(PASTA);
}

const agora = new Date();
const dois = (n) => String(n).padStart(2, "0");
const carimbo = `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}_${dois(agora.getHours())}${dois(agora.getMinutes())}`;
const arquivo = `${PASTA}/bolao_${carimbo}.sql`;

try {
  // cwd: ".." → roda o docker compose a partir da raiz (onde está o docker-compose.yml).
  // -T desliga a pseudo-TTY para podermos capturar o stdout limpo.
  const dump = execSync("docker compose exec -T db pg_dump -U bolao -d bolao", {
    cwd: "..",
    maxBuffer: 64 * 1024 * 1024,
  });
  writeFileSync(arquivo, dump);
  console.log(`Backup salvo em backend/${arquivo} (${dump.length} bytes).`);
} catch (erro) {
  console.error(
    "Falha no backup. O Postgres está no ar? Rode `docker compose up -d` na raiz.\n",
    erro instanceof Error ? erro.message : erro,
  );
  process.exit(1);
}
