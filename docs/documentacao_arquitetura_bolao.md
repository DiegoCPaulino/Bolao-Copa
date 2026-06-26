# Documento de Arquitetura e Stack — Sistema de Gestão de Bolão (Copa do Mundo 2026)

**Versão:** 2 — documento técnico (companheiro do documento de contexto funcional v8 e do documento de roteiro de desenvolvimento v2)
**Atualizado em:** 26/06/2026
**Natureza:** documento técnico/arquitetura. Define *como* o sistema descrito no documento de contexto funcional será construído — stack, arquitetura de aplicação, modelagem física de dados, contrato de API, estratégia de testes, deploy e segurança. As regras de negócio, o escopo e o comportamento permanecem no documento funcional, que continua sendo a **fonte de verdade do domínio**.

---

## Histórico de versões

| Versão | O que mudou |
|--------|-------------|
| **1** | Documento criado. Leitura técnica do problema; escolha e justificativa da stack (TypeScript + Node 24 LTS + Fastify + Prisma + PostgreSQL no back; React + Vite + Tailwind no front; Vitest, Biome, Zod); arquitetura em camadas com núcleo de domínio puro; princípio "derivado não se armazena"; proposta de modelagem física; proposta de contrato de API; estratégia de testes, deploy (PaaS → VPS) e segurança; lista explícita de anti-decisões (o que NÃO usar). |
| **2** | Atualização **factual** (sem reescrever o raciocínio das seções). Cabeçalho e §1 passam a referenciar o funcional **v8** e o roteiro **v2**. Estrutura de pastas (§5.5) atualizada para a **real** (`cli/`, `shared/`, `schemas/` neutro, `http/` separado — antes os schemas viviam em `http/`). Modelo físico (§6) ganha os campos `isento` e `exibirComoPago` do Participante. Registrado que a **ordem de construção** segue o roteiro v2 (HTTP/auth/front são da **Entrega 2**; na Entrega 1 o adaptador é o terminal) e que a **decisão final de banco é Postgres mesmo local** (Entrega 1, via Docker) — SQLite só como alternativa não adotada. As decisões de **stack** das seções §3–§13 continuam valendo para as duas entregas. |

---

## 1. Propósito e relação com o documento funcional

O documento de contexto funcional (v8) responde **o que** o sistema é e faz. Este documento responde **como** ele será construído. A separação é deliberada: o *o quê* deve permanecer estável mesmo que a tecnologia mude, e o *como* deve poder evoluir sem reescrever o domínio. A **ordem** de construção (o *em que sequência*) vive no **roteiro de desenvolvimento v2**, que divide a entrega em duas — **Entrega 1** (terminal/local, sem HTTP/auth/front/deploy) e **Entrega 2** (HTTP, autenticação, front-end, deploy). As escolhas de **stack** deste documento valem para as duas entregas; mas, onde as seções abaixo presumem HTTP/front "desde cedo" (§4.8/§4.9/§5.1/§7), **prevalece a ordem do roteiro v2** — na Entrega 1 o adaptador é o terminal (CLI), e HTTP/auth/front entram na Entrega 2.

Regra de precedência: em caso de conflito, **as regras de negócio do documento funcional prevalecem**. Este documento nunca redefine comportamento — apenas escolhe as ferramentas e a estrutura que o implementam.

---

## 2. Leitura técnica do problema

Toda decisão abaixo nasce de três características dominantes do sistema, extraídas do documento funcional. Registrá-las aqui é importante porque elas — e não a moda — é que justificam a stack.

### 2.1 Não é um problema de escala
São ~63 participantes, 32 jogos e 5 rodadas. O teto absoluto de palpites no torneio inteiro é 63 × 32 ≈ **2.016 registros**. Há um único usuário escrevendo (o organizador), sem concorrência, sem pico de tráfego, sem necessidade de cache distribuído, fila ou particionamento. **Qualquer decisão tomada "pensando em escala" aqui é over-engineering.** A maturidade técnica neste projeto está em *não* trazer complexidade que o problema não pede.

