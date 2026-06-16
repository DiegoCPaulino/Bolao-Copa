# CLAUDE.md — Guia operacional do projeto (Bolão Copa do Mundo 2026)

> **Para quem lê este arquivo (você, Claude Code):** este é o briefing permanente do
> projeto. Leia-o por inteiro antes de escrever qualquer linha de código. Ele não
> substitui os três documentos-fonte — ele os **destila em regras de trabalho** e aponta
> para onde está a verdade detalhada de cada assunto. Quando este arquivo e os documentos
> divergirem, **os documentos-fonte vencem** (a precedência está na seção 2).

---

## 0. Natureza do projeto e postura de qualidade

Este **não é um trabalho acadêmico descartável**. É um sistema real, de uso pessoal do
organizador de um bolão, que vai rodar por semanas durante a Copa de 2026, com ~63
participantes dependendo dos números estarem certos. Portanto:

- **Fazemos do jeito certo, não do jeito rápido.** Não há prazo de entrega artificial nem
  professor para impressionar: há um produto que precisa ser **correto, fácil de manter e
  fácil de evoluir**. Toda decisão é tomada pensando em quem vai ler e mexer no código
  daqui a três meses (provavelmente o próprio autor, que terá esquecido os detalhes).
- **Clean Code e boas práticas não são enfeite — são o requisito.** Código legível,
  funções pequenas e com responsabilidade única, nomes que explicam intenção, ausência de
  duplicação, testes onde mora o risco. Ver seção 8.
- **Maturidade técnica aqui é saber o que NÃO fazer.** O sistema é pequeno em escala
  (seção 4 do doc de arquitetura). Trazer complexidade que o problema não pede é o erro
  mais provável. As anti-decisões estão na seção 14 e são para serem respeitadas.
- **O objetivo também é aprendizado.** O autor é estudante de ADS com foco em back-end
  (lógica, APIs, banco, arquitetura, infra, Linux, segurança). Logo, **explique o porquê
  das escolhas** ao codar — ver seção 15. Não basta funcionar; tem que ensinar.

---

## 1. O projeto em uma página

**O que é:** aplicação web de **uso exclusivo do organizador** de um bolão de mata-mata da
Copa 2026. Centraliza rodadas, jogos, palpites, resultados, cálculo automático de
pontuação/classificação, controle de pagamentos (com regra de desconto por indicação) e
**geração de textos prontos para colar no WhatsApp**.

**Modelo de uso — leia com atenção, isto molda tudo:**

- **Single-user.** Só o organizador faz login. **Participantes NÃO acessam o sistema** —
  eles existem apenas como registros. Toda comunicação com eles acontece no grupo de
  WhatsApp, e o organizador é a ponte (copia o texto gerado pelo sistema e cola no grupo).
- **Ciclo copiar/colar.** O sistema **gera texto**; o organizador cola no grupo, recebe de
  volta palpites/resultados e digita no sistema. O sistema **nunca envia mensagem
  automaticamente** nem **busca resultados sozinho**.
- **Escala minúscula.** ~63 participantes, 32 jogos, 5 rodadas. Teto absoluto de palpites
  no torneio inteiro ≈ **2.016 registros**. Sem concorrência, sem pico de tráfego.

**Escopo da competição:** todo o mata-mata, dos **16-avos à final** — 5 rodadas
sequenciais (16-avos → oitavas → quartas → semifinais → rodada final). A última rodada
reúne **3º lugar + final (2 jogos)**. Pontuação **acumulada** (pontos corridos). **Fora do
escopo: fase de grupos.**

**O requisito não-funcional nº 1** é **exportação fácil para o WhatsApp**. Isso não é
cosmético — é o produto. Tratar com primeira classe.

---

## 2. Documentos-fonte e precedência (a hierarquia da verdade)

O projeto tem três documentos. Eles vivem na raiz do repositório e são a **fonte de verdade**. Este `CLAUDE.md` é um resumo operacional — quando precisar do detalhe, vá à
fonte.

| Documento | Responde | Papel |
|---|---|---|
| `documentacao_oficial_bolao.md` (funcional, v7 — FINAL) | **O QUÊ** — escopo, regras de negócio, telas, artefatos | Fonte de verdade do **comportamento e das regras** |
| `documentacao_arquitetura_bolao.md` (arquitetura, v1) | **COMO** — stack, camadas, modelagem física, API, deploy, segurança | Fonte de verdade da **stack e da estrutura** |
| `documentacao_roteiro_desenvolvimento_bolao.md` (roteiro, v1) | **EM QUE ORDEM** — 10 fases de construção e o porquê de cada posição | Fonte de verdade da **sequência de execução** |

