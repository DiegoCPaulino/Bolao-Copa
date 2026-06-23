import { existsSync } from "node:fs";

/**
 * Setup global dos testes (vitest `setupFiles`) — roda ANTES de cada arquivo de
 * teste, portanto antes de qualquer módulo construir o cliente Prisma.
 *
 * Carrega o ambiente de TESTE (`.env.test`). Sem ele, os testes de integração se
 * auto-pulam (ver `tests/services/participanteService.test.ts`) — os de domínio,
 * puros, não dependem de banco e seguem rodando normalmente.
 */
if (existsSync(".env.test")) {
  process.loadEnvFile(".env.test");
}

// Se nem assim houver DATABASE_URL, define uma fictícia *_test só para o cliente
// Prisma poder ser construído sem estourar — o probe de conexão falhará e a
// integração será pulada, em vez de quebrar a coleta dos testes.
process.env.DATABASE_URL ??=
  "postgresql://indisponivel:indisponivel@127.0.0.1:5432/bolao_indisponivel_test?schema=public";

// TRAVA DE SEGURANÇA: testes apagam tabelas entre casos. Recusar rodar contra
// qualquer banco que não seja *_test evita destruir dados de desenvolvimento.
if (!process.env.DATABASE_URL.includes("_test")) {
  throw new Error(
    "DATABASE_URL de teste deve apontar para um banco *_test (proteção contra apagar dados de dev).",
  );
}