### 2.2 É um problema de regra de negócio
O núcleo do sistema é cálculo: pontuação (3/1/0), desempate em cascata, valor a pagar com a regra de indicação e piso, totais agregados e "quem ainda não palpitou". O documento funcional ainda fixa que **dado derivado não se armazena** (seção 13). Logo, a lógica de cálculo precisa ser cidadã de primeira classe no código — isolada, nomeada e testada.

### 2.3 É um problema de UX de saída
O requisito não-funcional nº 1 é **exportação fácil para o WhatsApp**. Não é cosmético: é o produto. A formatação (negrito, monoespaçado, emojis, sem tabela) é uma regra de domínio e merece um módulo próprio, isolado e testado.

### 2.4 Princípio diretor das decisões
> **Concentrar o esforço de engenharia no núcleo de domínio (regras + geração de texto) e na UX das listas e exportações. Manter tudo o mais deliberadamente simples.**

Esse princípio é o critério para aceitar ou recusar cada tecnologia neste documento.

---

## 3. Stack escolhida (resumo)

| Camada | Decisão | Alternativa considerada |
|---|---|---|
| Linguagem | **TypeScript** | — |
| Runtime | **Node.js 24 (Active LTS)** | Node 22 (manutenção); reavaliar 26 quando virar LTS (out/2026) |
| Framework HTTP | **Fastify** | Express; NestJS (etapa futura) |
| Estilo de API | **REST** | GraphQL (descartado) |
| Banco de dados | **PostgreSQL** | SQLite (válido pela escala; ver 4.5) |
| Acesso a dados | **Prisma (ORM + migrations)** | Drizzle |
| Validação de entrada | **Zod** | JSON Schema nativo do Fastify |
| Autenticação | **Sessão por cookie httpOnly** (single-user) | JWT |
| Frontend | **React + Vite + TypeScript + Tailwind CSS** | Vue / SvelteKit |
| Testes | **Vitest** | Jest |
| Lint/Format | **Biome** | ESLint + Prettier |
| Empacotamento | **Docker** (recomendado, não obrigatório) | — |
| Deploy | **PaaS** (Railway/Render) para validar; **VPS Linux** como evolução | — |

---

## 4. Justificativa por camada

### 4.1 Linguagem: TypeScript
O sistema é cheio de "formas de dado" precisas: um palpite é `{ golsEsquerda, golsDireita }`, a pontuação é `0 | 1 | 3`, o estado da rodada é uma de quatro strings. Modelar isso com tipos transforma erros de lógica em erros de compilação e força o raciocínio por contratos antes da implementação — exatamente a disciplina de back-end que se quer construir. Para este domínio, TypeScript não é luxo: é redução direta de risco.

### 4.2 Runtime: Node.js 24 (Active LTS)
A linha 24 é a LTS ativa atual e o default recomendado para projetos novos. A 22 segue suportada (manutenção, até ~abr/2027) e serve como fallback. A 26 só deve ser adotada após virar LTS (previsto out/2026). **Fixar a versão major no `package.json` (campo `engines`) e na imagem base do Docker** para garantir consistência entre máquina local, CI e produção.

### 4.3 Framework HTTP: Fastify
Decisão tomada por equilíbrio entre ergonomia moderna e valor de aprendizado:

- **Express** — maior volume de material e mínimo de "mágica"; ótimo para fundamentos, mas exige trazer validação e tipagem por fora.
- **NestJS** — ensina padrões enterprise (módulos, injeção de dependência), porém resolve a estrutura *por você* via decorators e container de DI. Para quem ainda forma a base, há risco de usar a estrutura certa sem entender por quê. **Fica como etapa futura**, depois de montar uma arquitetura em camadas manualmente.
- **Fastify (escolhido)** — moderno, performático, TypeScript de primeira classe e validação de schema embutida (que conversa com a necessidade de validar payloads e placares). Crucialmente, **não monta a arquitetura por você**: as camadas continuam sendo escritas à mão, preservando o aprendizado de estruturação.

