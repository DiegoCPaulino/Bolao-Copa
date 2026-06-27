/**
 * Smoke test das rotas GRANULARES de rodada/jogo contra o SERVIDOR REAL (:3000).
 * Substitui o teste manual no Insomnia: um comando, leitura ✓/✗ + status HTTP por
 * passo, e exit ≠ 0 se algo falhar.
 *
 * Pré-requisito: o servidor no ar (`npm run dev`) e o catálogo populado (`npm run db:seed`).
 *
 * Como rodar:
 *   npm run smoke:rodadas                  # pede a senha (entrada oculta)
 *   SMOKE_SENHA=xxxx npm run smoke:rodadas # senha por env (sem prompt)
 *   SMOKE_URL=http://host:porta npm run smoke:rodadas  # outro alvo
 *
 * A senha NÃO vem do `.env` (lá mora só o HASH, por design — CLAUDE.md §3.8): é
 * informada na hora. Limpeza: ao final remove a rodada de teste (e seus jogos) via
 * Prisma — não há rota de apagar rodada, e não se deixa lixo no banco real.
 */
import { password } from "@inquirer/prompts";
import { prisma } from "../src/config/prisma.js";

const BASE = process.env.SMOKE_URL ?? "http://localhost:3000";
const FASE = "DEZESSEIS_AVOS"; // qualquer fase serve; a rodada de teste é removida no fim

type Selecao = { id: string; nome: string };
type Jogo = {
  id: string;
  ordem: number;
  selecaoEsquerda?: { nome: string };
  selecaoDireita?: { nome: string };
};
type Rodada = { id: string; estado: string; jogos: Jogo[] };

let cookie = "";
let falhou = false;

