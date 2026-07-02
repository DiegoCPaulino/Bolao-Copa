import { describe, expect, it } from "vitest";
import { participantesSemPalpite } from "../../src/domain/palpites.js";

// Participante com um campo extra (nome) para também provar que a função
// devolve os PRÓPRIOS objetos de entrada, sem achatá-los para só { id }.
const part = (id: string) => ({ id, nome: `nome-${id}` });
const ids = (lista: ReadonlyArray<{ id: string }>) => lista.map((p) => p.id);

describe("participantesSemPalpite (funcional §8.4, §12.8)", () => {
  // Jogos da rodada sob análise. "j9" é de OUTRA rodada, usado nos contraexemplos.
  const jogosDaRodada = ["j1", "j2"] as const;

  it("ninguém palpitou → todos faltam", () => {
    const participantes = [part("A"), part("B")];
    const faltam = participantesSemPalpite(jogosDaRodada, participantes, []);
    expect(ids(faltam)).toEqual(["A", "B"]);
  });

  it("todos palpitaram → lista vazia", () => {
    const participantes = [part("A"), part("B")];
    const palpites = [
      { participanteId: "A", jogoId: "j1" },
      { participanteId: "B", jogoId: "j2" },
    ];
    expect(participantesSemPalpite(jogosDaRodada, participantes, palpites)).toEqual([]);
  });

  it("palpite parcial conta como 'palpitou' (regra binária)", () => {
    // A palpitou só j1 (faltando j2). Pela decisão de domínio, isso NÃO é falta:
    // basta ter ao menos um palpite na rodada.
    const palpites = [{ participanteId: "A", jogoId: "j1" }];
    expect(participantesSemPalpite(jogosDaRodada, [part("A")], palpites)).toEqual([]);
  });

  it("palpite de OUTRA rodada não conta", () => {
    // A só palpitou em j9, que não pertence a esta rodada → falta nesta rodada.
    const palpites = [{ participanteId: "A", jogoId: "j9" }];
    expect(ids(participantesSemPalpite(jogosDaRodada, [part("A")], palpites))).toEqual(["A"]);
  });

  it("POR JOGO (jogoIds=[X]): quem palpitou OUTRO jogo, mas não o X, falta em X", () => {
    // A palpitou só j1; B palpitou só j2. Analisando SÓ j1, B é pendente de j1
    // (mesmo tendo palpitado a rodada) — a diferença-chave vs. o binário por-rodada.
    const participantes = [part("A"), part("B")];
    const palpites = [
      { participanteId: "A", jogoId: "j1" },
      { participanteId: "B", jogoId: "j2" },
    ];
    expect(ids(participantesSemPalpite(["j1"], participantes, palpites))).toEqual(["B"]);
    expect(ids(participantesSemPalpite(["j2"], participantes, palpites))).toEqual(["A"]);
  });

  it("caso misto", () => {
    const participantes = [part("A"), part("B"), part("C"), part("D")];
    const palpites = [
      { participanteId: "A", jogoId: "j1" }, // palpitou na rodada
      { participanteId: "C", jogoId: "j9" }, // só palpitou em outra rodada
      { participanteId: "D", jogoId: "j1" }, // palpitou na rodada (parcial)
      { participanteId: "D", jogoId: "j2" },
    ];
    const faltam = participantesSemPalpite(jogosDaRodada, participantes, palpites);
    expect(ids(faltam)).toEqual(["B", "C"]);
    // Preserva o objeto de entrada (não achata para { id }).
    expect(faltam).toContainEqual({ id: "B", nome: "nome-B" });
  });
});
