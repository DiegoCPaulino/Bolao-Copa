import { keycap, negrito } from "./formato.js";
import type { LadoDoJogo } from "./jogo.js";

/** Um jogo da rodada para a mensagem de convite: posição + os dois lados. */
export type JogoDaRodada = {
  ordem: number;
  esquerda: LadoDoJogo;
  direita: LadoDoJogo;
};

/**
 * Mensagem da rodada (convite aos palpites) para o WhatsApp — funcional §12.1:
 *
 *   🏆 *BOLÃO COPA 2026 — OITAVAS DE FINAL*
 *
 *   Mandem os palpites (placar dos 90 min) 👇
 *
 *   1️⃣ 🇧🇷 Brasil x Argentina 🇦🇷
 *   2️⃣ 🇫🇷 França x Espanha 🇪🇸
 *
 * Função PURA. Estruturada por emoji (keycap + bandeiras), SEM monoespaçado nem
 * padding: as bandeiras na frente têm largura variável e quebrariam qualquer
 * alinhamento por espaços (lição da §12.4/§12.5).
 *
 * `faseLabel` é o título da fase como deve aparecer (ex.: "OITAVAS DE FINAL"); o
 * formatador o injeta no molde "BOLÃO COPA 2026 — <FASE>".
 */
export function formatarMensagemRodada(
  jogos: ReadonlyArray<JogoDaRodada>,
  faseLabel: string,
): string {
  const linhasJogos = jogos.map(
    (jogo) =>
      `${keycap(jogo.ordem)} ${jogo.esquerda.bandeira} ${jogo.esquerda.nome} x ${jogo.direita.nome} ${jogo.direita.bandeira}`,
  );

  return [
    `🏆 ${negrito(`BOLÃO COPA 2026 — ${faseLabel}`)}`,
    "",
    "Mandem os palpites (placar dos 90 min) 👇",
    "",
    ...linhasJogos,
  ].join("\n");
}
