import { z } from "zod";

/**
 * Validação do ambiente no BOOT do servidor HTTP (Entrega 2) — arquitetura §4.8/§10;
 * CLAUDE.md §8.6.
 *
 * Por que validar no boot: faltar uma variável essencial deve DERRUBAR o processo na
 * largada, com mensagem clara — nunca estourar no meio de uma requisição, quando já
 * é tarde e o erro vem disfarçado de bug. Aqui o `.env` (carregado pelo `node
 * --env-file` do script `dev`) vira um objeto tipado e seguro.
 *
 * Escopo desta fatia (6.1): só o HTTP usa este módulo — o adaptador de terminal
 * (Entrega 1) segue lendo `DATABASE_URL` direto e não importa daqui, então nada do
 * CLI muda. `SESSION_SECRET` entra na 6.2 (auth) — o slot já está documentado abaixo
 * para o schema crescer no mesmo lugar.
 */
const envSchema = z.object({
  // String de conexão do Postgres. Não usamos `.url()` de propósito (variações de API
  // entre versões do Zod): basta exigir o esquema postgres, que é o que o Prisma aceita.
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL é obrigatória (string de conexão do Postgres).")
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "DATABASE_URL deve ser uma URL postgres:// ou postgresql://.",
    }),

  // Porta do servidor Fastify. `coerce` porque toda variável de ambiente é string;
  // tem default de desenvolvimento para `npm run dev` subir sem configuração extra.
  PORT: z.coerce.number().int().positive().default(3000),

  // SESSION_SECRET: segredo da sessão (cookie httpOnly) — entra na Fatia 6.2 (auth).
  // Quando chegar, será obrigatório e com tamanho mínimo, ex.:
  //   SESSION_SECRET: z.string().min(32, "SESSION_SECRET deve ter ao menos 32 chars."),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Lê e valida o ambiente. Em caso de erro, imprime o que faltou e ABORTA (exit 1) —
 * é a borda do processo, então o efeito colateral é legítimo aqui (não no núcleo).
 */
export function carregarEnv(): Env {
  const resultado = envSchema.safeParse(process.env);
  if (!resultado.success) {
    console.error("❌ Configuração inválida — confira o seu .env:");
    for (const issue of resultado.error.issues) {
      console.error(`   • ${issue.path.join(".") || "(raiz)"}: ${issue.message}`);
    }
    process.exit(1);
  }
  return resultado.data;
}