**Regra de precedência (decora isto):**

1. Para **comportamento / regra de negócio** → vale o **documento funcional**.
2. Para **stack / estrutura técnica** → vale o **documento de arquitetura**.
3. Para **ordem de construção** → vale o **documento de roteiro**.
4. Este `CLAUDE.md` **nunca redefine** regra nem stack; ele organiza e relembra. Se notar
   conflito entre este arquivo e um documento-fonte, **avise o autor** e siga o documento.

Se uma decisão necessária **não estiver em nenhum dos três**, **não invente**: pergunte ao
autor ou proponha explicitamente como decisão nova, deixando claro que está fora do que já
foi definido.

---

## 3. Princípios inegociáveis (as regras que nunca se quebram)

Estas são as restrições de maior risco do projeto. Violá-las quebra a arquitetura ou
introduz a classe de bug mais cara. Trate cada uma como uma trava.

### 3.1 Derivado NÃO se armazena

Pontuação, pontos por rodada, classificação, placares exatos, **valor a pagar**, totais de
pagamento (esperado/recebido/falta) e "quem ainda não palpitou" **são calculados sob
demanda** a partir dos dados crus (palpites + resultados + indicações). **Nunca viram
coluna no banco.** Com ~2 mil registros, recalcular tudo a cada requisição é instantâneo e
elimina a classe inteira de bugs de "derivado desatualizado".

> Se em algum momento você sentir vontade de criar uma coluna `pontos`, `valorAPagar` ou
> `posicao` — **pare**. Isso é derivado. A repetição de query se resolve **extraindo uma
> função**, não criando coluna. (Funcional §13; Arquitetura §5.4; Roteiro §2.5.)

### 3.2 A regra de negócio mora no domínio (funções puras)

O "cérebro" do sistema — cálculo de pontos, desempate, valor a pagar, "quem não palpitou"
— vive como **funções puras** em `domain/`, **sem dependência de Fastify, Prisma, HTTP ou
banco**. Se a rota, o repositório ou a tela começarem a calcular regra de negócio, **a
arquitetura furou**. Mova para uma função pura testada.

### 3.3 O texto do WhatsApp é gerado no BACK-END

A formatação dos artefatos do WhatsApp acontece no back-end, como **módulo de funções
puras** (`domain/whatsapp/`). O front-end **apenas recebe o texto pronto e copia** (via
Clipboard API). Nunca montar a string do WhatsApp na tela. Fonte única de verdade,
testável. (Arquitetura §4.9 / §5.3; Roteiro §2 e Fase 2.)

### 3.4 A regra de dependência aponta para dentro

`HTTP → serviços → domínio`. Os **repositórios** isolam o banco (Prisma). **O domínio não
conhece HTTP nem Prisma.** Construímos e raciocinamos **de dentro para fora**. (Detalhe na
seção 5.)

### 3.5 Pontuação é só o tempo normal (90 min)

Prorrogação e pênaltis **não contam**, mesmo no mata-mata. Consequência direta: **empate é
um palpite válido**, ainda que o jogo real seja decidido depois. Nunca modelar "casa/fora"
ou "mando de campo" — as posições esquerda/direita do jogo são **posicionais** (só
importam para o placar: 2×1 ≠ 1×2).

### 3.6 Correções são sempre livres

O organizador é o único operador e pode **editar palpites e corrigir resultados a qualquer
momento — não há trava**. Qualquer correção **recalcula automaticamente** rodada e
classificação. O "ciclo de vida da rodada" é um **guia visual, não uma trava**.

### 3.7 Single-user de verdade

Sem cadastro público, OAuth, papéis, recuperação social de senha ou qualquer infra
multiusuário. Auth é **mínima e correta** (seção 4 e Arquitetura §4.8). Não trazer
biblioteca de auth pesada.

### 3.8 Nada de over-engineering

Sem Redis, filas, microsserviços, GraphQL ou Kubernetes. Ver a lista completa de
anti-decisões na seção 14. A maturidade aqui é **não** trazer complexidade que o problema
não pede.

