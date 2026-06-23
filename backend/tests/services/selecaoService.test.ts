import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as service from "../../src/services/selecaoService.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Teste leve do serviço de Catálogo (só leitura) — mesma estratégia de banco das
 * fatias anteriores (bolao_test + limpeza entre casos; pula sem banco). Garante o
 * contrato que a fatia de Rodadas vai reusar: listagem ordenada, com nome + bandeira.
 */
const temBanco = await bancoDisponivel();
if (!temBanco) {
  console.warn(
    "[integração] banco indisponível — testes de catálogo PULADOS. Rode `npm run test:db`.",
  );
}

describe.skipIf(!temBanco)("selecaoService (integração com Postgres)", () => {
  beforeEach(limparBanco);
  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it("lista as seleções do catálogo ordenadas por nome, com bandeira", async () => {
    await prisma.selecao.createMany({
      data: [
        { nome: "Brasil", bandeira: "🇧🇷" },
        { nome: "Argentina", bandeira: "🇦🇷" },
        { nome: "Catar", bandeira: "🇶🇦" },
      ],
    });

    const lista = await service.listarSelecoes();
    expect(lista.map((s) => s.nome)).toEqual(["Argentina", "Brasil", "Catar"]);
    expect(lista[0]?.bandeira).toBe("🇦🇷");
  });

  it("devolve vazio quando o catálogo está vazio", async () => {
    expect(await service.listarSelecoes()).toEqual([]);
  });
});
