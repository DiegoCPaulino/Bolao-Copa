import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { ZodError } from "zod";
import { ErroDeDominio } from "../domain/erros.js";
import { type ConfigAuth, exigirSessao, registrarAuth } from "./auth.js";

/**
 * Adaptador HTTP (Entrega 2) — apenas MAIS UM adaptador sobre os MESMOS serviços do
 * núcleo (CLAUDE.md §3.1). Como o CLI, esta casca só traduz: recebe a requisição,
 * (na 6.3) chama o serviço, e decide o destino da saída. Nenhuma regra de negócio
 * mora aqui.
 *
 * `buildApp` é uma FÁBRICA (não sobe o servidor): devolve a instância pronta para os
 * testes injetarem requisições (`app.inject`) sem abrir porta nem tocar o banco. Quem
 * valida o ambiente e chama `listen` é o `server.ts`.
 */

/**
 * Mapa erro-de-domínio → status HTTP, por `codigo` (o discriminante estável que
 * `domain/erros.ts` carrega justamente para o adaptador traduzir — CLAUDE.md §8.6).
 *
 * Aqui ficam só as exceções à regra geral: os "não encontrado" viram 404. Todo outro
 * `ErroDeDominio` é violação de regra de negócio = erro do cliente → o default é 400
 * (NÃO 500: erro de domínio é esperado, não é bug). Conflitos de estado usariam 409 —
 * ainda não há nenhum nesta fatia, mas é só acrescentar a entrada quando surgir.
 */
const STATUS_POR_CODIGO: Readonly<Record<string, number>> = {
  PARTICIPANTE_NAO_ENCONTRADO: 404,
  INDICADOR_NAO_ENCONTRADO: 404,
  RODADA_NAO_ENCONTRADA: 404,
  JOGO_NAO_ENCONTRADO: 404,
  SELECAO_INVALIDA: 404,
};

const STATUS_PADRAO_DOMINIO = 400;

/** Corpo de erro consistente para toda resposta de falha da API. */
type CorpoErro = {
  erro: { codigo: string; mensagem: string; detalhes?: unknown };
};

/** Configuração do app: logger (opcional) + auth (injetada — do `.env` ou, nos testes, fixa). */
export type ConfigApp = { logger?: FastifyServerOptions["logger"] } & ConfigAuth;

export function buildApp(config: ConfigApp): FastifyInstance {
  const app = Fastify({ logger: config.logger ?? true });

  // Handler de erro CENTRAL: traduz os erros tipados (os mesmos que o CLI já trata)
  // em status + JSON consistente. Mantém o try/catch fora das rotas (CLAUDE.md §8.6).
  app.setErrorHandler((erro, req, reply) => {
    if (erro instanceof ZodError) {
      // Validação de entrada (reusada das fatias 6.3+) → 400 com os detalhes.
      const corpo: CorpoErro = {
        erro: { codigo: "VALIDACAO", mensagem: "Dados inválidos.", detalhes: erro.issues },
      };
      return reply.status(400).send(corpo);
    }

    if (erro instanceof ErroDeDominio) {
      const status = STATUS_POR_CODIGO[erro.codigo] ?? STATUS_PADRAO_DOMINIO;
      const corpo: CorpoErro = { erro: { codigo: erro.codigo, mensagem: erro.message } };
      return reply.status(status).send(corpo);
    }

    // Qualquer outra coisa é um BUG (inesperado): loga o real, mas não vaza detalhes.
    req.log.error(erro);
    const corpo: CorpoErro = { erro: { codigo: "ERRO_INTERNO", mensagem: "Erro interno." } };
    return reply.status(500).send(corpo);
  });

  // Rota desconhecida no MESMO formato de erro (em vez do 404 padrão do Fastify).
  app.setNotFoundHandler((req, reply) => {
    const corpo: CorpoErro = {
      erro: { codigo: "ROTA_NAO_ENCONTRADA", mensagem: `Rota não encontrada: ${req.url}` },
    };
    return reply.status(404).send(corpo);
  });

  // Saúde do bootstrap (PÚBLICA, sem auth) — smoke do esqueleto.
  app.get("/health", async () => ({ ok: true }));

  // Sessão por cookie + rotas públicas de auth (/auth/login, /auth/logout).
  registrarAuth(app, config);

  // Escopo PROTEGIDO: o `preHandler` tranca tudo que for registrado aqui dentro. As
  // rotas de feature da 6.3 entram neste escopo e já nascem exigindo sessão. /me é a
  // rota de prova do loop login → sessão → acesso.
  app.register(async (protegidas) => {
    protegidas.addHook("preHandler", exigirSessao);
    protegidas.get("/me", async () => ({ autenticado: true }));
  });

  return app;
}
