# CLAUDE.md — Guia operacional do projeto (Bolão Copa do Mundo 2026)

> **Para quem lê este arquivo (você, Claude Code):** este é o briefing permanente do
> projeto. Leia-o por inteiro antes de escrever qualquer linha de código. Ele não
> substitui os três documentos-fonte — ele os **destila em regras de trabalho** e aponta
> para onde está a verdade detalhada de cada assunto. Quando este arquivo e os documentos
> divergirem, **os documentos-fonte vencem** (a precedência está na seção 2).
>
> **Mudança estrutural recente — leia primeiro:** o projeto agora é entregue em **duas
> entregas** (funcional v8 §2; roteiro v2). A **Entrega 1** é um sistema **funcional via
> terminal**, local, com banco, **sem HTTP, sem front, sem deploy e sem autenticação**
> (meta **27/06/2026**). A **Entrega 2** acrescenta API HTTP, autenticação, front-end e
> deploy **sobre o mesmo núcleo**, sem reescrever regra. O que torna isso possível é o
> princípio do **núcleo agnóstico de interface** (seção 3.1) — a regra nº 1 desta versão.

---

## 0. Natureza do projeto e postura de qualidade

Este **não é um trabalho acadêmico descartável**. É um sistema real, de uso pessoal do
organizador de um bolão, que vai rodar por semanas durante a Copa de 2026, com ~63
participantes dependendo dos números estarem certos. Portanto:

- **Fazemos do jeito certo, não do jeito rápido.** Há um produto que precisa ser
  **correto, fácil de manter e fácil de evoluir**. Toda decisão é tomada pensando em quem
  vai ler e mexer no código daqui a três meses (provavelmente o próprio autor, que terá
  esquecido os detalhes).
- **Clean Code e boas práticas não são enfeite — são o requisito.** Código legível,
  funções pequenas e com responsabilidade única, nomes que explicam intenção, ausência de
  duplicação, testes onde mora o risco. Ver seção 8.
- **Maturidade técnica aqui é saber o que NÃO fazer.** O sistema é pequeno em escala
  (arquitetura §2.1). Trazer complexidade que o problema não pede é o erro mais provável.
  As anti-decisões estão na seção 14 e são para serem respeitadas.
- **O objetivo também é aprendizado.** O autor é estudante de ADS com foco em back-end
  (lógica, APIs, banco, arquitetura, infra, Linux, segurança). Logo, **explique o porquê
  das escolhas** ao codar — ver seção 15. Não basta funcionar; tem que ensinar.

---

## 1. O projeto em uma página

**O que é:** aplicação de **uso exclusivo do organizador** de um bolão de mata-mata da
Copa 2026. Centraliza rodadas, jogos, palpites, resultados, cálculo automático de
pontuação/classificação, controle de pagamentos (com regra de desconto por indicação) e
**geração de textos prontos para colar no WhatsApp**.

**Modelo de uso — leia com atenção, isto molda tudo:**

- **Single-user.** Só o organizador usa o sistema. **Participantes NÃO acessam nada** —
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
cosmético — é o produto. Tratar com primeira classe **já na Entrega 1** (impressa no
terminal, pronta para copiar).

### 1.1 As duas entregas (funcional v8 §2; roteiro v2)

O mata-mata começa em **28/06** e o prazo prático para o sistema estar **operando** é
**27/06/2026**. Por isso o produto é dividido em duas entregas. **Nenhuma regra de negócio
muda** — muda só a ordem de entrega.

| | **Entrega 1** (meta 27/06) | **Entrega 2** (depois, com o bolão já em uso) |
|---|---|---|
| Interface | **Terminal (CLI)**, local no PC do organizador | Front-end web responsivo (React) |
| Banco | **Postgres local** (Docker), persistente | Postgres **gerenciado online**, multi-dispositivo |
| Autenticação | **Não há** (local, single-user, na própria máquina) | Login do organizador (sessão por cookie httpOnly) |
| Deploy | Nenhum | PaaS + HTTPS; depois VPS (opcional) |
| Domínio | **Completo** (todas as regras, cálculos e exportações) | **O mesmo** — reusado intacto |

> **Por que a Entrega 1 não é descartável.** O **núcleo da aplicação** (domínio + serviços
> + repositórios) **não conhece a interface**. Na Entrega 1, quem fala com o usuário é o
> **adaptador de terminal (CLI)**. Na Entrega 2 entram **dois novos adaptadores sobre o
> mesmo núcleo**: a **API HTTP (Fastify)** e o **front-end React** que a consome. Se o
> núcleo for agnóstico de interface, a Entrega 2 só **acrescenta adaptadores** — não
> reescreve regra. Isso é **portas e adaptadores** (roteiro §2.1).

### 1.2 Vocabulário: "Entrega" ≠ "Fase"

Há uma armadilha de palavras (roteiro §1). O funcional v8 chama de "Fase 1/2" as **duas
entregas do produto**. O roteiro chama de "Fase 0, 1, 2…" as **etapas de construção**.
Para não confundir, **neste projeto**:

- **Entrega 1 / Entrega 2** = as duas entregas do produto (terminal → front/online).
- **Fase 0…10** = as etapas de construção (Fase 0 = bancada; Fase 1 = domínio; etc.).

---

## 2. Documentos-fonte e precedência (a hierarquia da verdade)

O projeto tem três documentos. Eles vivem na raiz do repositório e são a **fonte de
verdade**. Este `CLAUDE.md` é um resumo operacional — quando precisar do detalhe, vá à
fonte.

| Documento | Versão | Responde | Papel |
|---|---|---|---|
| `documentacao_oficial_bolao.md` (funcional) | **v8** | **O QUÊ + EM QUE ORDEM ENTREGAR** — escopo, regras, telas, artefatos, plano de 2 entregas | Fonte de verdade do **comportamento e das regras** |
| `documentacao_arquitetura_bolao.md` (arquitetura) | **v1** | **COMO** — stack, camadas, modelagem física, contrato de API, deploy, segurança | Fonte de verdade da **stack e da estrutura** |
| `documentacao_roteiro_desenvolvimento_bolao.md` (roteiro) | **v2** | **EM QUE ORDEM CONSTRUIR** — 11 fases (0–10) em duas entregas, e o porquê de cada posição | Fonte de verdade da **sequência de execução** |

