import { buildApp, type ConfigApp } from "../../src/http/app.js";

/**
 * Fixtures de auth para os testes de API. O hash é FIXO e gerado de uma senha
 * DESCARTÁVEL ("senha-de-teste") — nunca a senha real do organizador, que vive só
 * no `.env` (ORGANIZADOR_SENHA_HASH) e jamais é comitada. Como o `buildApp` recebe a
 * config injetada, os testes usam este hash sem tocar no `.env` real.
 */
export const SENHA_TESTE = "senha-de-teste";

/** argon2id de SENHA_TESTE (gerado uma vez; verificável com `argon2.verify`). */
const HASH_TESTE =
  "$argon2id$v=19$m=65536,t=3,p=4$+7TY43Vz4cFA/z6fktxM8w$cObqT/QrVDZe5w2DrrX+oIo3OSrA8VxwHkwZx/z0U3w";

/** Segredo de sessão de teste (>= 32 chars, como o schema exige). Não é real. */
const SECRET_TESTE = "segredo-de-teste-com-mais-de-32-chars!!";

/** Origem do front liberada pelo CORS nos testes (mesmo default de dev — Vite). */
export const ORIGEM_TESTE = "http://localhost:5173";

/** App pronto para `inject`, com auth fixa e logger desligado. cookieSecure=false (sem TLS). */
export function buildAppTeste(): ReturnType<typeof buildApp> {
  const config: ConfigApp = {
    logger: false,
    sessionSecret: SECRET_TESTE,
    organizadorSenhaHash: HASH_TESTE,
    cookieSecure: false,
    frontendOrigin: ORIGEM_TESTE,
  };
  return buildApp(config);
}
