import { describe, expect, it } from "vitest";
import {
  ordenarClassificacao,
  type ParticipanteClassificavel,
} from "../../src/domain/classificacao.js";

// Construtor de fixtures legível. Mantemos os dados CONSISTENTES com o sistema
// 3/1/0: pontos = 2×exatos + certos, e certos >= exatos (todo exato pontua >= 1).
const p = (
  id: string,
  pontos: number,
  placaresExatos: number,
  resultadosCertos: number,
): ParticipanteClassificavel => ({ id, pontos, placaresExatos, resultadosCertos });

const ids = (lista: ReadonlyArray<ParticipanteClassificavel>) => lista.map((x) => x.id);

describe("ordenarClassificacao (desempate em cascata — funcional §8.5)", () => {
  it("pontuação domina sobre placares exatos", () => {
    // A tem MAIS exatos, mas MENOS pontos que B → B na frente.
    const a = p("A", 9, 3, 3); // 2×3 + 3 = 9
    const b = p("B", 10, 1, 8); // 2×1 + 8 = 10
    expect(ids(ordenarClassificacao([a, b]))).toEqual(["B", "A"]);
  });

  it("placares exatos desempatam antes de resultados certos (bug clássico)", () => {
    // Mesmos pontos. A tem MAIS exatos porém MENOS certos que B.
    // Pela cascata correta, A vai na frente (critério 2 antes do 3).
    // Uma implementação que comparasse 'certos' antes de 'exatos' devolveria
    // [B, A] — este teste pega exatamente esse erro.
    const a = p("A", 6, 2, 2); // 2×2 + 2 = 6
    const b = p("B", 6, 1, 4); // 2×1 + 4 = 6
    expect(ids(ordenarClassificacao([b, a]))).toEqual(["A", "B"]);
  });

  it("resultados certos desempatam no 3º critério (cascata completa §8.5)", () => {
    // Cenário SINTÉTICO: mesmos pontos E mesmos exatos, só os certos diferem. É
    // redundante no sistema 3/1/0 (certos = pontos − 2×exatos), mas prova que o 3º
    // nível da cascata funciona — robustez a uma futura mudança na tabela de pontos.
    const a = p("A", 5, 1, 3);
    const b = p("B", 5, 1, 2);
    expect(ids(ordenarClassificacao([b, a]))).toEqual(["A", "B"]); // A tem mais certos
  });

  it("empate total mantém a ordem de entrada (sort estável)", () => {
    const primeiro = p("primeiro", 7, 2, 3); // 2×2 + 3 = 7
    const segundo = p("segundo", 7, 2, 3); // idêntico nos três critérios
    expect(ids(ordenarClassificacao([primeiro, segundo]))).toEqual(["primeiro", "segundo"]);
    // E na ordem inversa de entrada, prova que a estabilidade não inventa ordem.
    expect(ids(ordenarClassificacao([segundo, primeiro]))).toEqual(["segundo", "primeiro"]);
  });

  it("ordena corretamente uma lista desordenada de vários participantes", () => {
    const p1 = p("P1", 15, 5, 5); // topo
    const p2 = p("P2", 12, 4, 4);
    const p3 = p("P3", 10, 3, 4); // empata em pontos com P4, mais exatos → na frente
    const p4 = p("P4", 10, 2, 6);
    const p5 = p("P5", 8, 1, 6);
    const desordenada = [p4, p1, p5, p2, p3];
    expect(ids(ordenarClassificacao(desordenada))).toEqual(["P1", "P2", "P3", "P4", "P5"]);
  });

  it("não muta o array de entrada (função pura)", () => {
    const entrada = [p("B", 10, 1, 8), p("A", 9, 3, 3)];
    const ordemOriginal = [...entrada];
    ordenarClassificacao(entrada);
    expect(entrada).toEqual(ordemOriginal);
  });
});