**Regra de precedência (decora isto):**

1. Para **comportamento / regra de negócio** → vale o **funcional (v8)**.
2. Para **stack / estrutura técnica** → vale a **arquitetura (v1)**.
3. Para **ordem de construção** → vale o **roteiro (v2)**.
4. Este `CLAUDE.md` **nunca redefine** regra nem stack; ele organiza e relembra. Se notar
   conflito entre este arquivo e um documento-fonte, **avise o autor** e siga o documento.

> ⚠️ **Atenção a um descompasso temporário entre os documentos.** A **arquitetura ainda é
> v1** e foi escrita supondo "HTTP + front desde cedo" (ela diz, inclusive, ser companheira
> do funcional **v7**). Depois vieram o funcional v8 e o roteiro v2, que **dividiram a
> entrega em duas** e moveram HTTP/auth/front/deploy para a Entrega 2. Logo:
> - As **decisões de stack** da arquitetura **continuam valendo** (TypeScript, Node 24,
>   Fastify, Postgres, Prisma, Zod, argon2id, React/Vite/Tailwind, Vitest, Biome, Docker).
> - Mas, onde a arquitetura **presume ordem** (montar HTTP/auth antes das features),
>   **prevalece o roteiro v2**: na Entrega 1 o adaptador é o **terminal**, não o HTTP.
> - O **estilo do adaptador de terminal** (ver seção 13) é uma **decisão nova ainda a
>   ratificar na arquitetura** — não trate como fechada.

Se uma decisão necessária **não estiver em nenhum dos três**, **não invente**: pergunte ao
autor ou proponha explicitamente como decisão nova, deixando claro que está fora do que já
foi definido.

---

## 3. Princípios inegociáveis (as regras que nunca se quebram)

Estas são as restrições de maior risco do projeto. Violá-las quebra a arquitetura ou
introduz a classe de bug mais cara. Trate cada uma como uma trava.

### 3.1 ⭐ Núcleo agnóstico de interface (a regra nº 1)

O **domínio, os serviços e os repositórios NÃO conhecem terminal nem HTTP.** É o princípio
que faz a Entrega 1 valer como fundação da Entrega 2 (roteiro §3.1 e §5). Concretamente:

- **Serviços recebem dados tipados e devolvem dados tipados.** Nada de `req`/`res`, nada de
  `console.log`, nada de tipos do Fastify ou do terminal dentro de um serviço. Um serviço
  como `registrarResultado(jogoId, placar)` **devolve** o estado recalculado — **quem
  imprime no terminal ou serializa em JSON é o adaptador.**
- **A validação Zod vive no adaptador**, transformando a entrada crua (resposta digitada no
  terminal, ou o corpo HTTP) no dado tipado que o serviço espera. O **mesmo schema Zod**
  serve aos dois adaptadores.
- **Os formatadores de WhatsApp devolvem `string`.** O adaptador decide o destino: o **CLI
  imprime** no terminal; o **HTTP devolve** como `text/plain`.
- **Erros são de domínio, mapeados no adaptador.** O serviço lança um erro tipado; o **CLI**
  traduz em mensagem + código de saída; o **HTTP** em status code.

> Se você se pegar importando algo de terminal ou de Fastify dentro de `domain/`,
> `services/` ou `repositories/`, **pare** — o núcleo vazou para a interface, e a Entrega 2
> vai pagar isso em retrabalho.

### 3.2 Derivado NÃO se armazena

Pontuação, pontos por rodada, classificação, placares exatos, **valor a pagar**, totais de
pagamento (esperado/recebido/falta) e "quem ainda não palpitou" **são calculados sob
demanda** a partir dos dados crus (palpites + resultados + indicações). **Nunca viram
coluna no banco.** Com ~2 mil registros, recalcular tudo a cada leitura é instantâneo e
elimina a classe inteira de bugs de "derivado desatualizado".

> Se sentir vontade de criar uma coluna `pontos`, `valorAPagar` ou `posicao` — **pare**.
> Isso é derivado. Query repetida se resolve **extraindo uma função**, não criando coluna.
> (Funcional §14; Arquitetura §5.4; Roteiro §3.6.)

### 3.3 A regra de negócio mora no domínio (funções puras)

O "cérebro" do sistema — cálculo de pontos, desempate, valor a pagar, "quem não palpitou"
— vive como **funções puras** em `domain/`, sem dependência de framework, banco ou
interface. Se a rota, o comando de terminal, o repositório ou a tela começarem a calcular
regra de negócio, **a arquitetura furou**. Mova para uma função pura testada.

### 3.4 O texto do WhatsApp é gerado no NÚCLEO

A formatação dos artefatos do WhatsApp acontece no back-end, em `domain/whatsapp/`, como
**módulo de funções puras** que **devolvem `string`**. O adaptador só decide o destino (CLI
imprime; HTTP devolve `text/plain`); na Entrega 2, o front **apenas copia** (Clipboard API).
Nunca montar a string do WhatsApp na tela. (Arquitetura §4.9/§5.3; Roteiro §3.1 e Fase 2.)

### 3.5 A regra de dependência aponta para dentro

`interface → serviços → domínio`. Os **repositórios** isolam o banco (Prisma). **O domínio
não conhece interface nem Prisma.** Construímos e raciocinamos **de dentro para fora**.
(Detalhe na seção 5.)

### 3.6 Pontuação é só o tempo normal (90 min)

Prorrogação e pênaltis **não contam**, mesmo no mata-mata. Consequência direta: **empate é
um palpite válido**, ainda que o jogo real seja decidido depois. Nunca modelar "casa/fora"
ou "mando de campo" — as posições esquerda/direita do jogo são **posicionais** (só importam
para o placar: 2×1 ≠ 1×2).

