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
  // Participante e Selecao são independentes entre si (não há FK ligando os dois).
  // Quando houver Palpite/Jogo/Rodada, a limpeza respeitará a ordem filhos → pais.
  await prisma.participante.deleteMany();
  await prisma.selecao.deleteMany();
}