### 4.4 Estilo de API: REST
Os recursos são poucos e óbvios (`participantes`, `rodadas`, `jogos`, `palpites`, `resultados`, `pagamentos`); os endpoints de exportação retornam texto formatado. **GraphQL é descartado** por resolver um problema (over/under-fetching com muitos clientes heterogêneos) que este sistema não tem.

### 4.5 Banco de dados: PostgreSQL
Os dados são intrinsecamente relacionais e com integridade que importa: `Jogo` pertence a `Rodada`; `Palpite` referencia `Participante` e `Jogo`; e o ponto mais interessante da modelagem, a **indicação auto-referente** (`Participante.indicador → Participante`). Banco relacional é o encaixe natural, e PostgreSQL é o padrão de indústria: robusto, gratuito, com excelente suporte a chaves estrangeiras e constraints, e fácil de hospedar gerenciado (Neon, Supabase).

**Registro honesto da alternativa:** dado o tamanho (single-user, ~2 mil registros), **SQLite seria tecnicamente defensável** — sem servidor, arquivo único, zero concorrência. O que pesa contra é o requisito de *armazenamento central + multi-dispositivo + deploy online*: SQLite exige disco persistente, o que atrita com deploys efêmeros. **A escolha por Postgres é por padrão de indústria e conveniência de deploy, não por necessidade de escala** — distinção que fica documentada de propósito.

> **Decisão final (roteiro v2, Fase 3):** usa-se **Postgres mesmo localmente** na Entrega 1 (via Docker), para o **mesmo motor** servir local (E1) e gerenciado (E2) e poupar uma migração de banco arriscada na virada online. SQLite fica registrado apenas como alternativa teórica — **não adotada**.

### 4.6 Acesso a dados: Prisma
Prisma dá o melhor DX para aprender modelagem: schema declarativo num único arquivo legível (a relação auto-referente da indicação fica limpa de expressar), tipos TypeScript gerados automaticamente e migrations de qualidade.

**Tensão registrada:** há interesse explícito em SQL. Para não perder esse aprendizado, a diretriz é **usar Prisma com log de queries ligado e ler o SQL gerado**, e escrever uma ou duas queries de relatório à mão (ex.: a classificação com desempate) para comparar. **Drizzle** fica como alternativa para quem quiser ficar mais perto do SQL no dia a dia.

### 4.7 Validação de entrada: Zod
Nunca confiar no que entra na API. Zod declara o formato esperado de cada payload (cadastro de participante, registro de palpite/resultado) e **infere o tipo TypeScript a partir do schema** — fonte única de verdade para validação em runtime e tipo em compile-time. É a fronteira que barra placares inválidos (gols negativos, campos faltando) antes de chegarem ao domínio.

### 4.8 Autenticação: mínima e correta (single-user)
O sistema tem **um único usuário**. Não há cadastro público, OAuth, papéis ou recuperação social de senha. O necessário, feito corretamente:

- senha do organizador **hasheada** (preferir **argon2id**; bcrypt aceitável), guardada no banco — nunca em texto puro nem hardcoded;
- **sessão por cookie httpOnly** (mais simples e seguro para uma app web com frontend próprio; alternativa: JWT);
- **HTTPS** obrigatório.

Implementar esse fluxo mínimo à mão é também exercício de segurança (hashing, sessão, defesa contra XSS via httpOnly). **Não trazer biblioteca de auth pesada.**