### 3.7 Correções são sempre livres

O organizador é o único operador e pode **editar palpites e corrigir resultados a qualquer
momento — não há trava**. Qualquer correção **recalcula automaticamente** rodada e
classificação. O "ciclo de vida da rodada" é um **guia, não uma trava**.

### 3.8 Single-user de verdade (e auth só na Entrega 2)

Sem cadastro público, OAuth, papéis, recuperação social de senha ou qualquer infra
multiusuário. **Na Entrega 1 não há autenticação** — e isso é **correto, não preguiça**: o
modelo de ameaça que a auth defende (acesso remoto, múltiplos usuários) **não existe** num
programa local de usuário único na própria máquina. Auth passa a fazer sentido exatamente
quando o sistema fica **online** (Entrega 2), e aí é **mínima e correta** (seção 4). Isso é
segurança proporcional ao uso (funcional §16; roteiro §2.2).

### 3.9 Nada de over-engineering

Sem Redis, filas, microsserviços, GraphQL ou Kubernetes. Lista completa na seção 14. A
maturidade aqui é **não** trazer complexidade que o problema não pede.

---

## 4. Stack e versões (Arquitetura §3) — com a entrega de cada peça

As **decisões de stack** valem para o projeto todo. A coluna "Entra em" diz **quando** cada
peça é construída, segundo a divisão em duas entregas (roteiro v2). (E1 = Entrega 1; E2 =
Entrega 2.)

| Camada | Decisão | Entra em | Observações |
|---|---|---|---|
| Linguagem | **TypeScript** | E1 | Back (e front na E2). `strict: true` desde o 1º arquivo. |
| Runtime | **Node.js 24 (Active LTS)** | E1 | Fixar a major em `engines` e na imagem Docker. |
| Banco | **PostgreSQL** | **E1 (local via Docker)** | O **mesmo motor** local (E1) e gerenciado (E2) — ver Roteiro Fase 3. |
| Acesso a dados | **Prisma** (ORM + migrations) | E1 | Ligar log de queries e **ler o SQL gerado** (aprendizado). |
| Validação | **Zod** | E1 | Vive **no adaptador** (CLI na E1; HTTP na E2). Mesmo schema reusado. Valida o `.env` no boot (E2). |
| Testes | **Vitest** | E1 | Prioridade máxima no núcleo de domínio. |
| Lint/Format | **Biome** | E1 | Ferramenta única. |
| Adaptador (E1) | **Terminal / CLI** | **E1** | Estilo (menu vs subcomandos) **a ratificar** — ver seção 13. |
| Framework HTTP | **Fastify** | **E2** | REST; exportações retornam `text/plain`. NestJS adiado; Express alternativa. |
| Autenticação | **Sessão por cookie httpOnly** | **E2** | Senha com **argon2id**. HTTPS obrigatório. (Não existe na E1.) |
| Frontend | **React + Vite + TS + Tailwind** | **E2** | SPA consumindo a API. shadcn/ui opcional. |
| Empacotamento | **Docker** | E1 (Postgres) / E2 (app) | Postgres local na E1; imagem da app no deploy (E2). |
| Deploy | **PaaS → VPS** | **E2** | PaaS (Railway/Render/Fly) para validar; VPS Linux + Nginx como evolução. |

**Ainda em aberto** (decidir na implementação, não inventar antes da hora): **estilo do
adaptador de terminal** (decisão nova, ratificar na arquitetura — seção 13); PaaS específico
e provedor de Postgres gerenciado (Neon vs Supabase); Prisma vs Drizzle após protótipo
curto; Tailwind puro vs shadcn/ui. (Arquitetura §13; Roteiro Fase 4.)

---

## 5. Arquitetura: núcleo, adaptadores e regra de dependência

Arquitetura em camadas com a regra de negócio isolada, e o **núcleo plugável a adaptadores**.
**Dependências apontam para dentro.**

```
        ENTREGA 1                                   ENTREGA 2
   ┌──────────────────┐                  ┌──────────────────────────────┐
   │  Adaptador CLI    │                  │  Adaptador HTTP (Fastify)     │
   │  (terminal)       │                  │  + Zod + auth (cookie)        │
   │  parse → serviço  │                  │  rota → serviço → JSON/texto  │──▶ Front React
   │  → imprime        │                  └───────────────┬──────────────┘     (só consome
   └─────────┬─────────┘                                  │                     e copia)
             │                                            │
             └──────────────────┬─────────────────────────┘
                                 ▼
                ┌──────────────────────────────────────────────┐
                │            NÚCLEO DA APLICAÇÃO                 │
                │  Serviços (orquestram, SEM interface/SQL/HTTP) │
                │            │                                   │
                │            ▼                                   │
                │  Domínio: funções puras + constantes +         │
                │  formatadores WhatsApp (devolvem string)       │   ┌────────────────────┐
                │  SEM framework / SEM banco / SEM interface      │   │ Repositórios        │
                └────────────────────────────────────────────────┘   │ (Prisma) — ÚNICA    │
                              ▲                                       │ camada que fala     │
                              └───────────────────────────────────── │ com o banco         │
                                                                      └────────────────────┘
```

- **Adaptador (CLI na E1; HTTP na E2):** recebe a entrada crua, **valida com Zod**, chama o
  serviço, e **decide o destino da saída** (imprimir no terminal / devolver JSON ou
  `text/plain`). **Não calcula nada.**
- **Serviço:** orquestra repositório(s) + funções de domínio (ex.: registrar resultado →
  recalcular → gerar resumo). **Não conhece SQL, nem terminal, nem HTTP.** É o código que a
  Entrega 2 reusa intacto.
- **Repositório:** o único que importa Prisma. Lê/escreve **dados crus**.
- **Domínio:** funções puras (entram dados, saem dados, sem efeito colateral) + formatadores
  que devolvem `string`. É o cérebro. Testável sem subir nada.

