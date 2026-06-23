import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Backend roda em Node; sem DOM.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Carrega o ambiente de teste (.env.test) antes de qualquer módulo construir o
    // cliente Prisma. Vale para toda a suíte; os testes puros de domínio o ignoram.
    setupFiles: ["tests/integration/setup.ts"],
    // Os arquivos de integração compartilham UM banco de teste e limpam as tabelas
    // entre casos; rodá-los em paralelo faria um arquivo apagar os dados do outro.
    // A suíte é minúscula (~1s), então serializar os arquivos é o custo certo aqui.
    // (Quando crescer, a evolução natural é dar um schema por arquivo.)
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