### 4.9 Frontend: React + Vite + TypeScript + Tailwind
O documento funcional exige um frontend real (8 telas, listas com busca/filtro/ordenação, responsivo no mobile e desktop). **React + Vite + TypeScript** é a opção de maior transferência de mercado e melhor ecossistema; manter um SPA que conversa com a API Node por HTTP cria uma **fronteira cliente/servidor explícita**, reforçando o aprendizado de API como contrato. **Tailwind CSS** atende ao requisito de interface limpa e confortável sem gastar dias em CSS; uma biblioteca de componentes (ex.: shadcn/ui) é opcional para acelerar.

**Decisão de design importante:** a **geração do texto do WhatsApp acontece no back-end**, não no front. O back-end já é dono das regras (pontuação, valor a pagar, totais); centralizar a formatação lá evita duplicação e mantém uma única fonte de verdade testável. O frontend apenas recebe o texto pronto e o copia via Clipboard API. Isso respeita o princípio "derivado não se armazena": o texto é gerado na hora, a partir do estado atual.

### 4.10 Testes: Vitest
As regras de pontuação, desempate e valor a pagar são **funções puras** — o caso ideal de teste unitário. O documento funcional **já entrega os casos prontos**: a seção 8.3 (resultado real 2×1 → `2x1`=3, `3x1`=1, `1x0`=1, `1x1`=0, `0x1`=0; resultado real 1×1 → `1x1`=3, `2x2`=1, `2x1`=0) vira diretamente um conjunto de `expect`. A diretriz é **escrever esses testes antes de tocar em banco ou tela**, garantindo que o cérebro do sistema está correto. Vitest combina com Vite/TS e é rápido.

### 4.11 Lint/Format: Biome
Substitui ESLint + Prettier por uma ferramenta única, mais rápida e com configuração mínima — menos peças móveis para um projeto solo. ESLint + Prettier seguem como caminho "mais padrão de mercado" caso se prefira.

---

## 5. Arquitetura da aplicação

### 5.1 Camadas
Arquitetura em camadas com a regra de negócio isolada:

- **HTTP (rotas/controllers Fastify):** traduz requisição em chamada e resposta em JSON/texto. **Sem regra de negócio.**
- **Serviços / casos de uso:** orquestram fluxos (ex.: registrar resultado → recalcular → gerar resumo).
- **Repositórios:** única camada que conhece o banco (via Prisma).
- **Núcleo de domínio:** funções puras com as regras, sem dependência de framework ou banco.

A regra de dependência aponta sempre para dentro: HTTP → serviços → domínio; repositórios isolam o banco. O domínio não conhece HTTP nem Prisma.

### 5.2 Núcleo de domínio como funções puras
As regras de maior risco de bug ficam como funções puras, testáveis sem subir servidor nem banco e imunes a troca de framework:

- `calcularPontos(palpite, resultado): 0 | 1 | 3`
- `ordenarClassificacao(participantesComEstatisticas)` — aplica os critérios de desempate da seção 8.5
- `calcularValorAPagar(qtdIndicadosDiretos): number` — `máximo(5, 40 − 5 × n)`
- `participantesSemPalpite(rodada, participantes, palpites)`

Constantes do domínio (**valor base R$ 40**, **desconto R$ 5**, **piso R$ 5**) ficam nomeadas num único módulo de configuração de domínio, nunca espalhadas como números mágicos.

### 5.3 Módulo de formatação WhatsApp
Um módulo dedicado converte estruturas de domínio nos artefatos da seção 12 do documento funcional (mensagem da rodada, tabela de palpites, resumo do jogo, resumo da rodada, classificação geral, lista de participantes, pagamentos, pendências de palpite). Regras: usar `*negrito*`, `_itálico_`, monoespaçado e emojis; **nunca tabelas**; alinhar por monoespaçado/emoji. Cada formatador é função pura e testável.

### 5.4 Princípio: derivado não se armazena
Pontuação, valor a pagar, totais, classificação, placares exatos e "quem não palpitou" **não são persistidos** — são calculados sob demanda a partir de palpites + resultados + indicações. Com ~2 mil registros, recalcular tudo a cada requisição é instantâneo e elimina a classe inteira de bugs de "derivado desatualizado". Saber *quando não cachear* é uma decisão de engenharia tão importante quanto saber cachear.

