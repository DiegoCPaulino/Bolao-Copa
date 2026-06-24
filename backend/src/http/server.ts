import { carregarEnv } from "../config/env.js";
import { buildApp } from "./app.js";

/**
 * Ponto de entrada do servidor HTTP (Entrega 2) — o que `npm run dev` executa.
 *
 * Ordem importa: PRIMEIRO valida o ambiente (aborta no boot se faltar variável),
 * só DEPOIS sobe o Fastify. Assim uma config inválida nunca chega a aceitar conexões.
 *
 * Host loopback (127.0.0.1) de propósito nesta fase (sem deploy ainda; Fase 9 define
 * o host). O cookie `Secure` só liga em produção: em dev local (http) ligá-lo travaria
 * o login, pois o navegador não enviaria o cookie sem TLS.
 */
const env = carregarEnv();
const app = buildApp({
  sessionSecret: env.SESSION_SECRET,
  organizadorSenhaHash: env.ORGANIZADOR_SENHA_HASH,
  cookieSecure: env.NODE_ENV === "production",
});

app.listen({ port: env.PORT, host: "127.0.0.1" }).catch((erro) => {
  app.log.error(erro);
  process.exit(1);
});
