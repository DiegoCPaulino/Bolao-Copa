import { prisma } from "../../src/config/prisma.js";

/**
 * Apoio para os testes que tocam o banco. Reaproveitável pelas próximas fatias da
 * Fase 4 (cada uma terá testes de serviço sobre o mesmo banco de teste).
 */

export { prisma };

/** O banco de teste está acessível? Decide se a suíte de integração roda ou pula. */
export async function bancoDisponivel(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
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