/** Imprime um passo com ✓/✗ + status; marca falha global. Devolve o `sucesso`. */
function passo(nome: string, sucesso: boolean, status: number | string, extra = ""): boolean {
  console.log(`  ${sucesso ? "✓" : "✗"} [${status}] ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!sucesso) falhou = true;
  return sucesso;
}

/** Requisição autenticada (reusa o cookie de sessão). Devolve status + corpo tipado. */
async function req<T>(
  metodo: string,
  caminho: string,
  corpo?: unknown,
): Promise<{ status: number; json: T }> {
  const res = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { cookie } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await res.text();
  return { status: res.status, json: (texto ? JSON.parse(texto) : null) as T };
}

function imprimirJogos(rodada: Rodada | null): void {
  for (const j of rodada?.jogos ?? []) {
    console.log(`      J${j.ordem}: ${j.selecaoEsquerda?.nome} x ${j.selecaoDireita?.nome}`);
  }
}

async function main(): Promise<void> {
  console.log(`\n🔥 Smoke — rodadas/jogos granulares @ ${BASE}\n`);

  // 1) Login — a senha vem do env SMOKE_SENHA ou de um prompt oculto (nunca do .env).
  const senha = process.env.SMOKE_SENHA ?? (await password({ message: "Senha do organizador:" }));
  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senha }),
  });
  const setCookie = login.headers.getSetCookie().find((c) => c.startsWith("bolao_sessao="));
  cookie = setCookie ? (setCookie.split(";")[0] ?? "") : "";
  if (!passo("POST /auth/login", login.status === 200 && cookie !== "", login.status)) return;

  // 0) Catálogo: precisa de >= 4 seleções para montar 2 jogos distintos.
  const sel = await req<Selecao[]>("GET", "/selecoes");
  const selecoes = Array.isArray(sel.json) ? sel.json : [];
  if (
    !passo(
      "GET /selecoes (>= 4)",
      sel.status === 200 && selecoes.length >= 4,
      sel.status,
      `${selecoes.length} no catálogo`,
    )
  ) {
    console.log("\n  (catálogo insuficiente — rode `npm run db:seed`)");
    return;
  }
  const [a, b, c, d] = selecoes as [Selecao, Selecao, Selecao, Selecao];

  let rodadaId = "";
  try {
    // 2) Criar rodada VAZIA (jogos ausente → 201).
    const criada = await req<Rodada>("POST", "/rodadas", { fase: FASE });
    rodadaId = criada.json?.id ?? "";
    if (
      !passo(
        "POST /rodadas (vazia)",
        criada.status === 201 && criada.json?.jogos?.length === 0,
        criada.status,
        `id=${rodadaId.slice(0, 8)}…`,
      )
    ) {
      return;
    }

    // 3) Adicionar 2 jogos.
    const ad1 = await req<Rodada>("POST", `/rodadas/${rodadaId}/jogos`, {
      selecaoEsquerdaId: a.id,
      selecaoDireitaId: b.id,
    });
    passo(
      "POST /rodadas/:id/jogos #1",
      ad1.status === 201 && ad1.json?.jogos?.length === 1,
      ad1.status,
      `${a.nome} x ${b.nome}`,
    );
    const ad2 = await req<Rodada>("POST", `/rodadas/${rodadaId}/jogos`, {
      selecaoEsquerdaId: c.id,
      selecaoDireitaId: d.id,
    });
    passo(
      "POST /rodadas/:id/jogos #2",
      ad2.status === 201 && ad2.json?.jogos?.length === 2,
      ad2.status,
      `${c.nome} x ${d.nome}`,
    );

    const jogos = ad2.json?.jogos ?? [];
    const j1Id = jogos[0]?.id ?? "";
    const j2Id = jogos[1]?.id ?? "";

    // 4) Editar o 1º jogo (troca a direita).
    const ed = await req<Rodada>("PUT", `/jogos/${j1Id}`, {
      selecaoEsquerdaId: a.id,
      selecaoDireitaId: c.id,
    });
    passo("PUT /jogos/:id (editar #1)", ed.status === 200, ed.status, `${a.nome} x ${c.nome}`);

    // 5) Detalhar (imprime os jogos).
    const det1 = await req<Rodada>("GET", `/rodadas/${rodadaId}`);
    passo("GET /rodadas/:id (detalhar)", det1.status === 200, det1.status);
    imprimirJogos(det1.json);

    // 6) Remover 1 jogo.
    const rem = await req<Rodada>("DELETE", `/jogos/${j2Id}`);
    passo(
      "DELETE /jogos/:id (remover #2)",
      rem.status === 200 && rem.json?.jogos?.length === 1,
      rem.status,
    );

    // 7) Avançar o estado (ciclo de vida — guia, sem trava).
    const est = await req<Rodada>("PUT", `/rodadas/${rodadaId}/estado`, {
      estado: "PALPITES_ABERTOS",
    });
    passo(
      "PUT /rodadas/:id/estado",
      est.status === 200 && est.json?.estado === "PALPITES_ABERTOS",
      est.status,
      est.json?.estado,
    );

    // 8) Detalhar de novo.
    const det2 = await req<Rodada>("GET", `/rodadas/${rodadaId}`);
    passo(
      "GET /rodadas/:id (de novo)",
      det2.status === 200 && det2.json?.jogos?.length === 1,
      det2.status,
    );
    imprimirJogos(det2.json);
  } finally {
    // Limpeza: sem rota de apagar rodada, remove a de teste (e seus jogos) via Prisma.
    // No `finally` para limpar mesmo se um passo falhou no meio.
    if (rodadaId) {
      try {
        await prisma.jogo.deleteMany({ where: { rodadaId } });
        await prisma.rodada.delete({ where: { id: rodadaId } });
        passo("limpeza (remove a rodada de teste)", true, "db");
      } catch (e) {
        passo("limpeza (remove a rodada de teste)", false, "db", (e as Error).message);
      }
    }
  }
}

main()
  .catch((e: unknown) => {
    falhou = true;
    const semServidor =
      String((e as { cause?: { code?: string } })?.cause?.code) === "ECONNREFUSED" ||
      /ECONNREFUSED|fetch failed/i.test(String(e));
    const msg = semServidor
      ? `servidor não respondeu em ${BASE} — rode \`npm run dev\` (backend) e tente de novo`
      : ((e as Error)?.message ?? String(e));
    console.error(`\n  ✗ erro: ${msg}`);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
    console.log(falhou ? "\n❌ SMOKE FALHOU\n" : "\n✅ SMOKE OK\n");
    process.exit(falhou ? 1 : 0);
  });
