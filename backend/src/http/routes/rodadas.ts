import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { formatarMensagemRodada } from "../../domain/whatsapp/mensagemRodada.js";
import { formatarResumoJogo } from "../../domain/whatsapp/resumoJogo.js";
import { formatarResumoRodada } from "../../domain/whatsapp/resumoRodada.js";
import { resultadoBodySchema } from "../../schemas/resultadoSchemas.js";
import { definirEstadoInputSchema, montarRodadaInputSchema } from "../../schemas/rodadaSchemas.js";
import * as resultados from "../../services/resultadoService.js";
import * as rodadas from "../../services/rodadaService.js";
import { FASE_LABEL } from "../../shared/rotulos.js";

const idParam = z.object({ id: z.string().min(1) });
const TEXTO_PLANO = "text/plain; charset=utf-8";

/**
 * Rodadas e Jogos — mesmo molde da 6.3a. Inclui o registro de resultado (que dispara o
 * recálculo SOB DEMANDA no serviço) e três exportações (§12.1/§12.3/§12.4). Erros de
 * domínio (rodada/jogo inexistente, placar inválido) sobem ao handler central.
 */
export async function rotasRodadas(app: FastifyInstance): Promise<void> {
  app.get("/rodadas", async () => rodadas.listarRodadas());

  app.post("/rodadas", async (req, reply) => {
    const dados = montarRodadaInputSchema.parse(req.body);
    // A ordem da rodada é derivada pelo SERVIÇO — o adaptador só passa fase + jogos.
    const criada = await rodadas.montarRodada(dados.fase, dados.jogos);
    reply.code(201);
    return criada;
  });

  app.get("/rodadas/:id", async (req) => {
    const { id } = idParam.parse(req.params);
    return rodadas.detalharRodada(id); // RodadaNaoEncontrada → 404
  });

  app.put("/rodadas/:id/estado", async (req) => {
    const { id } = idParam.parse(req.params);
    const { estado } = definirEstadoInputSchema.parse(req.body);
    return rodadas.definirEstado(id, estado); // estado é GUIA, não trava (§3.7)
  });

  app.put("/jogos/:id/resultado", async (req) => {
    const { id } = idParam.parse(req.params);
    const { golsEsquerda, golsDireita } = resultadoBodySchema.parse(req.body);
    return resultados.registrarResultado(id, golsEsquerda, golsDireita); // recálculo sob demanda
  });

  // — exportações (text/plain) —
  app.get("/rodadas/:id/export/mensagem", async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const r = await rodadas.detalharRodada(id);
    const texto = formatarMensagemRodada(
      r.jogos.map((j) => ({
        ordem: j.ordem,
        esquerda: { nome: j.selecaoEsquerda.nome, bandeira: j.selecaoEsquerda.bandeira },
        direita: { nome: j.selecaoDireita.nome, bandeira: j.selecaoDireita.bandeira },
      })),
      FASE_LABEL[r.fase].toUpperCase(),
    );
    return reply.type(TEXTO_PLANO).send(texto);
  });

  app.get("/jogos/:id/export/resumo", async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const dados = await resultados.dadosResumoJogo(id); // 404 jogo / ResultadoNaoRegistrado
    const texto = formatarResumoJogo(
      { esquerda: dados.esquerda, direita: dados.direita, placar: dados.resultado },
      dados.palpites.map((p) => ({
        nome: p.nome,
        apelido: p.apelido ?? undefined,
        palpite: p.palpite,
        pontos: p.pontos,
      })),
      `Jogo ${dados.ordem}`,
    );
    return reply.type(TEXTO_PLANO).send(texto);
  });

  app.get("/rodadas/:id/export/resumo", async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const r = await rodadas.detalharRodada(id); // fase (e 404)
    const linhas = await resultados.pontosDaRodada(id); // já ordenado pela cascata
    const texto = formatarResumoRodada(
      linhas.map((l) => ({ nome: l.nome, apelido: l.apelido ?? undefined, pontos: l.pontos })),
      FASE_LABEL[r.fase].toUpperCase(),
    );
    return reply.type(TEXTO_PLANO).send(texto);
  });
}