---

## 4. Stack e versões (Arquitetura §3)

| Camada | Decisão | Observações |
|---|---|---|
| Linguagem | **TypeScript** | Back e front. `strict: true` desde o primeiro arquivo. |
| Runtime | **Node.js 24 (Active LTS)** | Fixar a major em `engines` (package.json) e na imagem Docker. |
| Framework HTTP | **Fastify** | NestJS adiado; Express como alternativa. |
| Estilo de API | **REST** | Exportações retornam `text/plain` formatado p/ WhatsApp. |
| Banco | **PostgreSQL** | SQLite seria defensável pela escala, mas Postgres por padrão de indústria + deploy. |
| Acesso a dados | **Prisma** (ORM + migrations) | Ligar log de queries e **ler o SQL gerado** (aprendizado). Drizzle é a alternativa. |
| Validação | **Zod** | Na fronteira HTTP **e** no `.env` (validado no boot). |
| Autenticação | **Sessão por cookie httpOnly** (single-user) | Senha com **argon2id** (bcrypt aceitável). HTTPS obrigatório. |
| Frontend | **React + Vite + TypeScript + Tailwind** | SPA consumindo a API. shadcn/ui opcional. |
| Testes | **Vitest** | Prioridade máxima no núcleo de domínio. |
| Lint/Format | **Biome** | Ferramenta única. ESLint+Prettier como alternativa. |
| Empacotamento | **Docker** | Recomendado (reprodutibilidade), não obrigatório. |
| Deploy | **PaaS → VPS** | PaaS (Railway/Render/Fly) para validar; VPS Linux + Nginx como evolução. |

**Ainda em aberto** (decidir na implementação, não inventar antes da hora): PaaS específico
e provedor de Postgres gerenciado (Neon vs Supabase); Prisma vs Drizzle após protótipo
curto; Tailwind puro vs shadcn/ui. (Arquitetura §13.)

---

## 5. Arquitetura: camadas e regra de dependência

Arquitetura em camadas com a regra de negócio isolada. **Dependências apontam para
dentro.**

```
  Requisição HTTP
        │
        ▼
┌──────────────────────┐
│  HTTP (rotas/Fastify) │  traduz request↔response (JSON/texto). SEM regra de negócio.
│  + schemas Zod        │  já sob o preHandler de auth.
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Serviços / casos de  │  orquestram o fluxo (ex.: registrar resultado → recalcular →
│  uso                  │  gerar resumo). SEM SQL e SEM HTTP.
└──────────┬───────────┘
           ▼
┌──────────────────────┐     ┌─────────────────────────┐
│  Núcleo de DOMÍNIO    │     │  Repositórios (Prisma)   │
│  funções puras +      │     │  ÚNICA camada que fala   │
│  constantes +         │     │  com o banco.            │
│  formatadores WhatsApp│     └─────────────────────────┘
│  SEM framework/banco  │
└──────────────────────┘
```

- **HTTP:** rota recebe, valida com Zod, chama o serviço, devolve. **Não calcula nada.**
- **Serviço:** orquestra repositório(s) + funções de domínio. Não conhece SQL nem HTTP.
- **Repositório:** o único que importa Prisma. Lê/escreve **dados crus**.
- **Domínio:** funções puras (entram dados, saem dados, sem efeito colateral). É o cérebro.
  Testável sem subir servidor nem banco.

---

## 6. Estrutura de pastas (Arquitetura §5.5; Roteiro Fase 0)

Duas pastas-irmãs no mesmo repositório. **Não** é monorepo com ferramenta dedicada (seria
over-engineering para o tamanho).