### 5.5 Estrutura de pastas
Estrutura **real** do repositório (já implementada; o `CLAUDE.md` §6 traz a árvore completa anotada). Os adaptadores `cli/` (Entrega 1) e `http/` (Entrega 2) são intercambiáveis sobre os mesmos `services/`; os `schemas/` Zod são fonte única dos dois.

```
backend/
  src/
    domain/            # regras PURAS + constantes (sem framework/banco/interface)
      pontuacao.ts     #   (+ classificacao, pagamento, premiacao, estatisticas, palpites, constantes, erros)
      whatsapp/        # formatadores dos artefatos (puros, devolvem string)
    repositories/      # acesso a dados (Prisma) — única camada que fala com o banco
    services/          # casos de uso / orquestração — AGNÓSTICOS de interface
    schemas/           # schemas Zod NEUTROS — fonte única CLI + HTTP
    shared/            # utilitários compartilhados entre adaptadores
    config/            # env validado (Zod) + conexão Prisma
    cli/               # adaptador de TERMINAL (Entrega 1): main + menus/ + rotulos
    http/              # adaptador HTTP (Entrega 2): app/server/auth + routes/
  prisma/
    schema.prisma
    migrations/
    seed.ts            # catálogo de seleções
  scripts/             # utilitários (gerar-hash, preparar banco de teste, backup)
  tests/               # espelha domain/, services/, cli/, http/ (+ integration/)
frontend/
  src/
    pages/             # telas (login, painel, participantes, pagamentos, ...)
    components/        # inclui o "Copiar para WhatsApp" compartilhado
    api/               # cliente HTTP (contrato com o back)
    lib/
```

---

## 6. Modelagem física de dados (proposta)

Tradução do modelo conceitual (seção 13 do documento funcional) para a stack escolhida. Esboço em pseudo-Prisma, a refinar na implementação. **Os campos derivados não aparecem como colunas — são calculados.**

```prisma
enum StatusPagamento { PAGO PENDENTE }
enum FaseRodada { DEZESSEIS_AVOS OITAVAS QUARTAS SEMIFINAIS FINAL }
enum EstadoRodada { MONTADA PALPITES_ABERTOS RESULTADOS_EM_ANDAMENTO ENCERRADA }

model Selecao {
  id        String  @id @default(cuid())
  nome      String
  bandeira  String  // emoji
}

model Participante {
  id           String           @id @default(cuid())
  nome         String
  apelido      String?          // diferencia homônimos
  status         StatusPagamento  @default(PENDENTE)
  isento         Boolean          @default(false) // fora da cobrança; disputa normal (funcional §8.8.2)
  exibirComoPago Boolean          @default(false) // override de apresentação só na exportação (funcional §8.8.1)
  indicadorId  String?          // auto-referência: quem indicou este participante
  indicador    Participante?    @relation("Indicacao", fields: [indicadorId], references: [id])
  indicados    Participante[]   @relation("Indicacao")
  palpites     Palpite[]
  criadoEm     DateTime         @default(now())
}

model Rodada {
  id      String        @id @default(cuid())
  fase    FaseRodada
  ordem   Int           // 1..5
  estado  EstadoRodada  @default(MONTADA)
  jogos   Jogo[]
}

model Jogo {
  id                String   @id @default(cuid())
  rodadaId          String
  rodada            Rodada   @relation(fields: [rodadaId], references: [id])
  selecaoEsquerdaId String
  selecaoDireitaId  String
  ordem             Int      // J1, J2, ...
  golsEsquerdaReal  Int?     // null até o resultado existir
  golsDireitaReal   Int?
  palpites          Palpite[]
}

model Palpite {
  id              String  @id @default(cuid())
  participanteId  String
  jogoId          String
  golsEsquerda    Int
  golsDireita     Int
  @@unique([participanteId, jogoId]) // um palpite por participante por jogo
}
```

