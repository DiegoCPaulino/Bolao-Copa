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
 * Escopo: só o HTTP usa este módulo — o adaptador de terminal (Entrega 1) segue
 * lendo `DATABASE_URL` direto e não importa daqui, então nada do CLI muda.
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

  // Porta do servidor Fastify. `coerce` porque toda variável de ambiente é string.
  // O PaaS (Render) injeta a PORT; em dev cai no default 3000. O `preprocess` trata
  // STRING VAZIA como ausente: o Render pode injetar PORT="" e `Number("")` é 0, que
  // reprovava em `.positive()` ("Too small: expected number to be >0") — só o
  // `.default` cobre `undefined`, não "". Normalizando ""/espaços → undefined, o
  // default volta a valer. Porta numérica válida (ex.: "10000") passa intacta.
  PORT: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().int().positive().default(3000),
  ),

  // Define o cookie Secure (só em produção/HTTPS) — ver server.ts. Em dev local sem
  // TLS, Secure travaria o login, então fica `false` (default development).
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Origem do front liberada pelo CORS (Fase 7). Default = Vite em dev; em produção
  // (Fase 9) basta trocar a env. NUNCA "*": incompatível com o cookie de sessão
  // (credentials). Não é "essencial" (tem default), então não derruba o boot se faltar.
  FRONTEND_ORIGIN: z.string().min(1).default("http://localhost:5173"),

  // Auth single-user (Fatia 6.2). Segredo de onde a sessão deriva sua chave de
  // cifragem (secure-session): mínimo de 32 chars por segurança.
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET deve ter ao menos 32 caracteres."),

  // Hash argon2id da senha do organizador (gerado por `npm run gerar-hash`). A senha
  // em si NUNCA fica no .env — só o hash. Não há tabela de usuários (CLAUDE.md §3.8).
  ORGANIZADOR_SENHA_HASH: z
    .string()
    .min(1, "ORGANIZADOR_SENHA_HASH é obrigatória.")
    .refine((v) => v.startsWith("$argon2"), {
      message: "ORGANIZADOR_SENHA_HASH deve ser um hash argon2 (rode `npm run gerar-hash`).",
    }),

  // Servir o SPA buildado no MESMO serviço (Fase 9). Explícito "true"/"false" (não
  // `coerce.boolean`, que trataria qualquer string não-vazia — inclusive "false" — como
  // true). Independente do NODE_ENV: dá pra testar same-origin local sobre http (com
  // cookieSecure=false). Ausente = false (dev usa o Vite).
  SERVIR_FRONT: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Diretório do build do front (opcional). Ausente → o app resolve ../frontend/dist a
  // partir do cwd. Serve pra apontar outro caminho no empacotamento de produção.
  FRONT_DIST: z.string().min(1).optional(),
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