```
.
├── CLAUDE.md                                  # este arquivo
├── docs/                                      # documentos-fonte (a verdade detalhada)
│   ├── documentacao_oficial_bolao.md          # funcional (verdade do comportamento)
│   ├── documentacao_arquitetura_bolao.md      # arquitetura (verdade da stack)
│   └── documentacao_roteiro_desenvolvimento_bolao.md  # roteiro (verdade da ordem)
│
├── backend/
│   ├── src/
│   │   ├── domain/            # regras PURAS + constantes (sem framework/banco)
│   │   │   ├── pontuacao.ts
│   │   │   ├── classificacao.ts
│   │   │   ├── pagamento.ts
│   │   │   └── whatsapp/      # formatadores dos 8 artefatos (puros)
│   │   ├── services/          # casos de uso / orquestração
│   │   ├── repositories/      # acesso a dados (Prisma) — único que fala com o banco
│   │   ├── http/              # rotas, controllers, schemas Zod, tratamento de erro
│   │   ├── config/            # env validado (Zod), conexão, auth
│   │   └── app.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts            # catálogo de seleções (dado de referência)
│   ├── tests/                 # espelha domain/ e services/
│   ├── package.json           # engines: node 24
│   └── tsconfig.json          # strict: true
│
└── frontend/
    └── src/
        ├── pages/             # telas: login, painel, participantes, perfil, ...
        ├── components/        # inclui o "Copiar para WhatsApp" compartilhado
        ├── api/               # cliente HTTP — conhece o contrato da API
        └── lib/
```

> A estrutura é uma **proposta inicial a refinar na implementação**, não uma camisa de
> força. Mas a separação `domain / services / repositories / http` é inegociável (seção 5).

---

## 7. Regras de negócio essenciais — cola rápida (Funcional §8)

Esta seção é um resumo de bolso. A **fonte de verdade é o documento funcional §8.** Em
dúvida, vá lá.

### 7.1 Pontuação (3 / 1 / 0)

- **Placar exato** → **3 pontos**
- **Resultado certo** (acertou o vencedor OU o empate), placar errado → **1 ponto**
- **Resultado errado** → **0 pontos**
- **Palpite ausente** → **0 ponto** no jogo (sem penalidade extra)
- Só vale o tempo normal (90 min). **Empate é palpite válido.**

**Casos de teste já prontos** (Funcional §8.3 → viram `expect` diretos):

```
Resultado real 2×1:   2x1 → 3   |  3x1 → 1  |  1x0 → 1  |  1x1 → 0  |  0x1 → 0
Resultado real 1×1:   1x1 → 3   |  2x2 → 1  |  2x1 → 0
```

### 7.2 Desempate da classificação (cascata — Funcional §8.5)

Ordene por, nesta ordem exata:

1. Maior **pontuação total**;
2. Maior **número de placares exatos** (palpites de 3 pts);
3. Maior **número de resultados certos** (palpites de 1 pt ou mais);
4. Persistindo o empate (raríssimo): **mesma posição**, com **ordem manual opcional** do
   organizador.

> O bug clássico aqui é trocar a ordem dos critérios. Teste empate **em cada nível**.

### 7.3 Valor a pagar e regra de indicação (Funcional §8.7)

- **Valor base:** **R$ 40** por participante.
- **Desconto:** **−R$ 5 por indicado direto que entra** (é cadastrado) — vale **mesmo que o
  indicado ainda não tenha pago**.
- **Piso:** mínimo **R$ 5** (desconto máximo efetivo R$ 35, com 7 indicados).
- **Só indicação DIRETA** (sem efeito em cadeia). Quem A indicou ganha o desconto; se os
  indicados de A indicarem outros, o benefício é deles, não de A.
- **Fórmula:** `valor = máximo(5, 40 − 5 × nº_indicados_diretos_que_entraram)`

| Indicados diretos | Valor | | Indicados | Valor |
|---|---|---|---|---|
| 0 | R$ 40 | | 4 | R$ 20 |
| 1 | R$ 35 | | 5 | R$ 15 |
| 2 | R$ 30 | | 6 | R$ 10 |
| 3 | R$ 25 | | **7+** | **R$ 5 (piso)** |

> Testar a **borda do piso** (7 → 5 e 8+ → 5) é o que pega bug.

### 7.4 Pagamento e totais (Funcional §8.8)

- Status manual por participante: **Pago** ou **Pendente** (padrão **Pendente**).
- Status é **só informativo** — **não afeta pontuação nem classificação**.
- Totais (derivados): **Total esperado** = soma dos valores a pagar de todos; **Total
  recebido** = soma dos valores de quem está "Pago"; **Falta receber** = esperado − recebido.

### 7.5 Constantes do domínio

`VALOR_BASE = 40`, `DESCONTO_POR_INDICACAO = 5`, `PISO = 5`. Ficam **nomeadas num único
módulo de configuração de domínio** — nunca espalhadas como números mágicos. Se a regra
mudar, muda num lugar só. (Arquitetura §5.2; Roteiro Fase 1 passo 2.)