---

## 6. Estrutura de pastas (Arquitetura §5.5; Roteiro Fase 0)

Duas pastas-irmãs no mesmo repositório. **Não** é monorepo com ferramenta dedicada (seria
over-engineering). O adaptador da **Entrega 1** é `cli/`; a **Entrega 2** acrescentou
`http/` (já populado) **sobre os mesmos `services/`**. `frontend/` segue como reserva
(preenchida nas Fases 7–8). A árvore abaixo reflete o estado atual do repositório.

```
.
├── CLAUDE.md                                       # este arquivo
├── documentacao_oficial_bolao.md                   # funcional v8 (verdade do comportamento)
├── documentacao_arquitetura_bolao.md               # arquitetura v1 (verdade da stack)
├── documentacao_roteiro_desenvolvimento_bolao.md   # roteiro v2 (verdade da ordem)
├── render.yaml                                     # blueprint do deploy de fumaça (Render — Fase 6)
│
├── backend/
│   ├── src/
│   │   ├── domain/            # regras PURAS + constantes (sem framework/banco/interface)
│   │   │   ├── pontuacao.ts   #   (+ classificacao, pagamento, premiacao, estatisticas,
│   │   │   │                  #    palpites, constantes, erros)
│   │   │   └── whatsapp/      #   formatadores dos 8 artefatos (puros, devolvem string)
│   │   ├── repositories/      # acesso a dados (Prisma) — único que fala com o banco
│   │   ├── services/          # casos de uso / orquestração — AGNÓSTICOS de interface
│   │   ├── schemas/           # schemas Zod NEUTROS — fonte única CLI + HTTP (+ comuns.ts)
│   │   ├── shared/            # utilitários compartilhados entre adaptadores (ex.: rotulos.ts)
│   │   ├── config/            # env validado (Zod) + conexão Prisma
│   │   ├── cli/               # ★ adaptador de terminal (Entrega 1)
│   │   │   ├── main.ts        #   ponto de entrada do menu
│   │   │   ├── menus/         #   um submenu por área (participantes, pagamentos, ...)
│   │   │   └── rotulos.ts     #   re-export dos rótulos de shared/ (compat dos menus)
│   │   └── http/              # adaptador HTTP (Entrega 2, Fastify)
│   │       ├── app.ts         #   buildApp: erro central + sessão + escopo protegido
│   │       ├── server.ts      #   boot: valida o .env e sobe o Fastify
│   │       ├── auth.ts        #   sessão por cookie + login/logout + exigirSessao
│   │       └── routes/        #   uma rota por recurso (participantes, rodadas, ...)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/        # histórico de migrations (migrate deploy em produção)
│   │   └── seed.ts            # catálogo de seleções (dado de referência)
│   ├── scripts/               # utilitários: gerar-hash, preparar banco de teste, backup
│   ├── tests/                 # espelha domain/, services/, cli/, http/ (+ integration/)
│   ├── docker-compose.yml     # Postgres local
│   ├── package.json           # engines: node 24
│   ├── tsconfig.json          # strict: true (typecheck; noEmit)
│   └── tsconfig.build.json    # build de produção: emite src/ → dist/
│
└── frontend/                  # hoje só um README (reserva); estrutura planejada p/ Fases 7–8:
    └── src/
        ├── pages/             # telas: login, painel, participantes, perfil, ...
        ├── components/        # inclui o "Copiar para WhatsApp" compartilhado
        ├── api/               # cliente HTTP — conhece o contrato da API
        └── lib/
```

> A separação `domain / services / repositories / (cli|http)` é **inegociável** (seção 5).
> `cli/` e `http/` são **adaptadores intercambiáveis** sobre os mesmos `services/`; os
> `schemas/` Zod são **fonte única** consumida pelos dois.

---

## 7. Regras de negócio essenciais — cola rápida (Funcional §8)

Resumo de bolso. A **fonte de verdade é o funcional §8.** Em dúvida, vá lá. **Estas regras
não mudaram com a divisão em duas entregas** — valem nas duas.

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
- **"Exibir como pago no grupo"** (funcional §8.8.1): booleano **ortogonal** por participante
  (padrão `false`, mesmo padrão de `isento`). É **override de APRESENTAÇÃO, não um status** —
  **não** se cria um terceiro valor no enum. O `status` continua sendo a **verdade**; o
  sinalizador **só maquia a exportação** do WhatsApp. É **input** do organizador (por isso se
  grava — **não** é derivado armazenado; ver §3.2). Implementação canônica:
  - função pura `statusPublico({status, exibirComoPago})` → `PAGO` se `status==="PAGO"` **ou**
    `exibirComoPago`, senão `PENDENTE`;
  - **uma só** função de totais (`calcularTotaisPagamento`) **reusada com duas entradas**:
    status **reais** (visão interna) **ou** status **públicos** (visão de exportação) — nunca
    uma segunda soma;
  - **exportação consistente**: na visão pública o maquiado conta como pago **também** em
    `Recebido`/`Falta` e no **prêmio** (só a exportação usa `listarPagamentosPublico`; painel,
    CLI-listar e tabela do front usam `listarPagamentos`, real). `Esperado`/`prêmio potencial`
    independem de status → iguais nas duas visões.
  - **visão interna nunca mostra "Pago" puro** para o maquiado: exibe o status **real** +
    marcador discreto (front: ícone + texto legível por si, não só `title`; CLI: `(exibido
    como pago)`).

### 7.5 Constantes do domínio

`VALOR_BASE = 40`, `DESCONTO_POR_INDICACAO = 5`, `PISO = 5`, `FRACAO_PREMIACAO = 0.75`
(75% do pote → premiação; os 25% restantes → ganho do organizador; funcional §8.9). Ficam
**nomeadas num único módulo de configuração de domínio** — nunca espalhadas como números
mágicos. Se a regra mudar, muda num lugar só. (Arquitetura §5.2; Roteiro Fase 1 passo 2.)

