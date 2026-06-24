import { carregarEnv } from "../config/env.js";
import { buildApp } from "./app.js";

/**
 * Ponto de entrada do servidor HTTP (Entrega 2) — o que `npm run dev` executa.
 *
 * Ordem importa: PRIMEIRO valida o ambiente (aborta no boot se faltar variável),
 * só DEPOIS sobe o Fastify. Assim uma config inválida nunca chega a aceitar conexões.
 *
 * Host loopback (127.0.0.1) de propósito nesta fase: o servidor ainda não tem auth
 * (chega na 6.2), então não o expomos na rede. O deploy (Fase 9) define o host.
 */
const env = carregarEnv();
const app = buildApp();

app.listen({ port: env.PORT, host: "127.0.0.1" }).catch((erro) => {
  app.log.error(erro);
  process.exit(1);
});