---

## 8. Convenções de código (Clean Code aplicado a ESTE projeto)

Princípios gerais valem, mas abaixo está como eles se traduzem **aqui**.

### 8.1 Funções e responsabilidade

- **Funções pequenas, com uma responsabilidade.** Uma função de domínio calcula; um
  serviço orquestra; uma rota traduz. Não misture os três.
- **Funções de domínio são puras:** sem ler banco, sem formatar string, sem logar, sem
  efeito colateral. Entram dados, saem dados.
- **Sem efeito colateral escondido.** Se a função muda estado, o nome deve dizer isso.

### 8.2 Nomes

- Nomes **revelam intenção**: `calcularValorAPagar`, `participantesSemPalpite`,
  `ordenarClassificacao` — não `calc`, `proc`, `handle2`.
- Tipos bem nomeados evitam trocar argumentos: **`Palpite` ≠ `Resultado`**. Modele a forma
  do dado antes da lógica (`{ golsEsquerda: number; golsDireita: number }`; pontos como
  `0 | 1 | 3`; estados como uniões de strings). O compilador passa a barrar o impossível.

### 8.3 Tipagem (a disciplina que a stack quer construir)

- `strict: true` obrigatório. **Evitar `any`** — se aparecer, é sinal de modelagem
  faltando, não de pressa justificada.
- Os tipos do Zod são **inferidos** dos schemas (`z.infer`), mantendo **fonte única** entre
  validação em runtime e tipo em compile-time. Não duplicar a tipagem à mão.

### 8.4 Sem duplicação, mas sem abstração prematura

- Query repetida → **extrair uma função**, nunca criar coluna derivada (seção 3.1).
- Não criar camadas de abstração "para o futuro". Abstraia quando a duplicação existir e
  doer, não antes.

### 8.5 Comentários

- O código se explica pelo nome; comente o **porquê**, não o **o quê**. Um comentário bom
  registra uma decisão não óbvia ("posicional, não é mando de campo — ver Funcional §13").
- Comentário que repete o código é ruído; remova.

### 8.6 Erros

- Tratamento de erro **central** no HTTP: erros de validação (Zod) e de domínio viram
  respostas HTTP coerentes. Não espalhar `try/catch` que engole erro pela aplicação.
- O `.env` é validado **no boot** com Zod — falta de variável essencial **derruba o boot**,
  não estoura no meio de uma requisição.

### 8.7 Tamanho e foco dos arquivos

- Um formatador por artefato em `domain/whatsapp/`. Um repositório por agregado. Arquivos
  coesos e pequenos vencem arquivos-monolito.

### 8.8 Manutenção e evolução como critério

Toda escolha deve responder: *"isso facilita ou dificulta mexer aqui daqui a três meses?"*
Se a resposta for "dificulta", reconsidere — mesmo que seja mais rápido agora.

---

## 9. Idioma e nomenclatura

- **Domínio em português** (é o vocabulário do projeto e dos documentos): `Participante`,
  `Rodada`, `Jogo`, `Palpite`, `Selecao`, `calcularPontos`, `valorAPagar`. Isso mantém o
  código alinhado ao funcional e reduz tradução mental.
- **Termos técnicos universais** ficam no original quando é o costume (`repository`,
  `service`, `controller`, `schema`, `seed`, `preHandler`). Não force tradução que ninguém
  usa.
- **Mensagens de commit e documentação:** português.
- **Consistência acima de tudo:** escolhido o padrão, repetir. Não misturar
  `getParticipante` com `buscarParticipante` no mesmo módulo.

---

## 10. Testes (Arquitetura §8; Roteiro Fases 1–2)

**O risco do projeto está na regra de negócio, não na escala.** A estratégia de teste
reflete isso.

- **Unitários no núcleo de domínio = prioridade máxima.** `calcularPontos`,
  `ordenarClassificacao`, `calcularValorAPagar`, `participantesSemPalpite`, totais de
  pagamento e os formatadores WhatsApp. **Cobertura alta aqui** — é onde mora o risco.
- **TDD no domínio:** o documento funcional **já entregou os casos prontos** (§8.3 e §8.7).
  Escreva o teste **antes** da função (vermelho → verde → refatora).