---

## 8. Convenções de código (Clean Code aplicado a ESTE projeto)

### 8.1 Funções e responsabilidade

- **Funções pequenas, com uma responsabilidade.** Uma função de domínio calcula; um serviço
  orquestra; um adaptador (CLI/HTTP) traduz e imprime/responde. Não misture os três.
- **Funções de domínio são puras:** sem ler banco, sem formatar destino, sem logar, sem
  efeito colateral. Entram dados, saem dados.
- **Serviços são agnósticos de interface** (princípio 3.1): nunca `console.log`, `req`/`res`
  ou tipos de framework dentro deles.

### 8.2 Nomes

- Nomes **revelam intenção**: `calcularValorAPagar`, `participantesSemPalpite`,
  `ordenarClassificacao`, `registrarResultado` — não `calc`, `proc`, `handle2`.
- Tipos bem nomeados evitam trocar argumentos: **`Palpite` ≠ `Resultado`**. Modele a forma
  do dado antes da lógica (`{ golsEsquerda: number; golsDireita: number }`; pontos como
  `0 | 1 | 3`; estados como uniões de strings). O compilador passa a barrar o impossível.

### 8.3 Tipagem

- `strict: true` obrigatório. **Evitar `any`** — se aparecer, é sinal de modelagem
  faltando, não de pressa justificada.
- Os tipos do Zod são **inferidos** dos schemas (`z.infer`), mantendo **fonte única** entre
  validação em runtime e tipo em compile-time. Não duplicar a tipagem à mão.

### 8.4 Sem duplicação, mas sem abstração prematura

- Query repetida → **extrair uma função**, nunca criar coluna derivada (seção 3.2).
- Não criar camadas de abstração "para o futuro". Abstraia quando a duplicação existir e
  doer, não antes.

### 8.5 Comentários

- O código se explica pelo nome; comente o **porquê**, não o **o quê**. Um comentário bom
  registra uma decisão não óbvia ("posicional, não é mando de campo — ver Funcional §14").
- Comentário que repete o código é ruído; remova.

### 8.6 Erros

- **Erros são de domínio, tratados no adaptador** (princípio 3.1). O serviço lança um erro
  tipado; o **CLI** traduz em mensagem clara + código de saída; o **HTTP** (E2) em status
  code coerente. Não espalhar `try/catch` que engole erro pela aplicação.
- Na Entrega 2, o `.env` é validado **no boot** com Zod — falta de variável essencial
  **derruba o boot**, não estoura no meio de uma requisição.

### 8.7 Tamanho e foco dos arquivos

- Um formatador por artefato em `domain/whatsapp/`. Um repositório por agregado. Arquivos
  coesos e pequenos vencem arquivos-monolito.

### 8.8 Manutenção e evolução como critério

Toda escolha responde: *"isso facilita ou dificulta mexer aqui daqui a três meses?"* Se a
resposta for "dificulta", reconsidere — mesmo que seja mais rápido agora.

---

## 9. Idioma e nomenclatura

- **Domínio em português** (vocabulário do projeto e dos documentos): `Participante`,
  `Rodada`, `Jogo`, `Palpite`, `Selecao`, `calcularPontos`, `valorAPagar`. Mantém o código
  alinhado ao funcional e reduz tradução mental.
- **Termos técnicos universais** ficam no original (`repository`, `service`, `controller`,
  `schema`, `seed`, `preHandler`, `adapter`). Não force tradução que ninguém usa.
- **Mensagens de commit e documentação:** português.
- **Consistência acima de tudo:** escolhido o padrão, repetir. Não misturar `getParticipante`
  com `buscarParticipante` no mesmo módulo.

---

## 10. Testes (Arquitetura §8; Roteiro Fases 1–2)

**O risco do projeto está na regra de negócio, não na escala.** A estratégia reflete isso.

- **Unitários no núcleo de domínio = prioridade máxima.** `calcularPontos`,
  `ordenarClassificacao`, `calcularValorAPagar`, `participantesSemPalpite`, totais de
  pagamento e os formatadores WhatsApp. **Cobertura alta aqui** — é onde mora o risco.
- **TDD no domínio:** o funcional **já entregou os casos prontos** (§8.3 e §8.7). Escreva o
  teste **antes** da função (vermelho → verde → refatora).
- **Testes de serviço/integração** nos fluxos críticos: "registrar resultado recalcula
  rodada e classificação" e a **regra de indicação** (desconto vale sem pagamento; só
  direta — fácil de implementar errado). **Estes testes valem nas duas entregas**, porque
  exercitam o núcleo agnóstico, não a interface.
- **Adaptador CLI (E1):** teste leve, opcional, dos comandos principais. O peso fica no
  serviço.
- **Testes de API (E2, leves):** caminhos felizes dos endpoints, já autenticados.
- **Frontend (E2):** testes pontuais de componentes de lista/exportação. Sem exagero.

> Os formatadores são testados contra a **estrutura** dos exemplos da §13 do funcional, não
> contra o texto exato (o doc diz que o texto é ilustrativo). Verificar: sem tabela, com
> emoji/monoespaçado, informação correta, e bordas (apelido p/ homônimos; lista de 63 nomes
> não quebra).

---

## 11. Comandos do dia a dia

> Convenção que **estabelecemos na Fase 0**. Se um script ainda não existir no
> `package.json`, criar seguindo estes nomes. Comandos `npm` (ajuste se usar pnpm/yarn —
> mas mantenha um só gerenciador no projeto).

**Entrega 1 — back-end via terminal** (rodar de `backend/`):

