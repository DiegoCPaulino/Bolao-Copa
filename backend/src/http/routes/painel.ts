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

  // Classificação geral em JSON (para o TOP 3 do Painel): já ordenada pela cascata no
  // serviço; a tela só EXIBE (não reordena). Complementa o export §12.5 abaixo, que
  // continua servindo o text/plain para o grupo.
  app.get("/classificacao", async () => resultados.classificacaoGeral());

  app.get("/classificacao/export", async (_req, reply) => {
    const linhas = await resultados.classificacaoGeral();
    const texto = formatarClassificacaoGeral(
      linhas.map((l) => ({ nome: l.nome, apelido: l.apelido ?? undefined, pontos: l.pontos })),
      "classificação atual",
    );
    return reply.type(TEXTO_PLANO).send(texto);
  });
}
