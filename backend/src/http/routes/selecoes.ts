import type { FastifyInstance } from "fastify";
import * as selecoes from "../../services/selecaoService.js";

/**
 * Catálogo de seleções — só leitura (o catálogo se completa pelo seed). Mesmo molde da
 * rota-piloto (6.3a): handler fino sobre o serviço existente.
 */
export async function rotasSelecoes(app: FastifyInstance): Promise<void> {
  app.get("/selecoes", async () => selecoes.listarSelecoes());
}