```bash
# Banco local (Postgres idêntico ao de produção) — Fase 3
docker compose up -d                   # sobe o Postgres local
docker compose down                    # derruba (volume persiste, salvo se remover)

# Prisma
npx prisma migrate dev --name <nome>   # cria + aplica migration (DESENVOLVIMENTO)
npx prisma generate                    # regenera o client tipado
npx prisma db seed                     # popula o catálogo de seleções
npx prisma studio                      # inspeção visual do banco

# Aplicação (adaptador de terminal)
npm run cli            # abre o sistema no terminal (o "dev loop" da Entrega 1)

# Qualidade
npm run test           # Vitest (uma vez)
npm run test:watch     # Vitest em watch (use no TDD do domínio)
npm run test:coverage  # cobertura (mira no núcleo de domínio)
npm run lint           # Biome — acusa problemas
npm run format         # Biome — formata
npm run check          # Biome — lint + format check (use no CI e antes de commit)

# Backup do banco local (rede de segurança da Entrega 1 — Fase 5)
pg_dump ... > backup_AAAA-MM-DD.sql    # dump periódico; vira insumo da migração na Fase 9
```

**Entrega 2 — HTTP + front** (acrescentados quando chegarmos lá):

```bash
# back-end (Fase 6+)
npm run dev            # sobe o servidor Fastify em watch
npm run build          # compila TypeScript
npm run start          # roda o build
npx prisma migrate deploy   # aplica migrations em PRODUÇÃO (nunca migrate dev em prod)

# front-end (Fases 7–8, rodar de frontend/)
npm run dev      # Vite dev server
npm run build    # build de produção
npm run preview  # serve o build localmente
```

> **`migrate dev` é desenvolvimento; `migrate deploy` é produção.** Nunca rodar `migrate
> dev` em produção (ele cria/altera schema). (Roteiro Fase 3 e Fase 9.)

---

## 12. Git: commits, branches e disciplina

- **Commits pequenos e com sentido** — um por unidade lógica: `"função de pontuação +
  testes"`, `"repositório de participantes"`, `"comando de terminal de pagamentos"`.
  Histórico legível é manutenção barata e permite voltar atrás sem perder tudo.
- **Cada commit deixa o projeto verde** (lint + testes passando). Não commitar com a suíte
  quebrada.
- **`.gitignore` desde o início:** `node_modules`, `dist`, `.env`, artefatos de build,
  banco/volume local, dumps de backup. **Segredos nunca entram no versionamento** — nem no
  código, nem na imagem Docker. São variáveis de ambiente. (Na E1 quase não há segredos,
  mas o hábito começa agora — roteiro Fase 0.)
- **CI cedo (Roteiro Fase 0 e §3.9):** a cada push, instalar deps → `lint` → `test`. Monte
  o esqueleto na Fase 0 (validando o teste trivial) e ele cresce com os testes reais.

---

## 13. Roteiro de fases — onde estamos e o que vem (Roteiro v2)

Construímos **de dentro para fora** e **risco primeiro**, dentro de cada entrega. **Não pule
a ordem** e **não avance sem o "Pronto quando" da fase atual satisfeito** (o roteiro traz o
critério objetivo de cada fase).

### ENTREGA 1 — sistema funcional via terminal (meta 27/06)

| Fase | Entrega central | Foco |
|---|---|---|
| **0** | Repo, TS estrito, Biome, Vitest, estrutura de pastas (com `cli/`), CI mínimo, README | Bancada |
| **1** | Funções puras: pontuação, desempate, valor a pagar, "quem não palpitou" (TDD) | Domínio |
| **2** | Formatadores puros dos 8 artefatos WhatsApp (sem tabela, emoji/monoespaçado) | Domínio (saída) |
| **3** | Schema Prisma (indicação auto-referente + `@@unique` do palpite), migrations, seed, **Postgres local via Docker** | Banco |
| **4** | **Features via terminal** (fatias verticais por urgência) — ver ordem abaixo | Repos + serviços + CLI |
| **5** | Fechamento: **backup do banco local**, usabilidade mínima no terminal, runbook do organizador, conferência dos casos de borda de domínio | Operação local |

**Ordem interna da Fase 4** (cada fatia: repositório → serviço **agnóstico** → schema Zod →
comando de terminal → testes):

- **Bloco A — o que já está acontecendo agora (antes dos jogos):**
  1. **Participantes (CRUD)** — a fatia fundadora; fixa o padrão de camadas. Inclui apelido,
     status e "indicado por" (selecionando participante existente — indicação auto-referente).
  2. **Exportação da lista de participantes** (artefato 13.6).
  3. **Pagamentos** — valor a pagar **derivado** + status manual + totais derivados.
  4. **Exportação de pagamentos** (artefato 13.7, totais na última linha).
  > **Marco antes de 28/06:** com o Bloco A, o organizador já "agita o bolão" (cadastra,
  > controla pagamentos/indicações e gera os textos para colar no grupo).
- **Bloco B — quando os jogos começarem (28/06):**
  5. **Catálogo de seleções** (apoiado no seed).
  6. **Rodadas e Jogos** — montar rodada par a par; ciclo de vida (guia, não trava);
     mensagem da rodada (13.1).
  7. **Palpites** — registrar por participante (respeita `@@unique`); "quem não palpitou";
     tabela de palpites (13.2) e pendências (13.8).
  8. **Resultados e Pontuação** — registrar placar **dispara recálculo** sob demanda;
     resumo do jogo (13.3), resumo da rodada (13.4), classificação (13.5).
  9. **Resumo geral no terminal** (o "painel" desta entrega) — agrega tudo, por isso é o
     último.

### ENTREGA 2 — sistema acabado (front, online, multi-dispositivo, auth)

| Fase | Entrega central | Foco |
|---|---|---|
| **6** | **Adaptador HTTP (Fastify)** + Zod na fronteira + `.env` validado + **auth single-user** (argon2id, cookie httpOnly) + rota protegida — **sobre os mesmos serviços**. **★ Deploy de fumaça** (esqueleto ambulante) ao final | HTTP + segurança |
| **7** | Frontend base: Vite/React/TS/Tailwind, cliente HTTP, roteamento, layout, sessão, botão "Copiar" | Frontend base |
| **8** | Telas: Login → Participantes → Pagamentos → Rodadas/Montar → Rodada(detalhe) → Perfil → Painel | Frontend telas |
| **9** | Deploy de produção: Docker, PaaS + Postgres gerenciado, HTTPS, `migrate deploy`, **migração dos dados locais → central (janela de virada)**; depois VPS+Nginx (opcional) | Infra |
| **10** | Endurecimento: casos de borda na web, responsividade real, acessibilidade básica, README+runbook, CI completo | Qualidade |

