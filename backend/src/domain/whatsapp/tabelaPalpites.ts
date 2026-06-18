import type { Placar } from "../pontuacao.js";
import { monoBloco, negrito, placarCompacto, preencherDireita } from "./formato.js";
import { nomeExibicao, type ParticipanteExibivel } from "./nomeExibicao.js";

/** Um palpite na tabela: a qual jogo (ordem) e o placar palpitado. */
export type PalpiteNaTabela = {
  jogo: number;
  placar: Placar;
};

/** Uma linha da tabela: o participante e seus palpites nos jogos da rodada. */
export type LinhaTabelaPalpites = ParticipanteExibivel & {
  palpites: ReadonlyArray<PalpiteNaTabela>;
};

/**
 * Tabela de palpites para o WhatsApp — funcional §12.2:
 *
 *   📋 *PALPITES — OITAVAS*
 *
 *   ```
 *   Diego  J1 2x1 | J2 0x0 | J3 1x2 | J4 3x1
 *   Lucas  J1 1x1 | J2 2x0 | J3 1x1 | J4 2x2
 *   Ana    J1 0x0 | J2 1x1 | J3 2x2 | J4 1x0
 *   ```
 *
 * Função PURA. Recebe, por participante, os palpites já nos jogos da rodada;
 * não busca nem calcula (CLAUDE.md §3.3).
 *
 * CONFLITO do exemplo do §12.2 e DECISÃO (§15.4): o molde mostra nomes em
 * *negrito* E colunas alinhadas — impossível ter os dois no WhatsApp (negrito
 * NÃO renderiza dentro de bloco monoespaçado, e alinhar exige monoespaçado).
 * Priorizamos o ALINHAMENTO (o valor de uma tabela é ser escaneável): usamos
 * `monoBloco`, preenchemos o nome para alinhar a coluna J1 e deixamos os nomes
 * SEM negrito. O header em negrito fica FORA do bloco.
 *
 * EDGE (documentado): em 16-avos (16 jogos) a linha fica longa e pode quebrar no
 * celular; o refino de layout fica para o polimento. Aqui, fiéis ao §12.2.
 */
export function formatarTabelaPalpites(
  linhas: ReadonlyArray<LinhaTabelaPalpites>,
  faseLabel: string,
): string {
  const preparadas = linhas.map((linha) => ({
    nome: nomeExibicao(linha, linhas),
    colunas: linha.palpites.map((p) => `J${p.jogo} ${placarCompacto(p.placar)}`).join(" | "),
  }));

  const larguraNome = preparadas.reduce((max, x) => Math.max(max, x.nome.length), 0);
  const rows = preparadas.map((x) => `${preencherDireita(x.nome, larguraNome)}  ${x.colunas}`);

  const header = `📋 ${negrito(`PALPITES — ${faseLabel}`)}`;
  return `${header}\n\n${monoBloco(rows.join("\n"))}`;
}
