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
  // Só Participante entra em jogo nesta fatia. Quando houver Palpite/Jogo/Rodada,
  // a limpeza respeitará a ordem filhos → pais (FKs).
  await prisma.participante.deleteMany();
}