**Notas de ordem que mais geram erro:**

- **HTTP/auth/front/deploy são Entrega 2.** Na Entrega 1 o adaptador é o **terminal**. Não
  monte Fastify na E1 só porque a arquitetura v1 fala dele cedo (ver aviso da seção 2).
- O **painel/resumo geral** agrega tudo → é a **última** fatia da Fase 4 e a **última** tela
  da Fase 8, embora seja a "home" do produto. Não comece por ele.
- **Exportações vêm depois de Resultados/Pontuação** — o resumo do jogo precisa dos pontos.
- **Auth vem junto do bootstrap HTTP** (Fase 6), antes das rotas de feature, para toda rota
  nascer protegida e todo teste de API já ser escrito autenticado.
- **Deploy aparece na Entrega 2:** cedo dentro dela (Fase 6, deploy de fumaça) e caprichado
  no fim (Fase 9). **Janela de virada:** ao subir online, o organizador para de usar o
  terminal e passa para a web, para os dados não divergirem.

> **★ Decisão nova a confirmar (fora dos três documentos-fonte): estilo do adaptador de
> terminal.** Não está definido em nenhum dos três e **pertence à arquitetura** — ratifique
> lá antes de implementar. Opções: **(a) menu interativo** (recomendado — confortável para
> operar rápido durante os jogos) ou **(b) subcomandos** (`bolao participante add`… — mais
> "unix", scriptável). Trate como **em aberto** até constar na arquitetura. (Roteiro Fase 4.)

> **Antes de iniciar uma fase**, releia a fase correspondente no roteiro (Objetivo / Por que
> está aqui / Passos / Pronto quando / Armadilhas). Este `CLAUDE.md` resume; o roteiro tem o
> detalhe e o porquê.

---

## 14. Anti-decisões — o que NÃO fazer (Arquitetura §11; Roteiro §5)

Recusar estas coisas é **parte da decisão técnica**. Se você se pegar propondo qualquer uma,
pare e questione se o problema realmente pede.

- ❌ **Acoplar interface ao núcleo** — `console.log`, `req`/`res` ou tipos de framework dentro
  de `domain/`, `services/` ou `repositories/`. Viola o princípio 3.1 (a regra nº 1).
- ❌ **Montar HTTP/Fastify, auth ou front na Entrega 1** — são Entrega 2. Na E1, o adaptador
  é o terminal.
- ❌ **Coluna para dado derivado** — viola o princípio 3.2.
- ❌ **Gerar/formatar texto WhatsApp na interface** — é no núcleo, função pura (3.4).
- ❌ **Modelar mando de campo / casa-fora** — as posições são só posicionais (3.6).
- ❌ **SQLite "porque é local"** — usamos **Postgres** mesmo local, para o mesmo motor servir
  E1 e E2 sem migração de banco arriscada (roteiro Fase 3).
- ❌ **Biblioteca de auth pesada** (OAuth, papéis, recuperação social) — é single-user, e auth
  só na E2.
- ❌ **Redis / cache** — não há o que cachear; recálculo instantâneo (~2 mil registros).
- ❌ **Filas (Kafka/RabbitMQ)** — não há processamento assíncrono.
- ❌ **Microsserviços** — é um **monólito modular**, e isso está **correto**.
- ❌ **GraphQL** — REST resolve com menos peças (na E2).
- ❌ **Kubernetes** / qualquer otimização "para escalar" — o gargalo não existe.
- ❌ **Monorepo com ferramenta dedicada** — duas pastas-irmãs bastam.

### 14.1 Dívidas técnicas conscientes (assumidas de propósito)

Diferente das anti-decisões acima (que recusamos **sempre**), estas são escolhas
**deliberadas**, com custo conhecido e caminho de saída — registradas aqui para não
serem "descobertas" como problema numa auditoria futura.

- **Prisma fixado em v6.** O Prisma está pinado em **v6** de propósito: o **v7** mudou o
  modelo de geração do client (gerador `prisma-client` com `output` obrigatório) e a
  config de seed (`package.json#prisma` → `prisma.config.ts`), o que contraria o fluxo
  clássico (`import { PrismaClient } from "@prisma/client"`) que os repositórios usam.
  Como o Prisma está isolado atrás da camada de **repositórios**, a migração para o v7 é
  **localizada e de baixo risco** quando for desejada. **Caminho de migração:** subir
  `prisma` e `@prisma/client` para v7, mover a config de seed para `prisma.config.ts`,
  ajustar o gerador no `schema.prisma` e revalidar os repositórios. **Não há urgência** —
  o v6 é estável e suportado. (Relacionado: o build já emite o aviso de deprecação de
  `package.json#prisma`, que será removido no v7 — faz parte desta mesma dívida.)
- **`render.yaml` não provisiona o banco (Fase 9).** O blueprint atual descreve só o Web
  Service; o Postgres é criado à mão e a `DATABASE_URL` entra como segredo (`sync: false`).
  Na **Fase 9**, declarar o banco no blueprint **ou** documentar o passo manual da criação.

---

## 15. Como trabalhar comigo (postura do Claude Code neste projeto)

O autor é estudante de back-end e quer **aprender, não só executar**. Então:

1. **Explique o porquê, não só o quê.** Ao escrever ou alterar código, detalhe a lógica, o
   fluxo, a função de cada parte, o motivo das escolhas técnicas, os trade-offs, possíveis
   problemas e melhorias. Profundidade > solução pronta e muda.