Notas de modelagem:

- **Indicação auto-referente:** `indicadorId` é FK opcional para `Participante`. Um indicador tem vários indicados; cada participante tem no máximo um indicador. Como só se indica quem já está cadastrado, a FK sempre aponta para um registro anterior.
- **Times posicionais:** `selecaoEsquerda`/`selecaoDireita` são apenas posição para o placar (2×1 ≠ 1×2); **não** representam mando de campo. A ordem só importa para a pontuação.
- **Resultado opcional:** `golsEsquerdaReal`/`golsDireitaReal` ficam nulos enquanto o jogo não tem resultado.
- **Catálogo de seleções:** majoritariamente fixo; pode ser populado por *seed*.

---

## 7. Contrato de API (proposta de endpoints)

Proposta REST inicial; rotas de exportação retornam `text/plain` formatado para WhatsApp.

```
POST   /auth/login
POST   /auth/logout

GET    /participantes
POST   /participantes
GET    /participantes/:id            # perfil consolidado
PUT    /participantes/:id
GET    /participantes/export         # lista formatada p/ WhatsApp

GET    /pagamentos                   # status + valor + totais (esperado/recebido/falta)
PUT    /pagamentos/:participanteId   # alterna Pago/Pendente
GET    /pagamentos/export

GET    /rodadas
POST   /rodadas                      # montar rodada (seleções par a par)
GET    /rodadas/:id                  # detalhe (jogos, palpites, resultados, pontuação)
PUT    /rodadas/:id/estado           # avança o ciclo de vida

PUT    /jogos/:id/resultado          # registra placar 90 min → recálculo automático

PUT    /participantes/:pid/rodadas/:rid/palpites   # registra palpites de um participante
GET    /rodadas/:id/pendentes        # quem ainda não palpitou (+ export)

GET    /rodadas/:id/export/mensagem  # mensagem da rodada
GET    /jogos/:id/export/resumo      # resumo do jogo
GET    /rodadas/:id/export/resumo    # resumo da rodada
GET    /classificacao/export         # classificação geral

GET    /painel                       # visão geral (pagamentos, pote, rodada atual)
```

---

## 8. Estratégia de testes

- **Unitários no núcleo de domínio (prioridade máxima):** pontuação, desempate, valor a pagar, formatadores WhatsApp e "quem não palpitou". Os exemplos das seções 8.3 e 8.7 do documento funcional viram casos diretos. Meta de cobertura alta **neste núcleo** (é onde mora o risco).
- **Testes de serviço/integração:** fluxos como "registrar resultado recalcula rodada e classificação" e a regra de indicação (desconto vale mesmo sem pagamento; apenas indicação direta).
- **Testes de API (opcional, leve):** caminhos felizes dos endpoints principais.
- **Frontend:** testes pontuais dos componentes de lista/exportação; sem exagero, dado o tamanho.

---

## 9. Estratégia de deploy e infraestrutura

Dois caminhos, em sequência pedagógica:

1. **PaaS primeiro (Railway, Render ou Fly.io):** sobe rápido, banco Postgres gerenciado junto, HTTPS automático. Objetivo: **ter o sistema no ar e validar o produto** sem misturar com aprendizado de ops.
2. **VPS Linux depois (Hetzner, DigitalOcean, Oracle Cloud free tier):** como exercício deliberado de infraestrutura — provisionar o servidor, **Nginx** como reverse proxy, gerência de processo (systemd ou PM2), Postgres instalado e protegido, firewall, TLS via Let's Encrypt.

Em ambos, **empacotar com Docker** é recomendado pela reprodutibilidade (sobe igual no PC, no CI e em produção) e pelo valor de aprendizado em infra; não é obrigatório dado o tamanho.

