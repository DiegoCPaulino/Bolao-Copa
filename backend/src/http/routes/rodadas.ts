import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { formatarMensagemRodada } from "../../domain/whatsapp/mensagemRodada.js";
import { formatarResumoJogo } from "../../domain/whatsapp/resumoJogo.js";
import { formatarResumoRodada } from "../../domain/whatsapp/resumoRodada.js";
import { resultadoBodySchema } from "../../schemas/resultadoSchemas.js";
import {
  definirEstadoInputSchema,
  jogoInputSchema,
  rodadaPostBodySchema,
} from "../../schemas/rodadaSchemas.js";
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

  // POST /rodadas BIFURCA pelo corpo (ver rodadaPostBodySchema): `jogos` ausente cria a
  // rodada VAZIA (montagem incremental); `jogos: [≥1]` monta de forma ATÔMICA (fase +
  // jogos, como na Fase 6); `jogos: []` é 400 (o Zod rejeita). A ordem é derivada pelo
  // SERVIÇO — o adaptador só repassa. É dispatch por shape de entrada, não regra.
  app.post("/rodadas", async (req, reply) => {
    const dados = rodadaPostBodySchema.parse(req.body);
    const criada = dados.jogos
      ? await rodadas.montarRodada(dados.fase, dados.jogos)
      : await rodadas.criarRodada(dados.fase);
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

  // — Jogos: montagem INCREMENTAL (granular). Cada rota é fina (Zod + serviço) e
  // devolve a RODADA DETALHADA: adicionar/editar/remover são tratados de forma
  // UNIFORME pelo cliente (sempre recebe a lista J1/J2… atualizada de uma vez). O
  // serviço cuida da sanidade; nenhuma ação é travada pelo estado da rodada (§3.7).
  app.post("/rodadas/:id/jogos", async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const { selecaoEsquerdaId, selecaoDireitaId } = jogoInputSchema.parse(req.body);
    const rodada = await rodadas.adicionarJogo(id, selecaoEsquerdaId, selecaoDireitaId);
    reply.code(201);
    return rodada;
  });

  app.put("/jogos/:id", async (req) => {
    const { id } = idParam.parse(req.params);
    const { selecaoEsquerdaId, selecaoDireitaId } = jogoInputSchema.parse(req.body);
    return rodadas.editarJogo(id, selecaoEsquerdaId, selecaoDireitaId); // 200 (rodada detalhada)
  });

  // DELETE devolve 200 + a rodada detalhada (NÃO 204) — DE PROPÓSITO: igual ao
  // POST/PUT de jogo acima, pra o cliente tratar as três mutações de jogo de forma
  // uniforme (sempre recebe a rodada atualizada). Diverge do DELETE de participante
  // (204) conscientemente. Remover jogo COM palpites → JogoComPalpites → 409.
  app.delete("/jogos/:id", async (req) => {
    const { id } = idParam.parse(req.params);
    return rodadas.removerJogo(id);
  });

  app.put("/jogos/:id/resultado", async (req) => {
    const { id } = idParam.parse(req.params);
    const { golsEsquerda, golsDireita } = resultadoBodySchema.parse(req.body);
    return resultados.registrarResultado(id, golsEsquerda, golsDireita); // recálculo sob demanda
  });

  // — leituras em JSON (8.4) — a pontuação/resumo são DERIVADOS na leitura (sob demanda);
  // nada armazenado. A tela re-busca após lançar resultado para refletir o recálculo. —
  app.get("/rodadas/:id/pontuacao", async (req) => {
    const { id } = idParam.parse(req.params);
    return resultados.pontosDaRodada(id); // já ordenado pela cascata; RodadaNaoEncontrada → 404
  });

  app.get("/jogos/:id/resumo", async (req) => {
    const { id } = idParam.parse(req.params);
    // 404 jogo; 400 RESULTADO_NAO_REGISTRADO se o jogo ainda não tem placar (sem resumo
    // sem resultado — a tela só chama isto para jogo decidido). Erro sobe ao handler central.
    return resultados.dadosResumoJogo(id);
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
