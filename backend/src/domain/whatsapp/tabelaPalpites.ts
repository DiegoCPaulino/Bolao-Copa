import type { Placar } from "../pontuacao.js";
import { negrito, placarCompacto } from "./formato.js";
import type { LadoDoJogo } from "./jogo.js";
import { nomeExibicao, type ParticipanteExibivel } from "./nomeExibicao.js";

/** Um palpite na tabela: a qual jogo (ordem) e o placar palpitado. */
export type PalpiteNaTabela = {
  jogo: number;
  placar: Placar;
};

/** Uma linha POR PARTICIPANTE — a forma que o serviço entrega; o formatador reagrupa. */
export type LinhaTabelaPalpites = ParticipanteExibivel & {
  palpites: ReadonlyArray<PalpiteNaTabela>;
};

/** Um jogo da rodada (ordem + os dois lados) — insumo do cabeçalho de cada bloco. */
export type JogoNaTabela = {
  ordem: number;
  esquerda: LadoDoJogo;
  direita: LadoDoJogo;
};

/**
 * Tabela de palpites para o WhatsApp — funcional §13.2, agrupada POR JOGO:
 *
 *   📋 *PALPITES — OITAVAS*
 *
 *   ⚽ *J1* 🇧🇷 Brasil × Argentina 🇦🇷
 *   Ana 1x0
 *   Diego 2x1
 *
 *   ⚽ *J2* 🇫🇷 França × Espanha 🇪🇸
 *   _(sem palpites ainda)_
 *
 * Função PURA. RECEBE os jogos (para os cabeçalhos) e os palpites JÁ por participante
 * (o serviço entrega assim); o formatador apenas TRANSPÕE para por jogo — não busca
 * nem calcula (CLAUDE.md §3.3). O cabeçalho do jogo usa o MESMO formato da mensagem
 * da rodada (§13.1). Dentro de cada jogo, só quem palpitou aquele jogo, em ordem
 * ALFABÉTICA por nome (apelido só desambigua homônimos, via `nomeExibicao` —
 * consistente com os outros artefatos). Jogo sem palpites mostra o cabeçalho + um
 * placeholder discreto (não some o jogo). Estrutura por emoji + negrito, SEM tabela
 * nem monoespaçado (consistente com o resumo do jogo §13.3).
 */
export function formatarTabelaPalpites(
  jogos: ReadonlyArray<JogoNaTabela>,
  linhas: ReadonlyArray<LinhaTabelaPalpites>,
  faseLabel: string,
): string {
  const partes: string[] = [`📋 ${negrito(`PALPITES — ${faseLabel}`)}`];

  for (const jogo of jogos) {
    partes.push(""); // linha em branco separando os blocos de jogo
    partes.push(
      `⚽ ${negrito(`J${jogo.ordem}`)} ${jogo.esquerda.bandeira} ${jogo.esquerda.nome} × ${jogo.direita.nome} ${jogo.direita.bandeira}`,
    );

    // Reagrupa: quem palpitou ESTE jogo, em ordem alfabética (apelido como desempate).
    const doJogo = linhas
      .flatMap((linha) => {
        const palpite = linha.palpites.find((p) => p.jogo === jogo.ordem);
        return palpite ? [{ exibivel: linha, placar: palpite.placar }] : [];
      })
      .sort(
        (a, b) =>
          a.exibivel.nome.localeCompare(b.exibivel.nome, "pt-BR") ||
          (a.exibivel.apelido ?? "").localeCompare(b.exibivel.apelido ?? "", "pt-BR"),
      );

    if (doJogo.length === 0) {
      partes.push("_(sem palpites ainda)_");
      continue;
    }
    const exibiveis = doJogo.map((d) => d.exibivel);
    for (const d of doJogo) {
      partes.push(`${nomeExibicao(d.exibivel, exibiveis)} ${placarCompacto(d.placar)}`);
    }
  }

  return partes.join("\n");
}
