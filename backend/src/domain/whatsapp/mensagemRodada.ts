import { negrito } from "./formato.js";
import type { LadoDoJogo } from "./jogo.js";

/** Um jogo da rodada para a mensagem de convite: posição + os dois lados. */
export type JogoDaRodada = {
  ordem: number;
  esquerda: LadoDoJogo;
  direita: LadoDoJogo;
};

/**
 * Mensagem da rodada (convite aos palpites) para o WhatsApp — funcional §13.1:
 *
 *   🏆 *BOLÃO COPA 2026 — 16-AVOS DE FINAL*
 *
 *   ⚽ *J1* 🇧🇷 Brasil × Argentina 🇦🇷
 *   ⚽ *J2* 🇫🇷 França × Espanha 🇪🇸
 *
 * Função PURA. Estruturada por emoji (⚽ + bandeiras) e pela referência *J{n}* em
 * texto — uniforme de 1 a 16 (alinhada com a tabela de palpites §13.2 e o resumo do
 * jogo §13.3, que já usam "J1/J2"). SEM monoespaçado nem padding: as bandeiras têm
 * largura variável e quebrariam qualquer alinhamento por espaços.
 *
 * O `n` é a `ordem` que já existe (não renumera nada). Sem linha de instrução: entre
 * o título e os confrontos não há texto.
 *
 * `faseLabel` é o título da fase como deve aparecer (ex.: "16-AVOS DE FINAL"); o
 * formatador o injeta no molde "BOLÃO COPA 2026 — <FASE>".
 */
export function formatarMensagemRodada(
  jogos: ReadonlyArray<JogoDaRodada>,
  faseLabel: string,
): string {
  const linhasJogos = jogos.map(
    (jogo) =>
      `⚽ ${negrito(`J${jogo.ordem}`)} ${jogo.esquerda.bandeira} ${jogo.esquerda.nome} × ${jogo.direita.nome} ${jogo.direita.bandeira}`,
  );

  return [`🏆 ${negrito(`BOLÃO COPA 2026 — ${faseLabel}`)}`, "", ...linhasJogos].join("\n");
}