2. **Vigie o núcleo agnóstico (regra nº 1).** Se uma solução pedir `console.log`/`req`/`res`
   num serviço, ou formatação na interface, **proponha a alternativa correta** (adaptador
   imprime/responde; serviço devolve dado/string).
3. **Respeite a ordem das fases e a entrega certa.** Não monte HTTP/auth/front na Entrega 1.
   Não adiante código de fase futura "porque é fácil". Se algo posterior for necessário,
   explique por que e confirme antes.
4. **Não viole os princípios da seção 3.** Derivado armazenado, regra na rota/comando, texto
   WhatsApp na interface → proponha o caminho certo, não o atalho.
5. **Quando faltar decisão, pergunte ou proponha explicitamente.** Marque "isto está fora do
   que os documentos decidiram" (ex.: estilo do adaptador de terminal — seção 13).
6. **TDD no domínio.** Para regra de negócio, escreva o teste primeiro (os casos já estão nos
   documentos) e só então a implementação.
7. **Antes de um arquivo grande, mostre o plano.** Para mudanças não triviais, descreva a
   abordagem (quais camadas toca, quais funções, quais testes) e siga.
8. **Cada entrega fecha com seu "Pronto quando".** Não declare uma fase/feature concluída sem
   o critério objetivo satisfeito.
9. **Mantenha o chão de trás firme.** Commits pequenos, lint e testes verdes, sem dívida
   silenciosa.

---

## 16. Checklists (Definition of Done por tipo de mudança)

**Nova função de domínio (regra de negócio):**
- [ ] É função **pura** (sem banco, sem interface, sem efeito colateral)
- [ ] Tipos bem nomeados (`Palpite` ≠ `Resultado`); sem `any`
- [ ] Teste escrito **antes** (TDD), cobrindo os casos dos documentos + bordas
- [ ] Constantes vêm do módulo de config de domínio (sem número mágico)
- [ ] Nenhum dado derivado foi persistido

**Novo formatador WhatsApp:**
- [ ] Em `domain/whatsapp/`, função **pura**, **recebe** os pontos já calculados, **devolve `string`**
- [ ] **Sem tabela**; usa `*negrito*`, `_itálico_`, monoespaçado, emoji
- [ ] **Não imprime** — quem imprime/responde é o adaptador (3.1)
- [ ] Testado contra a **estrutura** do exemplo da §13 + bordas (apelido, 63 nomes)

**Nova feature via terminal (fatia vertical da Entrega 1 — Fase 4):**
- [ ] Padrão completo: **repositório → serviço agnóstico → schema Zod → comando de terminal → testes**
- [ ] **Serviço sem interface:** nada de `console.log`/leitura de terminal; devolve dado/string
- [ ] Regra de negócio **só no domínio**; serviço orquestra; repo persiste; **comando traduz e imprime**
- [ ] Erros de domínio tipados; **comando** os traduz em mensagem + código de saída
- [ ] Schema Zod na **entrada do comando** (será reusado pelo HTTP na E2)
- [ ] Exportação imprime o `text/plain` do formatador (quando aplicável)
- [ ] Teste de serviço no fluxo crítico (+ teste leve do comando, opcional)

**Novo endpoint HTTP (Entrega 2 — Fase 6):**
- [ ] Rota **fina** sobre o **mesmo serviço** já existente da Entrega 1 (não reescreve regra)
- [ ] Reusa o **schema Zod** da E1; erros tratados centralmente → status code
- [ ] Sob o `preHandler` de auth (sem cookie → 401)
- [ ] Exportação retorna `text/plain` formatado (se aplicável)
- [ ] Teste de API no caminho feliz (autenticado)

**Mudança de schema (Prisma — Fase 3):**
- [ ] Nenhuma coluna para dado derivado
- [ ] Indicação **auto-referente** preservada; `@@unique([participanteId, jogoId])` intacto
- [ ] Posições do jogo seguem **posicionais** (não vira mando de campo)
- [ ] Migration gerada e aplicada no banco local; SQL gerado conferido

**Nova tela (Entrega 2 — Fase 8):**
- [ ] **Só consome** a API (não recalcula, não formata WhatsApp)
- [ ] `fetch` centralizado em `api/` (não espalhado por componente)
- [ ] Lista tem **busca/filtro/ordenação** e **botão exportar**
- [ ] Confortável **no celular e no desktop** (testar no aparelho real)

---

## 17. Glossário rápido (Funcional §4; Roteiro §1–2)

- **Organizador** — única pessoa que usa o sistema. Dono do bolão.
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
- **Entrega 1 / Entrega 2** — as duas entregas do produto (terminal/local → front/online).
- **Fase 0…10** — as etapas de construção (não confundir com as entregas).
- **Núcleo agnóstico de interface** — domínio + serviços + repositórios que não conhecem
  terminal nem HTTP; a base reusada pelas duas entregas.
- **Adaptador** — a casca que liga o núcleo à interface: **CLI** (Entrega 1) ou **HTTP**
  (Entrega 2). Valida (Zod), chama o serviço, decide o destino da saída.
- **Janela de virada** — momento em que o sistema online assume e o organizador para de usar
  o terminal, para os dados não divergirem (Fase 9).
- **Esqueleto ambulante** — fio fino atravessando build→banco→migration→HTTPS→login, provado
  cedo na Entrega 2 (Fase 6).

---

> **Lembrete final:** este arquivo é o resumo operacional. A verdade detalhada está nos três
> documentos — funcional v8 (comportamento + ordem de entrega), arquitetura v1 (stack),
> roteiro v2 (ordem de construção). Em conflito, os documentos vencem este `CLAUDE.md`.
> **Mantenha o núcleo agnóstico de interface (regra nº 1)**, construa de dentro para fora,
> ataque o risco primeiro, não armazene derivado, mantenha a regra no domínio, e gere o texto
> do WhatsApp no núcleo. Na Entrega 1 o adaptador é o terminal; a Entrega 2 só acrescenta
> adaptadores sobre o mesmo cérebro confiável.