Frontend: Vercel/Netlify/Cloudflare Pages, ou servido pelo próprio Nginx no VPS.

---

## 10. Segurança (proporcional ao uso)

- **HTTPS** em toda a aplicação.
- Senha do organizador **hasheada** (argon2id preferido); sessão por **cookie httpOnly** (+ `Secure`, `SameSite`).
- **Validação de toda entrada com Zod** na fronteira HTTP.
- Variáveis de ambiente **validadas no boot** (ex.: schema Zod para o `.env`); segredos **fora do versionamento**.
- Sem dados sensíveis de terceiros e sem multiusuário → **autenticação básica e proteção razoável bastam**, mas com boas práticas de ponta a ponta (princípio do documento funcional, seção 15).

---

## 11. O que NÃO usar (anti-decisões)

Registradas de propósito, porque recusá-las é parte da decisão técnica deste projeto:

- **Redis/cache** — não há o que cachear que justifique a complexidade; o recálculo é instantâneo.
- **Filas de mensagem** (Kafka/RabbitMQ) — não há processamento assíncrono.
- **Microsserviços** — é um monólito modular, e isso está correto.
- **GraphQL** — REST resolve com menos peças.
- **Kubernetes** — uma instância pequena basta.
- **ORM/abstração "para escalar"** ou qualquer otimização prematura — o gargalo não existe.

---

## 12. Decisões técnicas consolidadas

| # | Tema | Decisão |
|---|------|---------|
| T1 | Linguagem | TypeScript em back e front. |
| T2 | Runtime | Node.js 24 (Active LTS); versão fixada em `engines` e no Docker. |
| T3 | Framework HTTP | Fastify (NestJS adiado; Express como alternativa). |
| T4 | Estilo de API | REST; exportações retornam texto formatado. |
| T5 | Banco | PostgreSQL (SQLite registrado como alternativa válida pela escala). |
| T6 | Acesso a dados | Prisma (ORM + migrations), com leitura do SQL gerado para aprendizado. |
| T7 | Validação | Zod na fronteira HTTP e no `.env`. |
| T8 | Autenticação | Single-user; senha com argon2id; sessão por cookie httpOnly; HTTPS. |
| T9 | Frontend | React + Vite + TypeScript + Tailwind; SPA consumindo a API. |
| T10 | Geração WhatsApp | No back-end, como módulo de funções puras. |
| T11 | Arquitetura | Camadas (HTTP → serviços → repositórios) + núcleo de domínio puro. |
| T12 | Dados derivados | Calculados sob demanda; nunca armazenados. |
| T13 | Testes | Vitest; prioridade no núcleo de domínio (exemplos do doc funcional). |
| T14 | Lint/Format | Biome (ESLint + Prettier como alternativa). |
| T15 | Empacotamento | Docker recomendado (não obrigatório). |
| T16 | Deploy | PaaS para validar; VPS Linux como evolução de infra. |
| T17 | Anti-decisões | Sem Redis, filas, microsserviços, GraphQL ou Kubernetes. |

---

## 13. Pontos em aberto / próximos passos

Itens que ainda **não** são decisões fechadas e serão definidos na implementação:

- Escolha final entre **PaaS específico** (Railway vs Render vs Fly.io) e provedor de **Postgres gerenciado** (Neon vs Supabase).
- Decisão definitiva **Prisma vs Drizzle** após um protótipo curto, se houver interesse em ficar mais perto do SQL.
- Refinamento do **contrato de API** e dos **schemas Zod** por endpoint.
- Refinamento da **modelagem física** (tipos exatos, índices, *seed* do catálogo de seleções).
- Definição da **biblioteca de componentes** do frontend (Tailwind puro vs shadcn/ui).
- Estratégia de **CI** (lint + testes no push).

---

*Documento técnico/arquitetura. Complementa — e nunca substitui — o documento de contexto funcional, que permanece como fonte de verdade do comportamento e das regras do sistema.*
