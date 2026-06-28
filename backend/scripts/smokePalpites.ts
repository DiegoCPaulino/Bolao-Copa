/**
 * Smoke das rotas da Rodada-detalhe (8.4-A) contra o SERVIDOR REAL (:3000). Espelha o
 * smoke:rodadas — um comando, ✓/✗ + status HTTP por passo, exit ≠ 0 em falha.
 *
 * Pré-requisito: servidor no ar (`npm run dev`) e catálogo populado (`npm run db:seed`).
 *
 * Como rodar:
 *   npm run smoke:palpites                  # pede a senha (entrada oculta)
 *   SMOKE_SENHA=xxxx npm run smoke:palpites # senha por env (sem prompt)
 *   SMOKE_URL=http://host:porta npm run smoke:palpites
 *
 * A senha NÃO vem do `.env` (lá mora só o HASH — §3.8): informada na hora. Limpeza no
 * `finally`: remove palpites → jogos → rodada → participante de teste (net-zero, não
 * toca dados reais).
 */
import { password } from "@inquirer/prompts";
import { prisma } from "../src/config/prisma.js";

const BASE = process.env.SMOKE_URL ?? "http://localhost:3000";

type Selecao = { id: string; nome: string };
type Rodada = { id: string; jogos: { id: string; ordem: number }[] };
type Palpite = { jogoId: string; golsEsquerda: number; golsDireita: number };
type LinhaPontuacao = { id: string; nome: string; pontos: number; placaresExatos: number };
type ResumoJogo = {
  resultado: { golsEsquerda: number; golsDireita: number };
  palpites: { nome: string; pontos: number }[];
};
type LinhaTabela = {
  nome: string;
  palpites: { jogoOrdem: number; golsEsquerda: number; golsDireita: number }[];
};

let cookie = "";
let falhou = false;

function passo(nome: string, sucesso: boolean, status: number | string, extra = ""): boolean {
  console.log(`  ${sucesso ? "✓" : "✗"} [${status}] ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!sucesso) falhou = true;
  return sucesso;
}

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

async function main(): Promise<void> {
  console.log(`\n🔥 Smoke — palpites/pontuação (Rodada-detalhe) @ ${BASE}\n`);

  const senha = process.env.SMOKE_SENHA ?? (await password({ message: "Senha do organizador:" }));
  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senha }),
  });
  const setCookie = login.headers.getSetCookie().find((c) => c.startsWith("bolao_sessao="));
  cookie = setCookie ? (setCookie.split(";")[0] ?? "") : "";
  if (!passo("POST /auth/login", login.status === 200 && cookie !== "", login.status)) return;

  const sel = await req<Selecao[]>("GET", "/selecoes");
  const selecoes = Array.isArray(sel.json) ? sel.json : [];
  if (!passo("GET /selecoes (>= 2)", sel.status === 200 && selecoes.length >= 2, sel.status)) {
    console.log("\n  (catálogo insuficiente — rode `npm run db:seed`)");
    return;
  }
  const [a, b] = selecoes as [Selecao, Selecao];

  let rodadaId = "";
  let participanteId = "";
  try {
    // Monta rodada de 1 jogo (atômico) + participante descartável.
    const criada = await req<Rodada>("POST", "/rodadas", {
      fase: "DEZESSEIS_AVOS",
      jogos: [{ selecaoEsquerdaId: a.id, selecaoDireitaId: b.id }],
    });
    rodadaId = criada.json?.id ?? "";
    const jogoId = criada.json?.jogos?.[0]?.id ?? "";
    if (!passo("POST /rodadas (1 jogo)", criada.status === 201 && jogoId !== "", criada.status))
      return;

    const part = await prisma.participante.create({ data: { nome: "Smoke Palpiteiro" } });
    participanteId = part.id;
    passo("cria participante de teste", true, "db", part.nome);

    // PUT palpite SINGULAR (cravou 2x1).
    const reg = await req<Palpite>(
      "PUT",
      `/participantes/${participanteId}/rodadas/${rodadaId}/jogos/${jogoId}/palpite`,
      { golsEsquerda: 2, golsDireita: 1 },
    );
    passo(
      "PUT palpite singular",
      reg.status === 200 && reg.json?.golsEsquerda === 2 && reg.json?.golsDireita === 1,
      reg.status,
      "2x1",
    );

    // GET palpites-do-participante (confirma o que gravou).
    const lido = await req<Palpite[]>(
      "GET",
      `/participantes/${participanteId}/rodadas/${rodadaId}/palpites`,
    );
    passo(
      "GET palpites-do-participante",
      lido.status === 200 && lido.json?.length === 1 && lido.json[0]?.golsEsquerda === 2,
      lido.status,
      `${lido.json?.length ?? 0} palpite(s)`,
    );

    // PUT resultado (mesmo placar → cravou → 3 pts).
    const resu = await req<unknown>("PUT", `/jogos/${jogoId}/resultado`, {
      golsEsquerda: 2,
      golsDireita: 1,
    });
    passo("PUT /jogos/:id/resultado", resu.status === 200, resu.status, "2x1");

    // GET pontuação da rodada (recalculada na leitura).
    const pont = await req<LinhaPontuacao[]>("GET", `/rodadas/${rodadaId}/pontuacao`);
    const linha = pont.json?.find((l) => l.id === participanteId);
    passo(
      "GET /rodadas/:id/pontuacao",
      pont.status === 200 && linha?.pontos === 3 && linha?.placaresExatos === 1,
      pont.status,
      `${linha?.pontos ?? "?"} pts`,
    );

    // GET resumo do jogo (palpites + pontos).
    const resumo = await req<ResumoJogo>("GET", `/jogos/${jogoId}/resumo`);
    const meu = resumo.json?.palpites?.find((p) => p.nome === "Smoke Palpiteiro");
    passo("GET /jogos/:id/resumo", resumo.status === 200 && meu?.pontos === 3, resumo.status);

    // GET tabela de palpites (JSON).
    const tabela = await req<LinhaTabela[]>("GET", `/rodadas/${rodadaId}/tabela`);
    const minha = tabela.json?.find((l) => l.nome === "Smoke Palpiteiro");
    passo(
      "GET /rodadas/:id/tabela",
      tabela.status === 200 && minha?.palpites?.[0]?.golsEsquerda === 2,
      tabela.status,
    );
  } finally {
    // Limpeza (net-zero): palpites → jogos → rodada → participante de teste.
    try {
      if (rodadaId) {
        await prisma.palpite.deleteMany({ where: { jogo: { rodadaId } } });
        await prisma.jogo.deleteMany({ where: { rodadaId } });
        await prisma.rodada.delete({ where: { id: rodadaId } });
      }
      if (participanteId) await prisma.participante.delete({ where: { id: participanteId } });
      passo("limpeza (rodada + jogos + palpites + participante de teste)", true, "db");
    } catch (e) {
      passo("limpeza", false, "db", (e as Error).message);
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
