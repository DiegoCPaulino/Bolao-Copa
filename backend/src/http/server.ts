import { carregarEnv } from "../config/env.js";
import { buildApp } from "./app.js";

/**
 * Ponto de entrada do servidor HTTP (Entrega 2) — o que `npm run dev` executa.
 *
 * Ordem importa: PRIMEIRO valida o ambiente (aborta no boot se faltar variável),
 * só DEPOIS sobe o Fastify. Assim uma config inválida nunca chega a aceitar conexões.
 *
 * Host 0.0.0.0 + porta de `process.env.PORT` (via env validado): exigido por um PaaS
 * como o Render, que INJETA a PORT e roteia o tráfego para o container. A porta NUNCA
 * é hardcoded — em dev cai no default do `.env` (3000). O cookie `Secure` liga só em
 * produção (NODE_ENV=production): o Render serve HTTPS; em dev local (http) ligá-lo
 * travaria o login, pois o navegador não enviaria o cookie sem TLS.
 */
const env = carregarEnv();
const app = buildApp({
  sessionSecret: env.SESSION_SECRET,
  organizadorSenhaHash: env.ORGANIZADOR_SENHA_HASH,
  cookieSecure: env.NODE_ENV === "production",
});

app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((erro) => {
  app.log.error(erro);
  process.exit(1);
});
