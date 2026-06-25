import { prisma } from "../../src/config/prisma.js";

/**
 * Apoio para os testes que tocam o banco. Reaproveitável pelas próximas fatias da
 * Fase 4 (cada uma terá testes de serviço sobre o mesmo banco de teste).
 */

export { prisma };

/**
 * O banco de teste está acessível? Decide se a suíte de integração roda ou pula.
 *
 * À PROVA DE VERDE-FALSO: no CI (`process.env.CI`, que o GitHub Actions seta como
 * "true"), banco indisponível é FALHA DURA — lança em vez de devolver `false`, então
 * a suíte de integração nunca pula silenciosamente lá (o `describe.skipIf` jamais vê
 * `true`). Localmente, sem banco, devolve `false` e os testes de integração se
 * auto-pulam — conveniência de dev (rode `npm run test:db` com o Postgres no ar).
 */
export async function bancoDisponivel(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    if (process.env.CI) {
      throw new Error(
        "Banco de teste indisponível no CI: a suíte completa exige Postgres. " +
          "Confira o service `postgres` e a DATABASE_URL (*_test) do workflow.",
      );
    }
    return false;
  }
}

/** Zera as tabelas tocadas pelos testes, isolando cada caso do anterior. */
export async function limparBanco(): Promise<void> {
  // Ordem filhos → pais por causa das FKs (Jogo→Rodada/Selecao são RESTRICT): jogos
  // antes de rodadas e seleções. Palpite vem primeiro (ainda sem fatia, mas mantém a
  // ordem correta). Participante é independente.
  await prisma.palpite.deleteMany();
  await prisma.jogo.deleteMany();
  await prisma.rodada.deleteMany();
  await prisma.participante.deleteMany();
  await prisma.selecao.deleteMany();
}
