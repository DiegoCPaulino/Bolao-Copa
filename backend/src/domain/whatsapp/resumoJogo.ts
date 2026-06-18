import type { Placar, Pontos } from "../pontuacao.js";
import { negrito, placarCompacto, placarPorExtenso } from "./formato.js";
import type { LadoDoJogo } from "./jogo.js";
import { nomeExibicao, type ParticipanteExibivel } from "./nomeExibicao.js";

/** Resultado real de um jogo: os dois lados (nome + bandeira) e o placar. */
export type ResultadoJogo = {
  esquerda: LadoDoJogo;
  direita: LadoDoJogo;
  placar: Placar;
};

/** Palpite de um participante com os pontos JÁ calculados (cruzamento palpite × resultado). */
export type PalpiteComPontos = ParticipanteExibivel & {
  palpite: Placar;
  pontos: Pontos;
};

/** Emoji por pontuação (§12.3). Record com as chaves 0|1|3 → acesso sempre definido. */
const EMOJI_POR_PONTOS: Record<Pontos, string> = {
  3: "🎯",
  1: "✔️",
  0: "❌",
};

/**
 * Resumo do jogo (após cada resultado) para o WhatsApp — funcional §12.3:
 *
 *   ✅ *RESULTADO — Jogo 1*
 *   🇧🇷 Brasil 2 x 1 Argentina 🇦🇷
 *
 *   🎯 Diego 2x1 → *3 pts* (cravou!)
 *   ✔️ Lucas 1x0 → 1 pt
 *   ❌ Ana 1x1 → 0 pt
 *
 * Função PURA. RECEBE os pontos JÁ CALCULADOS — só mapeia pontos→emoji, NÃO
 * chama `calcularPontos` (CLAUDE.md §3.3, §10).
 *
 * Ordena os palpiteiros por pontos desc (cravadas primeiro) APENAS para
 * exibição, usando os pontos já dados — não é a classificação (§8.5, com
 * desempate), que é outro assunto. Cópia antes de ordenar para não mutar a
 * entrada; sort estável preserva a ordem recebida em empates. Estruturado por
 * emoji, SEM monoespaçado.
 */
export function formatarResumoJogo(
  resultado: ResultadoJogo,
  palpitesComPontos: ReadonlyArray<PalpiteComPontos>,
  jogoLabel: string,
): string {
  const { esquerda, direita, placar } = resultado;

  const ordenados = [...palpitesComPontos].sort((a, b) => b.pontos - a.pontos);
  const linhasPalpites = ordenados.map((p) => {
    const nome = nomeExibicao(p, ordenados);
    const sufixo = p.pontos === 3 ? `${negrito("3 pts")} (cravou!)` : `${p.pontos} pt`;
    return `${EMOJI_POR_PONTOS[p.pontos]} ${nome} ${placarCompacto(p.palpite)} → ${sufixo}`;
  });

  return [
    `✅ ${negrito(`RESULTADO — ${jogoLabel}`)}`,
    `${esquerda.bandeira} ${esquerda.nome} ${placarPorExtenso(placar)} ${direita.nome} ${direita.bandeira}`,
    "",
    ...linhasPalpites,
  ].join("\n");
}