- **Testes de serviço/integração** nos fluxos críticos: "registrar resultado recalcula
  rodada e classificação" e a **regra de indicação** (desconto vale sem pagamento; só
  direta — fácil de implementar errado).
- **Testes de API (leves, opcionais):** caminhos felizes dos endpoints principais, já
  autenticados.
- **Frontend:** testes pontuais de componentes de lista/exportação. Sem exagero.

> Os formatadores são testados contra a **estrutura** dos exemplos da §12, não contra o
> texto exato (o doc diz que o texto é ilustrativo). Verificar: sem tabela, com emoji/
> monoespaçado, informação correta, e bordas (apelido p/ homônimos; lista de 63 nomes não
> quebra).

---

## 11. Comandos do dia a dia

> Convenção que **estabelecemos na Fase 0**. Se um script ainda não existir no
> `package.json`, criar seguindo estes nomes. Comandos `npm` (ajuste se usar pnpm/yarn —
> mas mantenha um só gerenciador no projeto).

**Back-end** (rodar de `backend/`):

```bash
npm run dev            # sobe o servidor Fastify em watch
npm run build          # compila TypeScript
npm run start          # roda o build (produção)

npm run test           # Vitest (uma vez)
npm run test:watch     # Vitest em watch (use no TDD do domínio)
npm run test:coverage  # cobertura (mira no núcleo de domínio)

npm run lint           # Biome — acusa problemas
npm run format         # Biome — formata
npm run check          # Biome — lint + format check (use no CI e antes de commit)

# Prisma (banco)
npx prisma migrate dev --name <nome>   # cria + aplica migration (DESENVOLVIMENTO)
npx prisma migrate deploy              # aplica migrations existentes (PRODUÇÃO)
npx prisma generate                    # regenera o client tipado
npx prisma db seed                     # popula o catálogo de seleções
npx prisma studio                      # inspeção visual do banco

# Postgres local descartável (Fase 3)
docker compose up -d   # sobe Postgres idêntico ao de produção
```

**Front-end** (rodar de `frontend/`):

```bash
npm run dev      # Vite dev server
npm run build    # build de produção
npm run preview  # serve o build localmente
npm run lint     # Biome
```

> **`migrate dev` é desenvolvimento; `migrate deploy` é produção.** Nunca rodar
> `migrate dev` em produção (ele cria/altera schema). Em produção só `migrate deploy`
> (aplica o que já existe). (Roteiro Fase 3 e Fase 8.)

---

## 12. Git: commits, branches e disciplina

- **Commits pequenos e com sentido** — um por unidade lógica: `"função de pontuação +
  testes"`, `"repositório de participantes"`, `"tela de pagamentos"`. Histórico legível é
  manutenção barata e permite voltar atrás sem perder tudo.
- **Cada commit deixa o projeto verde** (lint + testes passando). Não commitar com a suíte
  quebrada.
- **`.gitignore` desde o início:** `node_modules`, `dist`, `.env`, artefatos de build,
  banco local. **Segredos nunca entram no versionamento** — nem no código, nem na imagem
  Docker. São variáveis de ambiente.
- **CI cedo (Roteiro §2.8 e Fase 0):** a cada push, instalar deps → `lint` → `test`. Monte
  o esqueleto na Fase 0 (validando o teste trivial) e ele cresce com os testes reais.

---

## 13. Roteiro de fases — onde estamos e o que vem (Roteiro completo)

Construímos **de dentro para fora** e **risco primeiro**. A ordem é uma decisão de
engenharia: cada fase só usa o que as anteriores já entregaram e testaram. **Não pule a
ordem** e **não avance sem o "Pronto quando" da fase atual satisfeito.**

