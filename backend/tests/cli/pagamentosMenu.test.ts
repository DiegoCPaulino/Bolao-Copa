import * as prompts from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { menuPagamentos } from "../../src/cli/menus/pagamentosMenu.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Teste LEVE do adaptador de Pagamentos (peso fica no serviço). Mocka os prompts
 * (que exigem TTY) e usa serviço + banco REAIS — prova o fio "menu → serviço →
 * Postgres" e que a exportação imprime o text/plain do formatador (§12.7).
 */
vi.mock("@inquirer/prompts", () => ({
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));

const select = vi.mocked(prompts.select);
const temBanco = await bancoDisponivel();

describe.skipIf(!temBanco)("menuPagamentos (CLI leve, com Postgres)", () => {
  beforeEach(async () => {
    await limparBanco();
    select.mockReset();
  });

  it("alterna status pelo menu e persiste", async () => {
    const ana = await prisma.participante.create({ data: { nome: "Ana" } }); // PENDENTE
    select
      .mockResolvedValueOnce("alternar")
      .mockResolvedValueOnce(ana.id)
      .mockResolvedValueOnce("voltar");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await menuPagamentos();
    log.mockRestore();

    expect((await prisma.participante.findUnique({ where: { id: ana.id } }))?.status).toBe("PAGO");
  });

  it("exporta o texto §12.7 pronto para o WhatsApp", async () => {
    await prisma.participante.create({ data: { nome: "Ana", status: "PAGO" } });
    select.mockResolvedValueOnce("exportar").mockResolvedValueOnce("voltar");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await menuPagamentos();
    const saida = log.mock.calls.map((c) => c.join(" ")).join("\n");
    log.mockRestore();

    expect(saida).toContain("*PAGAMENTOS*");
    expect(saida).toContain("Esperado:");
  });
});
