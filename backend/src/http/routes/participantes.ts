import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ParticipanteNaoEncontrado } from "../../domain/erros.js";
import { formatarListaParticipantes } from "../../domain/whatsapp/listaParticipantes.js";
import {
  listarParticipantesQuerySchema,
  participanteInputSchema,
} from "../../schemas/participanteSchemas.js";
import * as participantes from "../../services/participanteService.js";

/**
 * Rotas de Participantes — ROTA-PILOTO (Fatia 6.3a): fixa o molde que as outras seis
 * fatias vão copiar. Cada handler é FINO (CLAUDE.md §3.1): valida com Zod → chama o
 * serviço que JÁ existe → devolve. NÃO calcula regra nem trata erro à mão — erros de
 * domínio sobem para o handler central da 6.1 (não-encontrado → 404, etc.).
 *
 * Status HTTP como CONTRATO (o front lê o status, não precisa interpretar o corpo):
 *   GET coleção → 200 (array) | POST cria → 201 (corpo = criado) | PUT edita → 200
 *   DELETE → 204 (sem corpo)  | export → 200 text/plain.
 *
 * Registrada DENTRO do escopo protegido (app.ts), então toda rota aqui já nasce sob o
 * `exigirSessao` (sem cookie → 401). É um plugin Fastify: a 6.3b só replica o formato.
 */

const idParamSchema = z.object({ id: z.string().min(1) });
const TEXTO_PLANO = "text/plain; charset=utf-8";

export async function rotasParticipantes(app: FastifyInstance): Promise<void> {
  // LISTAR — filtros simples (busca/status/ordenação) vêm da query string.
  app.get("/participantes", async (req) => {
    const opcoes = listarParticipantesQuerySchema.parse(req.query);
    return participantes.listarParticipantes(opcoes);
  });

  // EXPORTAR (text/plain) — padrão de exportação: pega a lista, joga no formatador
  // PURO (§12.6) e devolve como texto pronto para colar no WhatsApp. Registrada antes
  // de "/:id" por clareza (o Fastify já prioriza segmento estático sobre paramétrico).
  app.get("/participantes/export", async (_req, reply) => {
    const lista = await participantes.listarParticipantes();
    const texto = formatarListaParticipantes(
      lista.map((p) => ({ nome: p.nome, apelido: p.apelido ?? undefined })),
    );
    return reply.type(TEXTO_PLANO).send(texto);
  });

  // OBTER UM — ausência vira o erro de domínio canônico → handler central devolve 404.
  app.get("/participantes/:id", async (req) => {
    const { id } = idParamSchema.parse(req.params);
    const participante = await participantes.buscarParticipante(id);
    if (!participante) {
      throw new ParticipanteNaoEncontrado(id);
    }
    return participante;
  });

  // CRIAR — 201 com o recurso criado. Reusa o MESMO schema Zod do CLI.
  app.post("/participantes", async (req, reply) => {
    const dados = participanteInputSchema.parse(req.body);
    const criado = await participantes.criarParticipante(dados);
    reply.code(201);
    return criado;
  });

  // EDITAR — 200 com o recurso atualizado.
  app.put("/participantes/:id", async (req) => {
    const { id } = idParamSchema.parse(req.params);
    const dados = participanteInputSchema.parse(req.body);
    return participantes.atualizarParticipante(id, dados);
  });

  // REMOVER — 204 sem corpo.
  app.delete("/participantes/:id", async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    await participantes.removerParticipante(id);
    return reply.code(204).send();
  });
}