| Fase | Entrega central | Foco |
|---|---|---|
| **0** | Repo, TS estrito, Biome, Vitest, estrutura de pastas, CI mínimo, README | Bancada |
| **1** | Funções puras: pontuação, desempate, valor a pagar, "quem não palpitou" (TDD) | Domínio |
| **2** | Formatadores puros dos 8 artefatos WhatsApp (sem tabela, emoji/monoespaçado) | Domínio (saída) |
| **3** | Schema Prisma (indicação auto-referente + unique do palpite), migrations, seed, Postgres local | Banco |
| **4** | Fastify + Zod na fronteira + `.env` validado + auth single-user + rota protegida | HTTP + segurança |
| — | **★ Deploy de fumaça (esqueleto ambulante)** — entre a Fase 4 e o resto da 5 | Infra (provar o cano) |
| **5** | Features verticais: Participantes → Pagamentos → Catálogo → Rodadas/Jogos → Palpites → Resultados/Pontuação → Exportações → Painel | Repos + serviços + rotas |
| **6** | Frontend base: Vite/React/TS/Tailwind, cliente HTTP, roteamento, layout, "Copiar" | Frontend base |
| **7** | Telas: Login → Participantes → Pagamentos → Rodadas/Montar → Rodada(detalhe) → Perfil → Painel | Frontend telas |
| **8** | Deploy de produção: Docker, PaaS + Postgres gerenciado, HTTPS, `migrate deploy`; depois VPS+Nginx (opcional) | Infra |
| **9** | Endurecimento: casos de borda, responsividade real, acessibilidade básica, README+runbook, CI completo | Qualidade |

**Notas de ordem que mais geram erro:**

- O **painel** agrega tudo → é praticamente a **última** coisa do back-end (Fase 5) e a
  **última** tela (Fase 7), embora seja a "home" do produto. Não comece por ele.
- **Exportações vêm depois de Resultados/Pontuação** — o resumo do jogo precisa dos pontos.
- **Auth vem ANTES das features** (Fase 4) para que toda rota nasça protegida e todo teste
  de API já seja escrito autenticado. Tampar com auth depois = retrabalho em cada rota.
- **Backend inteiro antes do frontend.** A tela é cliente de um contrato já pronto e
  testado. Exercite a API com Insomnia/Postman/`curl`/arquivo `.http` antes de qualquer
  tela.
- **Deploy aparece duas vezes:** cedo (Fase 4, provar que build→banco→migration→HTTPS→login
  funciona) e tarde (Fase 8, fazer direito).

> **Antes de iniciar uma fase**, releia a fase correspondente no documento de roteiro
> (Objetivo / Por que está aqui / Passos / Pronto quando / Armadilhas). Este `CLAUDE.md`
> resume; o roteiro tem o detalhe e o porquê.

---

## 14. Anti-decisões — o que NÃO fazer (Arquitetura §11; Roteiro §4)

Recusar estas coisas é **parte da decisão técnica**. Se você se pegar propondo qualquer
uma, pare e questione se o problema realmente pede.

- ❌ **Redis / cache** — não há o que cachear; o recálculo é instantâneo (~2 mil registros).
- ❌ **Filas (Kafka/RabbitMQ)** — não há processamento assíncrono.
- ❌ **Microsserviços** — é um **monólito modular**, e isso está **correto**.
- ❌ **GraphQL** — REST resolve com menos peças.
- ❌ **Kubernetes** — uma instância pequena basta.
- ❌ **Qualquer otimização "para escalar"** — o gargalo não existe.
- ❌ **Biblioteca de auth pesada** (OAuth, papéis, recuperação social) — é single-user.
- ❌ **Coluna para dado derivado** — viola o princípio 3.1.
- ❌ **Modelar mando de campo / casa-fora** — as posições são só posicionais (3.5).
- ❌ **Monorepo com ferramenta dedicada** — duas pastas-irmãs bastam.
- ❌ **Gerar texto WhatsApp no front** — é no back, função pura (3.3).

---

## 15. Como trabalhar comigo (postura do Claude Code neste projeto)

O autor é estudante de back-end e quer **aprender, não só executar**. Então:

1. **Explique o porquê, não só o quê.** Ao escrever ou alterar código, detalhe a lógica, o
   fluxo, a função de cada parte, o motivo das escolhas técnicas, os trade-offs, possíveis
   problemas e melhorias. Respostas com contexto e profundidade > soluções prontas e mudas.
2. **Respeite a ordem das fases.** Não adiante código de uma fase futura "porque é fácil".
   Se algo de uma fase posterior for necessário, explique por que e confirme antes.
3. **Não viole os princípios da seção 3.** Se uma solução pedir um derivado armazenado,
   regra na rota, ou texto WhatsApp no front, **proponha a alternativa correta** em vez de
   seguir o atalho.
4. **Quando faltar decisão, pergunte ou proponha explicitamente.** Não preencha lacuna do
   domínio com suposição silenciosa. Marque claramente "isto está fora do que os documentos
   decidiram".
