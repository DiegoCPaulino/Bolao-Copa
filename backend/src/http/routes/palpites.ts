import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { formatarPendencias } from "../../domain/whatsapp/pendencias.js";
import { formatarTabelaPalpites } from "../../domain/whatsapp/tabelaPalpites.js";
import {
  registrarPalpiteBodySchema,
  registrarPalpitesBodySchema,
} from "../../schemas/palpiteSchemas.js";
import * as palpitesService from "../../services/palpiteService.js";
import * as rodadas from "../../services/rodadaService.js";
import { FASE_LABEL } from "../../shared/rotulos.js";

const idParam = z.object({ id: z.string().min(1) });
const palpitesParams = z.object({ pid: z.string().min(1), rid: z.string().min(1) });
const palpiteJogoParams = z.object({
  pid: z.string().min(1),
  rid: z.string().min(1),
  jogoId: z.string().min(1),
});
const TEXTO_PLANO = "text/plain; charset=utf-8";

/**
 * Palpites — mesmo molde da 6.3a. O registro é UPSERT (correção sempre livre, §8.6):
 * participante e rodada vêm da URL, o corpo traz os palpites. Inclui "quem falta
 * palpitar" e as exportações §12.2 (tabela) e §12.8 (pendências).
 */
export async function rotasPalpites(app: FastifyInstance): Promise<void> {
  app.put("/participantes/:pid/rodadas/:rid/palpites", async (req) => {
    const { pid, rid } = palpitesParams.parse(req.params);
    const { palpites } = registrarPalpitesBodySchema.parse(req.body);
    return palpitesService.registrarPalpites(rid, pid, palpites); // valida jogos/rodada/participante
  });

  // Palpite SINGULAR (jogo a jogo, 8.4) — convive com o plural acima (path próprio). UPSERT:
  // ids na URL, corpo só os gols. 200 (idempotente). Erros: 404 rodada/participante,
  // 400 JogoForaDaRodada / PalpiteInvalido (handler central).
  app.put("/participantes/:pid/rodadas/:rid/jogos/:jogoId/palpite", async (req) => {
    const { pid, rid, jogoId } = palpiteJogoParams.parse(req.params);
    const { golsEsquerda, golsDireita } = registrarPalpiteBodySchema.parse(req.body);
    return palpitesService.registrarPalpite(rid, pid, jogoId, golsEsquerda, golsDireita);
  });

  // Palpites JÁ registrados de um participante na rodada (pré-preencher a tela). Read
  // permissivo: devolve [] se não houver (não 404).
  app.get("/participantes/:pid/rodadas/:rid/palpites", async (req) => {
    const { pid, rid } = palpitesParams.parse(req.params);
    return palpitesService.palpitesDoParticipante(rid, pid);
  });

  // Tabela de palpites em JSON (a tela renderiza a grade; o export text/plain §12.2 fica
  // na rota /export/tabela abaixo). Derivada na leitura — nada armazenado.
  app.get("/rodadas/:id/tabela", async (req) => {
    const { id } = idParam.parse(req.params);
    return palpitesService.dadosTabelaPalpites(id); // RodadaNaoEncontrada → 404
  });

  app.get("/rodadas/:id/pendentes", async (req) => {
    const { id } = idParam.parse(req.params);
    return palpitesService.participantesPendentes(id); // RodadaNaoEncontrada → 404
  });

  app.get("/rodadas/:id/export/tabela", async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const r = await rodadas.detalharRodada(id); // fase (e 404)
    const linhas = await palpitesService.dadosTabelaPalpites(id);
    const texto = formatarTabelaPalpites(
      linhas.map((l) => ({
        nome: l.nome,
        apelido: l.apelido ?? undefined,
        palpites: l.palpites.map((p) => ({
          jogo: p.jogoOrdem,
          placar: { golsEsquerda: p.golsEsquerda, golsDireita: p.golsDireita },
        })),
      })),
      FASE_LABEL[r.fase].toUpperCase(),
    );
    return reply.type(TEXTO_PLANO).send(texto);
  });

  app.get("/rodadas/:id/export/pendencias", async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const r = await rodadas.detalharRodada(id); // fase (e 404)
    const pendentes = await palpitesService.participantesPendentes(id);
    const texto = formatarPendencias(
      pendentes.map((p) => ({ nome: p.nome, apelido: p.apelido ?? undefined })),
      FASE_LABEL[r.fase].toUpperCase(),
    );
    return reply.type(TEXTO_PLANO).send(texto);
  });
}
