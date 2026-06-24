import secureSession from "@fastify/secure-session";
import argon2 from "argon2";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

// Declara a forma da sessão (senão `session.set/get` tipam a chave como `never`).
// Single-user: a sessão guarda só a marca de "organizador autenticado".
declare module "@fastify/secure-session" {
  interface SessionData {
    organizador: boolean;
  }
}

/**
 * Autenticação SINGLE-USER (Fatia 6.2) — CLAUDE.md §3.8; arquitetura §4.8/§10.
 *
 * Só existe UM usuário (o organizador): sem tabela de usuários, sem cadastro, sem
 * papéis, sem recuperação. A verdade da senha é o hash argon2id no `.env`
 * (`ORGANIZADOR_SENHA_HASH`); o login compara a senha digitada com `argon2.verify`.
 *
 * Sessão por COOKIE httpOnly via `@fastify/secure-session`: o estado vai cifrado
 * DENTRO do cookie (stateless — sem store no servidor). Vantagem: sobrevive a
 * restart/deploy e não precisa de Redis/MemoryStore. Trade-off: o logout limpa o
 * cookie do cliente, mas não há revogação server-side de um cookie já emitido —
 * aceitável para uso local single-user.
 */

/** Configuração de auth injetada pelo `buildApp` (vem do `.env` validado; nos testes, fixa). */
export type ConfigAuth = {
  sessionSecret: string;
  organizadorSenhaHash: string;
  /** Cookie `Secure` (só sob HTTPS). `false` em dev local sem TLS, senão o login trava. */
  cookieSecure: boolean;
};

const NOME_COOKIE = "bolao_sessao";
const CHAVE_SESSAO = "organizador";
// Salt da derivação de chave do secure-session: 16 chars EXATOS. NÃO é segredo
// (deriva a chave junto com o SESSION_SECRET, que sim é segredo) — pode ser fixo.
const SALT = "bolao-copa-2026!";

const loginSchema = z.object({ senha: z.string().min(1, "Informe a senha.") });

/** Erro consistente com o handler central (mesmo formato da 6.1). */
function semAutorizacao(reply: FastifyReply, codigo: string, mensagem: string) {
  return reply.status(401).send({ erro: { codigo, mensagem } });
}

/**
 * Registra a sessão por cookie e as rotas PÚBLICAS de auth (`/auth/login`,
 * `/auth/logout`). As rotas protegidas usam o `exigirSessao` abaixo.
 */
export function registrarAuth(app: FastifyInstance, config: ConfigAuth): void {
  app.register(secureSession, {
    secret: config.sessionSecret,
    salt: SALT,
    cookieName: NOME_COOKIE,
    cookie: {
      path: "/",
      httpOnly: true, // o JS do navegador não enxerga o cookie (defesa contra XSS)
      sameSite: "strict", // não acompanha requisições cross-site (defesa contra CSRF)
      secure: config.cookieSecure, // só sob HTTPS (produção); ver server.ts
    },
  });

  app.post("/auth/login", async (req, reply) => {
    const { senha } = loginSchema.parse(req.body);
    const confere = await argon2.verify(config.organizadorSenhaHash, senha);
    if (!confere) {
      // Mensagem genérica de propósito: não há "usuário" a revelar (single-user).
      return semAutorizacao(reply, "NAO_AUTORIZADO", "Senha incorreta.");
    }
    req.session.set(CHAVE_SESSAO, true);
    return reply.status(200).send({ autenticado: true });
  });

  app.post("/auth/logout", async (req, reply) => {
    req.session.delete(); // limpa o cookie de sessão no cliente
    return reply.status(200).send({ ok: true });
  });
}

/**
 * preHandler que TRANCA uma rota: sem sessão válida → 401. As rotas de feature da
 * 6.3 nascem sob ele (registradas no escopo protegido do `buildApp`). `/health` e
 * `/auth/login` ficam de fora (públicas).
 */
export async function exigirSessao(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (req.session.get(CHAVE_SESSAO) !== true) {
    await semAutorizacao(reply, "NAO_AUTENTICADO", "Faça login para continuar.");
  }
}