5. **TDD no domínio.** Para regra de negócio, escreva o teste primeiro (os casos já estão
   nos documentos) e só então a implementação.
6. **Antes de um arquivo grande de código, mostre o plano.** Para mudanças não triviais,
   descreva a abordagem (quais camadas toca, quais funções, quais testes) e siga.
7. **Cada entrega fecha com seu "Pronto quando".** Não declare uma fase/feature concluída
   sem o critério objetivo satisfeito (teste verde, endpoint responde, tela renderiza).
8. **Mantenha o chão de trás firme.** Commits pequenos, lint e testes verdes, sem dívida
   silenciosa.

---

## 16. Checklists (Definition of Done por tipo de mudança)

**Nova função de domínio (regra de negócio):**
- [ ] É função **pura** (sem banco, sem HTTP, sem efeito colateral)
- [ ] Tipos bem nomeados (`Palpite` ≠ `Resultado`); sem `any`
- [ ] Teste escrito **antes** (TDD), cobrindo os casos dos documentos + bordas
- [ ] Constantes vêm do módulo de config de domínio (sem número mágico)
- [ ] Nenhum dado derivado foi persistido

**Novo endpoint (fatia vertical da Fase 5):**
- [ ] Padrão completo: repositório → serviço → schema Zod → rota → testes
- [ ] Regra de negócio **só no domínio**; rota traduz; serviço orquestra; repo persiste
- [ ] Sob o `preHandler` de auth (sem cookie → 401)
- [ ] Payload validado por Zod; erros tratados centralmente
- [ ] Endpoint de exportação retorna `text/plain` formatado p/ WhatsApp (se aplicável)
- [ ] Teste de serviço no fluxo crítico + teste de API no caminho feliz

**Novo formatador WhatsApp:**
- [ ] Em `domain/whatsapp/`, função **pura**, **recebe** os pontos já calculados
- [ ] **Sem tabela**; usa `*negrito*`, `_itálico_`, monoespaçado, emoji
- [ ] Testado contra a **estrutura** do exemplo da §12 + bordas (apelido, 63 nomes)

**Nova tela (Fase 7):**
- [ ] **Só consome** a API (não recalcula, não formata WhatsApp)
- [ ] `fetch` centralizado em `api/` (não espalhado por componente)
- [ ] Lista tem **busca/filtro/ordenação** e **botão exportar** (regra geral §11 do funcional)
- [ ] Confortável **no celular e no desktop** (testar no aparelho real, não só emulador)

**Mudança de schema (Prisma):**
- [ ] Nenhuma coluna para dado derivado
- [ ] Indicação **auto-referente** preservada; `@@unique([participanteId, jogoId])` intacto
- [ ] Posições do jogo seguem **posicionais** (não vira mando de campo)
- [ ] Migration gerada e aplicada no banco local; SQL gerado conferido

---

## 17. Glossário rápido (Funcional §3)

- **Organizador** — única pessoa que faz login. Dono do bolão.
- **Participante** — apostador; existe só como registro (nome, apelido, indicação,
  pagamento). **Não acessa o sistema.**
- **Seleção** — seleção nacional do catálogo (nome + bandeira/emoji).
- **Rodada** — fase do mata-mata. A última reúne 3º lugar + final (2 jogos).
- **Jogo** — confronto entre duas seleções dentro de uma rodada. Posições esquerda/direita
  são **posicionais**.
- **Palpite** — placar (90 min) que um participante chuta para um jogo.
- **Resultado** — placar real (90 min) de um jogo.
- **Indicação** — quando um participante traz outro; gera **desconto direto** para o
  indicador.
- **Valor a pagar** — quanto o participante deve, já com descontos (**derivado**, não
  digitado).
- **Artefato / exportação** — texto formatado pronto para colar no WhatsApp.
- **Esqueleto ambulante** — fio fino atravessando build→banco→deploy→HTTPS, provado cedo.

---

> **Lembrete final:** este arquivo é o resumo operacional. A verdade detalhada está nos três
> documentos — funcional (comportamento), arquitetura (stack), roteiro (ordem). Em conflito,
> os documentos vencem este `CLAUDE.md`. Construa de dentro para fora, ataque o risco
> primeiro, não armazene derivado, mantenha a regra no domínio, e gere o texto do WhatsApp
> no back-end. O resto é encanamento em volta de um cérebro confiável.