import type { FastifyInstance } from "fastify";
import { formatarClassificacaoGeral } from "../../domain/whatsapp/classificacaoGeral.js";
import * as painel from "../../services/painelService.js";
import * as resultados from "../../services/resultadoService.js";

const TEXTO_PLANO = "text/plain; charset=utf-8";

/**
 * Classificação e Painel — mesmo molde da 6.3a. O painel é a tela PRIVADA do
 * organizador (JSON com pagamentos, premiação atual/potencial, ganho do organizador e
 * rodada atual). A classificação geral sai como export §12.5 (já ordenada pela cascata).
 */
export async function rotasPainel(app: FastifyInstance): Promise<void> {
  app.get("/painel", async () => painel.gerarResumo());

  app.get("/classificacao/export", async (_req, reply) => {
    const linhas = await resultados.classificacaoGeral();
    const texto = formatarClassificacaoGeral(
      linhas.map((l) => ({ nome: l.nome, apelido: l.apelido ?? undefined, pontos: l.pontos })),
      "classificação atual",
    );
    return reply.type(TEXTO_PLANO).send(texto);
  });
}
