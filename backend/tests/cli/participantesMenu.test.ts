import * as prompts from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { menuParticipantes } from "../../src/cli/menus/participantesMenu.js";
import { bancoDisponivel, limparBanco, prisma } from "../integration/db.js";

/**
 * Teste LEVE do adaptador CLI (CLAUDE.md §10: o peso fica no serviço; aqui só
 * conferimos a fiação). Os prompts do inquirer exigem um terminal real, então os
 * mockamos para roteirizar a navegação — mas o serviço e o banco são REAIS, o que
 * prova o fio completo "menu → Zod → serviço → Postgres" (o que o pipe não alcança).
 */
vi.mock("@inquirer/prompts", () => ({
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));

const select = vi.mocked(prompts.select);
const input = vi.mocked(prompts.input);
const confirm = vi.mocked(prompts.confirm);

const temBanco = await bancoDisponivel();

describe.skipIf(!temBanco)("menuParticipantes (CLI leve, com Postgres)", () => {
  beforeEach(async () => {
    await limparBanco();
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("cadastra pelo menu e persiste no banco", async () => {
    // Submenu: Cadastrar → (após cadastrar) Voltar. Sem participantes, o passo do
    // indicador não chega a perguntar (não há candidatos), então só há 2 inputs.
    select.mockResolvedValueOnce("cadastrar").mockResolvedValueOnce("voltar");
    input.mockResolvedValueOnce("Maria").mockResolvedValueOnce("");
    confirm.mockResolvedValueOnce(false); // "Isento de pagamento?" → não

    await menuParticipantes();

    const todos = await prisma.participante.findMany();
    expect(todos.map((p) => p.nome)).toEqual(["Maria"]);
    expect(todos[0]?.status).toBe("PENDENTE");
    expect(todos[0]?.isento).toBe(false);
  });

  it("remove pelo menu após confirmação", async () => {
    const alvo = await prisma.participante.create({ data: { nome: "Ana" } });
    select
      .mockResolvedValueOnce("remover") // ação do submenu
      .mockResolvedValueOnce(alvo.id) // qual participante remover
      .mockResolvedValueOnce("voltar");
    confirm.mockResolvedValueOnce(true); // confirma a remoção

    await menuParticipantes();

    expect(await prisma.participante.findUnique({ where: { id: alvo.id } })).toBeNull();
  });
});
