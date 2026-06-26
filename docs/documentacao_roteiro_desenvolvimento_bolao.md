# Documento de Roteiro de Desenvolvimento — Sistema de Gestão de Bolão (Copa do Mundo 2026)

**Versão:** 2 — roteiro de execução (companheiro do documento de contexto funcional v8 e do documento de arquitetura v1)
**Atualizado em:** 22/06/2026
**Natureza:** documento de **ordem de construção**. Define *em que sequência* o sistema descrito nos dois documentos anteriores deve ser construído, e *por quê* nessa ordem. Não redefine regras de negócio (essas vivem no documento funcional) nem reescolhe ferramentas (essas vivem no documento de arquitetura). Aqui o assunto é **o caminho**: o que fazer primeiro, o que fazer depois, e como saber que cada etapa terminou bem antes de avançar para a próxima.

Regra de precedência: em conflito, vale o **documento funcional** para comportamento e o **documento de arquitetura** para stack. Este documento organiza a execução dos dois.

---

## Histórico de versões

| Versão | O que mudou |
|--------|-------------|
| **1** | Documento criado. Princípios que governam a ordem; visão geral das fases; detalhamento de cada fase (objetivo, justificativa da posição, passos, critério de pronto, armadilhas); riscos transversais; checklist final. |
| **2** | **Reorganizado em torno da entrega em duas fases introduzida no funcional v8 (seção 2).** A ordem passa a refletir **Entrega 1** (sistema funcional **via terminal**, local, com banco, sem front/deploy/auth — meta **27/06**) e **Entrega 2** (front-end, online, multi-dispositivo, autenticação, deploy). Acrescentado o princípio decisivo do **núcleo agnóstico de interface** (a regra de negócio separada da camada de terminal, para a Entrega 2 reaproveitar tudo — funcional v8 §2 e §18). HTTP/Fastify, autenticação, frontend e deploy **movidos para a Entrega 2**; **adaptador de terminal (CLI)** inserido na Entrega 1. Acrescentadas a justificativa de **manter Postgres mesmo local** e a etapa de **migração dos dados locais → central** ao subir online. Registrada uma **decisão nova a confirmar** (estilo da interface de terminal), por estar fora dos três documentos-fonte. |

---

## 1. Propósito e como ler este documento

Você já tem o **o quê** (funcional v8) e o **como** (arquitetura v1). Falta o **em que ordem** — e essa é uma decisão de engenharia tão importante quanto as outras duas. Uma ordem ruim faz você construir encanamento antes de saber se o cérebro funciona, descobrir o deploy só no fim, ou retrabalhar camadas inteiras porque a interface foi acoplada à regra. Uma ordem boa faz cada etapa apoiar-se firme na anterior, com um ponto de verificação claro entre elas.

**Atenção a uma ambiguidade de vocabulário.** O documento funcional v8 fala em "Fase 1" e "Fase 2" para se referir às **duas entregas do produto** (primeiro o terminal, depois o front/online). Este roteiro fala em "Fase 0, 1, 2…" para se referir às **etapas de construção**. Para não confundir, aqui chamamos as duas entregas do produto de **Entrega 1** e **Entrega 2**, e reservamos a palavra "Fase" para as etapas de construção dentro de cada entrega.

Cada fase de construção segue sempre a mesma estrutura, de propósito:

- **Objetivo** — o que essa fase entrega.
- **Por que está aqui** — a justificativa da posição na sequência (o ponto mais importante para o aprendizado).
- **Passos** — a lista ordenada do que fazer.
- **Pronto quando (Definition of Done)** — o critério objetivo para considerar a fase concluída e avançar sem medo.
- **Armadilhas** — os erros típicos que essa fase convida, e como evitá-los.

Leia as seções 2 e 3 inteiras antes de começar. Elas são o "porquê" de toda a ordem; sem elas, as fases viram uma lista de tarefas sem alma.

---

## 2. A divisão em duas entregas (o que muda e por quê)

O funcional v8 dividiu a entrega do produto em duas fases por uma restrição real de tempo: o mata-mata começa no fim de junho e o prazo prático para o sistema estar **operando** é **27/06/2026**. Nenhuma regra de negócio mudou — mudou só **a ordem de entrega**.

- **Entrega 1 — Sistema funcional (meta 27/06).** Uso **local, no PC do organizador, via terminal** (linha de comando). **Banco de dados local** e persistente (o bolão dura semanas, não pode perder nada). **Sem deploy, sem multi-dispositivo, sem autenticação** — por ser local e de uso exclusivo do organizador na própria máquina, login não faz sentido ainda. Funcionalidades de domínio **completas**: participantes/indicações/pagamentos, montar rodadas, palpites, resultados, pontuação/classificação, "quem não palpitou" e **todas as exportações para WhatsApp** (impressas no terminal, prontas para copiar).
- **Entrega 2 — Sistema acabado (depois, com o bolão já em uso).** Front-end web responsivo (as telas da seção 12 do funcional), **online com armazenamento central e multi-dispositivo**, **autenticação pessoal** do organizador e refinamentos de usabilidade (painel visual, busca/filtro/ordenação ricos).

### 2.1 Por que essa divisão **não** joga trabalho fora

O ponto técnico que sustenta tudo está no funcional v8 (§2 e §18): *"o trabalho da Fase 1 não é descartável — ele é a fundação reaproveitada pela Fase 2, desde que a regra de negócio seja escrita separada da interface de terminal."*

Traduzindo para arquitetura: o **núcleo da aplicação** (domínio puro + serviços/casos de uso + repositórios) **não pode conhecer a interface**. Na Entrega 1, quem fala com o usuário é um **adaptador de terminal (CLI)**. Na Entrega 2, entram **dois novos adaptadores** sobre o **mesmo núcleo**: a **API HTTP (Fastify)** e, consumindo-a, o **front-end React**. Se o núcleo for agnóstico de interface, a Entrega 2 só **acrescenta adaptadores** — não reescreve regra.

```
                ┌─────────────────────────────────────────────┐
                │             NÚCLEO DA APLICAÇÃO              │
                │   Domínio puro  +  Serviços  +  Repositórios │   ← construído na ENTREGA 1,
                │   (sem nenhum conhecimento de interface)     │     reaproveitado 100% na ENTREGA 2
                └───────────────▲───────────────▲─────────────┘
                                │               │
          ENTREGA 1 ───────────┘               └─────────── ENTREGA 2
          Adaptador CLI (terminal)              Adaptador HTTP (Fastify + Zod + auth)
                                                          │
                                                          ▼
                                                   Front-end React (consome a API)
```

Esse é o **conceito de portas e adaptadores** (a interface é um detalhe plugável). É o que faz a Entrega 1 valer como fundação, e não como protótipo descartável.

### 2.2 Consequências diretas para a ordem

1. **HTTP/Fastify, autenticação, front-end e deploy saem da Entrega 1 e entram na Entrega 2.** Na Entrega 1, o lugar do HTTP é ocupado por um adaptador de terminal.
2. **A regra "construir de dentro para fora" continua valendo dentro de cada entrega.** A Entrega 1 vai do núcleo de domínio até o terminal; a Entrega 2 vai do adaptador HTTP até as telas.
3. **Dentro da Entrega 1, a ordem das features segue a urgência real** que o funcional v8 registrou: primeiro **participantes + indicações + pagamentos + suas exportações** (é o que já está acontecendo agora — gente entrando, pagando, indicando); depois **rodadas + palpites + resultados + classificação** (entram em uso quando os jogos começarem, 28/06).
4. **Autenticação é uma omissão deliberada e correta na Entrega 1**, não preguiça. O modelo de ameaça que a auth defende (acesso remoto, múltiplos usuários) **não existe** num programa local de usuário único na própria máquina. Auth passa a fazer sentido exatamente quando o sistema fica **online** (Entrega 2). Isso é segurança proporcional ao uso (funcional §16).

---

## 3. Princípios que governam a ordem

Toda a sequência sai dos princípios abaixo. Eles não são genéricos: cada um se conecta a uma característica concreta do **seu** sistema. O primeiro é novo nesta versão e é o mais importante depois da divisão em duas entregas.

### 3.1 Núcleo agnóstico de interface (o princípio que sustenta as duas entregas)

O domínio, os serviços e os repositórios **não conhecem** terminal nem HTTP. Concretamente:

- **Serviços recebem dados tipados e devolvem dados tipados.** Nada de `req`/`res`, nada de `console.log`, nada de tipos do Fastify dentro de um serviço. Um serviço como `registrarResultado(jogoId, placar)` devolve o estado recalculado — quem imprime no terminal ou serializa em JSON é o **adaptador**.
- **A validação de entrada (Zod) vive no adaptador**, transformando o texto cru (argumentos/respostas do terminal, ou o corpo HTTP) no dado tipado que o serviço espera. O **mesmo** schema Zod serve aos dois adaptadores.
- **Os formatadores de WhatsApp devolvem `string`.** O adaptador decide o destino: o CLI imprime no terminal; o HTTP devolve como `text/plain`.
- **Erros são de domínio, mapeados no adaptador.** O serviço lança um erro tipado; o CLI traduz em mensagem + código de saída, o HTTP em status code.

> Se você se pegar importando algo de terminal/Fastify dentro de `domain/`, `services/` ou `repositories/`, **pare** — o núcleo vazou para a interface, e a Entrega 2 vai pagar isso em retrabalho.

### 3.2 Construir de dentro para fora (inside-out)

A regra de dependência aponta **para dentro**: interface → serviços → domínio, com os repositórios isolando o banco. A ordem segue isso: primeiro o **núcleo de domínio** (mais interno, mais estável), depois a persistência, depois os serviços, e só então o adaptador (terminal na Entrega 1; HTTP e telas na Entrega 2). Quando você chega numa camada, tudo que ela precisa **já existe e já foi testado**.

### 3.3 Risco primeiro: o cérebro antes do encanamento

Este **não** é um problema de escala — é de **regra de negócio** (arquitetura §2.2). O risco está em calcular **3/1/0 errado**, ordenar o desempate trocado, ou aplicar o piso de R$5 fora de hora. Por isso a ordem ataca primeiro as funções puras de pontuação, valor a pagar, desempate e formatação — e o funcional **já te entregou os casos de teste prontos** (§8.3 e a tabela da §8.7). O cérebro nasce comprovadamente correto antes de qualquer encanamento.

### 3.4 Cada fase entrega algo verificável

Nenhuma fase começa sem que a anterior tenha o "Pronto quando" satisfeito. Cada fase fecha com um teste que passa, um comando que responde, uma tela que renderiza. Você sempre sabe que o chão atrás de você é firme — e nunca empilha quatro camadas para só então descobrir em qual delas está o bug.

### 3.5 Híbrido: núcleo horizontal, features verticais

O **núcleo puro** (domínio + formatação) e o **schema do banco** são construídos **horizontalmente** (são artefatos pequenos, coesos e interligados — não dá para modelar "meio Participante"). Da camada de serviços para cima, constrói-se **por fatias verticais**: uma feature por vez (repositório → serviço → validação → adaptador → testes), repetindo um padrão estabelecido na fatia mais simples.

### 3.6 "Derivado não se armazena" molda a ordem das leituras

Pontuação, valor a pagar, totais, classificação, placares exatos e "quem não palpitou" **não são colunas** — são calculados na hora (funcional §14; arquitetura §5.4). Logo, toda leitura agregada depende de **duas coisas já existirem**: as funções de cálculo (fase do domínio) **e** os dados crus no banco (repositórios). Por isso elas vêm depois, e o resumo geral ("painel") é a última coisa de cada entrega.

### 3.7 Núcleo completo antes da casca (e backend antes do frontend)

A Entrega 1 inteira é, na prática, **o núcleo + um adaptador mínimo (terminal)**. Só depois de o núcleo estar completo, correto e testável é que a Entrega 2 acrescenta a casca (HTTP, depois telas). Isso reforça a "API/serviço como contrato": a tela é apenas mais um cliente do que já está pronto.

### 3.8 Esqueleto ambulante e deploy cedo — **dentro da Entrega 2**

O deploy aparece só na Entrega 2, mas, **dentro dela**, cedo. Assim que o adaptador HTTP + autenticação funcionar, faça um **deploy de fumaça** (*walking skeleton*): o fio mais fino atravessando build → banco → migration em produção → HTTPS → login, num PaaS. Provar o cano quando ainda é barato evita a clássica surpresa de deploy no último dia. O endurecimento de infra (Docker caprichado, VPS, Nginx, TLS) fica para a fase final.

### 3.9 Commits pequenos e CI desde cedo

Transversal: **commits pequenos e com sentido** (um por unidade lógica) e **CI** (lint + testes a cada push) montado já na Fase 0 e ativado assim que existirem os primeiros testes (Fase 1). Histórico legível é manutenção barata; verificação automática protege cada mudança.

---

## 4. Visão geral das fases

| Entrega | Fase | Nome | Entrega central | Camada / foco |
|---|---|---|---|---|
| **1** | 0 | Fundação e ferramental | Repositório, TS estrito, Biome, Vitest, estrutura de pastas, CI mínimo | Workbench |
| **1** | 1 | Núcleo de domínio (TDD) | Funções puras: pontuação, desempate, valor a pagar, "quem não palpitou" | Domínio |
| **1** | 2 | Formatação WhatsApp | Formatadores puros dos 8 artefatos (seção 13 do funcional) | Domínio (saída) |
| **1** | 3 | Persistência local | Schema Prisma, migrations, seed do catálogo, Postgres local via Docker | Banco |
| **1** | 4 | Features via terminal (fatias verticais, por urgência) | Participantes → Pagamentos → Catálogo → Rodadas/Jogos → Palpites → Resultados/Pontuação → Resumo geral | Serviços + repos + CLI |
| **1** | 5 | Fechamento da Entrega 1 | Usabilidade mínima no terminal, backup do banco local, runbook do organizador | Operação local |
| **2** | 6 | Adaptador HTTP + Autenticação | Fastify, Zod na fronteira, `.env` validado, login/sessão, rota protegida — sobre os mesmos serviços. **→ Deploy de fumaça.** | HTTP + segurança |
| **2** | 7 | Fundação do frontend | Vite/React/TS/Tailwind, cliente HTTP, roteamento, layout, sessão, botão "Copiar" | Frontend base |
| **2** | 8 | Telas do frontend (ordem de dependência) | Login → Participantes → Pagamentos → Rodadas/Montar → Rodada (detalhe) → Perfil → Painel | Frontend telas |
| **2** | 9 | Deploy e infraestrutura + migração dos dados | Docker, PaaS + Postgres gerenciado, HTTPS, `migrate deploy`, **migrar dados locais → central**; depois VPS+Nginx (opcional) | Infra |
| **2** | 10 | Endurecimento e finalização | Casos de borda, responsividade real, acessibilidade básica, README/runbook, CI completo | Qualidade |

---

# ENTREGA 1 — Sistema funcional via terminal (meta 27/06)

> Objetivo da entrega: o organizador já consegue **tocar o bolão de verdade** desde o começo — cadastrar gente, controlar pagamentos e indicações, montar rodadas, lançar palpites e resultados, ver a classificação e **gerar todos os textos do WhatsApp** — tudo localmente, pela linha de comando, com os dados persistidos no banco. Sem tela, sem deploy, sem login.

---

## Fase 0 — Fundação do repositório e ferramental

**Objetivo.** Deixar a bancada montada e correta, para que tudo nasça organizado. Nada de regra de negócio ainda.

**Por que está aqui.** É a base de todas as fases. Ferramental decidido depois vira retrabalho. Fazendo agora, todo arquivo novo já nasce formatado, tipado e testável.

**Passos.**

1. Criar o repositório Git e o `.gitignore` (ignorar `node_modules`, `dist`, `.env`, artefatos de build, banco/volume local). **Segredos nunca entram no versionamento** — mesmo que na Entrega 1 quase não haja segredos, o hábito começa agora.
2. Topologia de pastas: duas pastas-irmãs no mesmo repositório, `backend/` e `frontend/`. A `frontend/` fica **vazia** durante toda a Entrega 1 — é só uma reserva de lugar para a Entrega 2. (Sem monorepo com ferramenta dedicada: seria over-engineering para o tamanho.)
3. Inicializar o **backend**: `package.json` com `engines` fixando **Node 24** (arquitetura T2); `tsconfig.json` em modo **estrito** (`strict: true`); e a estrutura de pastas do doc técnico (§5.5), agora com um lugar explícito para o adaptador de terminal:

   ```
   backend/src/
     domain/         # regras puras + constantes + whatsapp/ (formatadores)
     repositories/   # acesso a dados (Prisma) — único que fala com o banco
     services/       # casos de uso / orquestração — AGNÓSTICOS de interface
     cli/            # adaptador de terminal (ENTREGA 1): parse de entrada, chamada ao serviço, impressão
     config/         # env validado (Zod), conexão
     # http/         # vazio na Entrega 1; será o adaptador HTTP da Entrega 2
   ```

   > A pasta `http/` (do doc de arquitetura) só ganha conteúdo na Entrega 2. Na Entrega 1, o adaptador é `cli/`. Os dois conviverão depois, sobre os mesmos `services/`.

4. Instalar e configurar **Biome** (lint + format numa ferramenta só — T14). Rodar uma vez.
5. Instalar e configurar **Vitest** (T13). Criar um teste trivial só para provar que a suíte roda.
6. Configurar **CI mínimo** (GitHub Actions): a cada push, instalar deps, rodar lint e testes. Por ora valida só o teste trivial, mas o cano de verificação já existe.
7. `README` inicial curto (`install`, `test`, `lint`). Ele cresce ao longo do projeto.

**Pronto quando.** `git clone` → `install` → `lint` → `test` funcionam do zero e o CI passa verde no primeiro push.

**Armadilhas.**
- Pular o `tsconfig` estrito "para ir mais rápido": perde-se a maior vantagem do TypeScript (arquitetura §4.1).
- Configurar infra demais agora (Docker de deploy). Cada coisa na sua fase; aqui é só a bancada.

---

## Fase 1 — Núcleo de domínio (funções puras, com TDD)

**Objetivo.** Construir o **cérebro**: funções puras que calculam toda a regra de negócio, sem tocar em banco, terminal ou framework. Guiado por testes escritos **antes** (TDD), com os casos que o funcional já forneceu.

**Por que está aqui.** Aplicação direta dos princípios 3.2 e 3.3. Funções puras podem ser construídas **sem nada mais existir** e são o caso perfeito de teste unitário. Servem **igualmente** às duas entregas — é o núcleo que o terminal e, depois, o HTTP vão usar.

**Passos.**

1. Modelar os **tipos do domínio** primeiro: placar como `{ golsEsquerda: number; golsDireita: number }`; pontos como o tipo literal `0 | 1 | 3`; fase e estado da rodada como uniões de strings. Tipar a forma antes da lógica faz o compilador barrar o impossível (arquitetura §4.1).
2. **Módulo de constantes do domínio** num único lugar (arquitetura §5.2): valor base **R$40**, desconto **R$5**, piso **R$5**. Sem números mágicos espalhados.
3. **`calcularPontos(palpite, resultado): 0 | 1 | 3`** — regra 3/1/0 (funcional §8.2). Testes **primeiro**, a partir da §8.3:
   - resultado real **2×1**: `2x1`→3, `3x1`→1, `1x0`→1, `1x1`→0, `0x1`→0;
   - resultado real **1×1**: `1x1`→3, `2x2`→1, `2x1`→0.
   Incluir **empate como palpite válido** (§8.1) e **palpite ausente → 0** (§8.4).
4. **`calcularValorAPagar(qtdIndicadosDiretos): number`** — `máximo(5, 40 − 5 × n)` (funcional §8.7). Testar a tabela inteira (0→40 … 7→5) e **8+ continua 5** (a borda do piso é o que pega bug).
5. **`ordenarClassificacao(...)`** — desempate em cascata (funcional §8.5): pontos → placares exatos → resultados certos → empate mantido (ajuste manual opcional). Testar **empate em cada nível**.
6. **`participantesSemPalpite(rodada, participantes, palpites)`** — quem ainda não palpitou (funcional func. 8 / artefato 13.8). Pura.
7. (Recomendado) funções puras para os **totais de pagamento** (esperado/recebido/falta — funcional §8.8).

Ciclo TDD sempre: vermelho → verde → refatora.

**Pronto quando.** Todos os exemplos numéricos da §8.3 e §8.7 são testes verdes, mais desempate e palpite ausente. Cobertura alta neste núcleo (arquitetura §8).

**Armadilhas.**
- Efeito colateral dentro dessas funções (ler banco, formatar string, logar). Elas são **puras**.
- "Otimizar" pensando em escala — são ~2 mil registros; clareza vence performance aqui.
- Confundir `Resultado` com `Palpite` na assinatura. Tipos bem nomeados evitam trocar argumentos.

---

## Fase 2 — Formatação para WhatsApp (funções puras)

**Objetivo.** Construir o módulo que transforma estruturas do domínio nos **8 artefatos** da seção 13 do funcional (mensagem da rodada, tabela de palpites, resumo do jogo, resumo da rodada, classificação geral, lista de participantes, pagamentos, pendências). Funções puras: recebem dados, devolvem **texto**.

**Por que está aqui.** Exportar é a **prioridade nº 1** e **já vale na Entrega 1**, impressa no terminal (funcional §13 e §16). Como os formatadores são puros e só dependem dos tipos da Fase 1, cabem aqui, ainda no núcleo puro. Eles serão usados **sem alteração** pelos dois adaptadores: na Entrega 1 o CLI imprime a string; na Entrega 2 o HTTP a devolve como `text/plain`.

**Passos.**

1. Criar `domain/whatsapp/`, um formatador por artefato (arquitetura §5.3).
2. Utilitárias reutilizáveis: `*negrito*`, `_itálico_`, monoespaçado, emojis, **nunca tabelas**, alinhamento por monoespaçado/emoji (funcional §13). O WhatsApp não renderiza tabela.
3. Implementar cada formatador, testando contra a **estrutura** dos exemplos da §13 (o texto é ilustrativo; o que importa é estrutura + informação): mensagem da rodada (13.1), tabela de palpites (13.2), resumo do jogo com pontos por palpite (13.3), resumo da rodada (13.4), classificação (13.5), lista de participantes (13.6), pagamentos com os totais na última linha (13.7), pendências (13.8).
4. Bordas: **apelido** para homônimos (funcional §9.1, decisão #23); participante sem palpite nas pendências; lista de 63 nomes não quebrar.

**Pronto quando.** Cada formatador é função pura testada, coerente com a §13, sem tabela.

**Armadilhas.**
- Acoplar formatação com cálculo: o formatador **recebe** os pontos já calculados (Fase 1); não recalcula.
- Já querer "imprimir bonito no terminal" aqui. O formatador devolve `string`; **quem imprime é o adaptador CLI** (Fase 4). Mantenha a função pura.

---

## Fase 3 — Persistência local: schema, migrations, seed e Postgres local

**Objetivo.** Traduzir o modelo conceitual (funcional §14) para o schema físico Prisma (arquitetura §6), gerar as migrations, popular o catálogo de seleções por seed e ter um Postgres rodando **localmente**.

**Por que está aqui.** O núcleo já está provado; agora ele precisa de um lugar para os **dados crus** morarem — e a Entrega 1 exige banco local persistente (funcional v8 §2). O schema é um artefato **único e interligado**, então é construído de uma vez.

**Por que Postgres mesmo sendo local (e não SQLite).** A arquitetura já escolheu Postgres (§4.5) e registrou que SQLite seria defensável pela escala. Com a divisão em duas entregas, a escolha por Postgres fica **ainda mais clara**: usar o **mesmo motor de banco** na Entrega 1 (local) e na Entrega 2 (gerenciado, online) faz **todo** o trabalho de schema, migrations e repositórios transferir-se sem retrabalho. Trocar de SQLite para Postgres no meio do projeto custaria uma migração de motor arriscada bem na hora de subir online. Postgres local (via Docker) na Entrega 1 é o caminho que evita esse atrito.

**Passos.**

1. Subir **Postgres local via Docker Compose** — banco descartável, idêntico ao que será o de produção. Já adianta o aprendizado de Docker.
2. Escrever o `schema.prisma` traduzindo a §14 do funcional (proposta da §6 do técnico):
   - **enums** `StatusPagamento`, `FaseRodada`, `EstadoRodada`;
   - **Selecao** (nome + bandeira);
   - **Participante** com a **indicação auto-referente** (`indicadorId` opcional → `Participante`) — o ponto mais interessante da modelagem;
   - **Rodada** (fase, ordem 1..5, estado) **1—N** **Jogo**;
   - **Jogo** com `selecaoEsquerdaId`/`selecaoDireitaId` **posicionais** (2×1 ≠ 1×2, **não** é mando de campo) e `golsEsquerdaReal`/`golsDireitaReal` **nulos** até o resultado existir;
   - **Palpite** com `@@unique([participanteId, jogoId])` — um palpite por participante por jogo.
3. **Confirmar que derivado NÃO vira coluna** (arquitetura §6/§5.4): valor a pagar, pontos, totais, classificação, placares exatos **não existem** no schema.
4. Gerar a primeira **migration** e aplicá-la no banco local. Entender `migrate dev` (desenvolvimento, cria e aplica) vs `migrate deploy` (produção, só aplica) — isso volta na Fase 9.
5. Escrever o **seed** do catálogo de seleções (nome + bandeira emoji) — dado de referência (funcional §12.8 / decisão #13).
6. Ligar o **log de queries do Prisma** e **ler o SQL gerado** ao menos uma vez (arquitetura §4.6).

**Pronto quando.** `migrate` aplica do zero num banco limpo, o seed popula o catálogo, e você inspeciona as tabelas (Prisma Studio ou cliente SQL) batendo com a §14.

**Armadilhas.**
- Modelar mando de campo. Não existe: esquerda/direita é só posição para o placar.
- Criar coluna para derivado "para facilitar". É a classe de bug que o princípio elimina.
- Esquecer o `@@unique` do palpite. Sem ele, dois palpites no mesmo jogo deixam o cálculo ambíguo.

---

## Fase 4 — Features via terminal (fatias verticais, em ordem de urgência)

**Objetivo.** Construir o núcleo operável, **uma feature de cada vez**, cada uma atravessando **repositório → serviço (agnóstico) → validação Zod → comando de terminal → testes**. Ao final, o organizador opera o bolão inteiro pela linha de comando.

**Por que esta ordem interna.** Duas forças se combinam: a **dependência** (cada feature só usa o que as anteriores entregaram) e a **urgência real** que o funcional v8 registrou — primeiro o que já está acontecendo (gente entrando, pagando, indicando), depois o que entra em uso quando os jogos começarem (28/06).

> **Padrão de cada fatia (repita em todas):** (1) **Repositório** — única camada que fala com o Prisma, lê/escreve dados crus; (2) **Serviço** — orquestra repositório + funções de domínio, **sem terminal, sem SQL solto, sem HTTP** (este é o código que a Entrega 2 vai reusar intacto); (3) **Schema Zod** — valida a entrada vinda do terminal; (4) **Comando de terminal** — lê a entrada, chama o serviço, **imprime** o resultado (inclusive o texto do WhatsApp, quando for o caso); (5) **Testes** — de serviço/integração no fluxo (o que mais importa) e, se quiser, um teste leve do comando.

> **Decisão nova a confirmar (fora dos três documentos-fonte).** O **estilo do adaptador de terminal** não está definido em nenhum dos três documentos — eles foram escritos supondo HTTP + front. É uma decisão de stack que pertence ao **documento de arquitetura** e deve ser ratificada lá antes de implementar. Duas opções razoáveis: **(a) menu interativo** (o programa abre, mostra opções e o organizador navega — confortável para operar rápido durante os jogos); **(b) subcomandos** (`bolao participante add`, `bolao rodada montar`, … — mais "unix", scriptável). Recomendação: começar com **menu interativo**, por ser mais amigável para o uso real do organizador, com validação Zod em cada entrada. **Não tratar isso como decidido** até constar na arquitetura.

**Ordem das fatias.**

**Bloco A — o que já está acontecendo agora (antes dos jogos):**

1. **Participantes (CRUD).** A fatia fundadora — *tudo* referencia participante. Inclui nome, **apelido opcional**, **status** (padrão Pendente) e **"indicado por" opcional, selecionando um participante já existente** (indicação auto-referente; nunca digitar nome). É a fatia mais simples — ideal para fixar o padrão de camadas. Já inclua **busca/filtro/ordenação simples** no terminal (funcional v8: "filtros simples no terminal" na Entrega 1).
2. **Exportação da lista de participantes** (artefato 13.6) — primeiro uso real do formatador da Fase 2 ligado a dados crus.
3. **Pagamentos.** Depende de Participantes + `calcularValorAPagar` + totais (Fase 1). **Valor a pagar é derivado** (conta os indicados diretos na hora); status é manual (alterna Pago/Pendente); **totais** (esperado/recebido/falta) também derivados. Aqui você sente o "derivado não se armazena" funcionando.
4. **Exportação de pagamentos** (artefato 13.7, com os totais na última linha).

> **Marco da Entrega 1 (antes de 28/06).** Com os blocos acima, o organizador já "agita o bolão": cadastra gente, registra indicações, controla pagamentos e **gera os textos** de participantes e pagamentos para colar no grupo. É o mínimo que precisa estar de pé **antes** dos jogos.

**Bloco B — o que entra em uso quando os jogos começarem:**

5. **Catálogo de seleções.** Majoritariamente leitura, apoiado no seed (Fase 3). Necessário para montar rodadas.
6. **Rodadas e Jogos (montar rodada).** Criar rodada selecionando seleções **par a par** do catálogo (funcional §9.6). Transições do **ciclo de vida** (montada → palpites abertos → resultados em andamento → encerrada) — lembrando que o estado é **guia, não trava** (funcional §11; correções sempre livres). Gerar a **mensagem da rodada** (artefato 13.1).
7. **Palpites.** Registrar palpites de um participante numa rodada (respeitando o `@@unique`). Expor **"quem ainda não palpitou"** (função pura da Fase 1) e gerar **tabela de palpites** (13.2) e **pendências** (13.8).
8. **Resultados e Pontuação.** O **coração da orquestração**: registrar o placar de 90 min **dispara o recálculo** — pontos da rodada e classificação geral, via funções puras, **sob demanda**. Correções são livres (funcional §8.6): reeditar um resultado só recalcula. Gerar **resumo do jogo** (13.3), **resumo da rodada** (13.4) e **classificação geral** (13.5). Testar o fluxo "registrar resultado recalcula rodada e classificação" é prioridade.
9. **Resumo geral no terminal** (o equivalente ao painel nesta entrega). Por último, porque **agrega tudo**: pagamentos num relance (quantos pagaram de quantos, recebido vs. esperado, falta), rodada atual (qual, estado, quantos já palpitaram). É o "painel" do funcional §11.2 na forma de resumo de terminal.

**Pronto quando.** Você opera **um bolão inteiro de mentira só pelo terminal**: cadastra gente com indicações, controla pagamentos e vê os totais, monta rodada do catálogo, lança palpites, vê quem falta, lança resultados, vê a classificação com desempate, e **gera todos os 8 artefatos** prontos para copiar — com tudo persistido entre execuções (fecha e reabre o programa, os dados continuam lá).

**Armadilhas.**
- **Vazar a impressão para dentro do serviço.** O serviço devolve dados/strings; **só o comando de terminal imprime**. Se o serviço chama `console.log`, o núcleo deixou de ser agnóstico e a Entrega 2 vai sofrer.
- Vazar regra para o repositório ou para o comando. Regra mora no **domínio**; serviço **orquestra**; repositório **persiste**; comando **traduz/imprime**.
- Persistir um derivado "porque a query repetiu". Com ~2 mil registros o recálculo é instantâneo; a repetição resolve-se **extraindo uma função**, não criando coluna.
- Construir as exportações de rodada/jogo **antes** de Resultados/Pontuação. O resumo do jogo precisa dos pontos; respeite a ordem.
- Pular os testes da **regra de indicação** (desconto vale mesmo sem o indicado ter pago; só indicação **direta** — funcional §8.7). É sutil e fácil de errar.

---

## Fase 5 — Fechamento da Entrega 1 (operar com segurança)

**Objetivo.** Transformar "funciona no meu terminal" em "o organizador usa isso por semanas sem perder dados nem se perder na operação".

**Por que está aqui.** A Entrega 1 vai rodar **de verdade** durante o torneio, com dados reais sendo digitados todo dia. Como ainda **não há armazenamento central** (isso é Entrega 2), a confiabilidade local e a clareza de operação importam — e o funcional é explícito: persistência confiável, "não pode perder nada" (funcional §16 e v8 §2).

**Passos.**

1. **Backup do banco local.** Um comando/rotina simples de dump do Postgres (ex.: `pg_dump`) e a orientação de rodá-lo periodicamente. É a rede de segurança enquanto não há banco central. (Quando a Entrega 2 subir, esse mesmo dump vira o insumo da migração — ver Fase 9.)
2. **Usabilidade mínima no terminal.** Mensagens claras de erro (vindas dos erros de domínio, traduzidas pelo adaptador), confirmação antes de ações destrutivas (apagar participante, por exemplo), e um menu/ajuda que o organizador entenda sem manual.
3. **Runbook curto do organizador.** Um passo a passo objetivo: "como cadastrar participante e indicação", "como lançar pagamento", "como montar uma rodada", "como lançar palpites e resultados", "como gerar cada texto do WhatsApp", "como fazer backup".
4. **Conferência dos casos de borda que já valem nesta entrega** (os de domínio): rodada final com **3º lugar + final (2 jogos)** numa rodada só (funcional decisão #19); participante com 7+ indicados travado no piso; empate de classificação no 3º critério; correção de resultado recalculando tudo.

**Pronto quando.** O organizador consegue tocar o bolão real pelo terminal, com backup do banco em mãos e um runbook que dispensa você ao lado. **A Entrega 1 está concluída e a meta de 27/06 cumprida.**

**Armadilhas.**
- Adiar o backup "porque é local e nunca dá problema". É justamente o cenário sem rede (sem banco central) — perder o arquivo é perder semanas de digitação.
- Tentar antecipar usabilidade de Entrega 2 no terminal (cores, dashboards elaborados). O terminal é a interface mínima; o capricho visual é a Entrega 2.

---

# ENTREGA 2 — Sistema acabado (front-end, online, multi-dispositivo, autenticação)

> Objetivo da entrega: transformar o núcleo funcional num produto completo e confortável, **sem reescrever regra**. A Entrega 2 acrescenta **adaptadores** sobre o núcleo já pronto: primeiro a **API HTTP + autenticação**, depois o **front-end** que a consome, depois o **deploy/online** e o **polimento**. Tudo que está nas seções 12 (telas) e nos requisitos de online/multi-dispositivo/auth do funcional vale aqui.

---

## Fase 6 — Adaptador HTTP (Fastify) + Autenticação

**Objetivo.** Expor o núcleo (os mesmos serviços da Entrega 1) por uma **API REST** com Fastify, validação Zod na fronteira HTTP, tratamento de erros, e a **autenticação single-user** (login → sessão por cookie httpOnly → rotas protegidas).

**Por que está aqui — e por que é rápido agora.** Os serviços já existem, agnósticos de interface e testados (Entrega 1). Esta fase é, em grande parte, **escrever rotas finas** que validam o payload (Zod), chamam o serviço certo e devolvem JSON ou `text/plain`. Cada endpoint do contrato (arquitetura §7) mapeia para um serviço que **já** existe. E a autenticação vem **junto com o bootstrap HTTP** (não depois das rotas de feature) para que toda rota nasça protegida e todo teste de API já seja escrito autenticado — evitando retrabalho.

**Passos.**

1. Levantar o **Fastify** com TypeScript; **tratamento de erros central** (erros de domínio e de validação → respostas HTTP coerentes), reusando os erros tipados que o núcleo já lança.
2. **Fronteira Zod no HTTP**, reusando os schemas escritos na Entrega 1 sempre que possível (mesma validação, novo adaptador). Validar o **`.env` no boot** (arquitetura §10) — agora há segredos de verdade (senha hasheada, segredo de sessão, URL do banco).
3. **Autenticação mínima e correta** (arquitetura §4.8/§10): senha do organizador **hasheada com argon2id**, guardada no banco; `POST /auth/login` e `POST /auth/logout`; **sessão por cookie httpOnly** (+ `Secure`, `SameSite`); um **preHandler** "exigir sessão" protegendo os grupos de rotas.
4. **Mapear os serviços para os endpoints** do contrato (arquitetura §7): participantes, pagamentos, rodadas, jogos, palpites, resultados, exportações (`text/plain`), painel. Cada rota é fina; a regra já está no serviço.
5. Rota de saúde protegida (`GET /me` ou `/painel`) para **provar o loop**: sem cookie → 401; com login → acesso liberado.

**Marco recomendado — deploy de fumaça (esqueleto ambulante).** Com auth e banco conectados, faça aqui o **primeiro deploy** num PaaS com Postgres gerenciado e HTTPS. Objetivo único: provar que build → banco → migration em produção → HTTPS → login funciona. O endurecimento fica para a Fase 9.

**Pronto quando.** Toda a API responde, validada por Zod e protegida por auth, sobre os serviços já existentes; o `.env` é validado no boot; o loop de login funciona; (idealmente) já roda também no deploy de fumaça. Você consegue operar o mesmo bolão de antes, agora **por HTTP** (Insomnia/Postman/`curl`/`.http`).

**Armadilhas.**
- Reescrever regra na rota porque "é rápido". A regra está no serviço; a rota **traduz**. Se a rota calcula pontos, o núcleo agnóstico foi desperdiçado.
- Biblioteca de auth pesada (OAuth, papéis). É single-user (arquitetura §4.8).
- Esquecer `httpOnly`/`Secure`/`SameSite` no cookie — a defesa básica que justifica a escolha de sessão por cookie.

---

## Fase 7 — Fundação do frontend

**Objetivo.** Montar a base do SPA (Vite + React + TypeScript + Tailwind) que consome a API: estrutura de pastas, cliente HTTP, roteamento, layout responsivo base e tratamento de sessão/login no front.

**Por que está aqui.** Só faz sentido começar a tela com a API completa e estável (princípio 3.7): a tela é cliente de um **contrato** pronto e testado.

**Passos.**

1. Inicializar **Vite + React + TS** e configurar **Tailwind**. Estrutura `pages/`, `components/`, `api/`, `lib/` (técnico §5.5).
2. **Cliente HTTP** (`api/`) — a camada que conhece o contrato: centraliza chamadas, envio do cookie de sessão e tratamento de 401 (redireciona ao login).
3. **Roteamento** + **layout base responsivo** (funcional §16: limpo e confortável no mobile **e** desktop). Definir a navegação do mapa (funcional §12).
4. **Componente compartilhado "Copiar para WhatsApp"** (Clipboard API): recebe o texto pronto do back e copia. Como exportar é o requisito nº 1, trate-o como peça de primeira classe.
5. Decidir Tailwind puro vs. biblioteca de componentes (shadcn/ui — arquitetura §4.9/§13). Começar com Tailwind puro é defensável para um projeto solo.

**Pronto quando.** O app sobe, faz login contra a API real, mantém a sessão, navega entre rotas stub e o botão "Copiar" funciona com um texto de teste.

**Armadilhas.**
- Reimplementar regra ou formatação no front. O front **só consome** o que o back calculou e formatou.
- Espalhar `fetch` por componente. Centralize em `api/`.

---

## Fase 8 — Telas do frontend (em ordem de dependência)

**Objetivo.** Implementar as 8 telas do mapa (funcional §12), cada uma consumindo endpoints prontos, com busca/filtro/ordenação **ricos** (agora, não mais simples como no terminal) e o botão de exportação em toda lista.

**Por que esta ordem.** Mesma lógica do núcleo: cada tela depende das anteriores; o painel agrega tudo e vem **por último**, mesmo sendo a "porta de entrada".

**Ordem das telas.**

1. **Login** (12.1) — o portão.
2. **Participantes** (12.3) — lista com busca/filtro/ordenação; cadastro/edição com nome, apelido, "indicado por" (seleção de existente) e status; clicar abre o perfil. Exportável.
3. **Pagamentos** (12.5) — status + valor, filtro/ordenação, **totais** (esperado/recebido/falta). Exportável.
4. **Rodadas + Catálogo + Montar rodada** (12.6/12.8).
5. **Rodada (detalhe)** (12.7) — a mais rica: jogos, registrar palpites, ver quem falta, registrar resultados, ver pontuação, e os **artefatos** com botão copiar.
6. **Perfil do participante** (12.4) — indicações, pagamento, placares exatos, pontos por rodada, posição.
7. **Painel** (12.2) — tela inicial: pagamentos num relance, pote, rodada atual, quantos já palpitaram, atalhos. Por último (depende de todas as agregações).

Em todas: **toda lista exporta** e a interface é confortável no celular **e** no desktop.

**Pronto quando.** As 8 telas funcionam ponta a ponta contra a API real; listas têm busca/filtro/ordenação; cada lista exporta o texto correto; a navegação do mapa está completa.

**Armadilhas.**
- Começar pelo painel "porque é a home". Ele depende de tudo.
- Não testar no **celular real** (funcional §16). O organizador vai operar muito pelo celular.

---

## Fase 9 — Deploy, infraestrutura e migração dos dados locais

**Objetivo.** Transformar o deploy de fumaça (Fase 6) num deploy de produção sólido, **levar os dados reais da Entrega 1 (locais) para o banco central** e, opcionalmente, evoluir para VPS.

**Por que está aqui.** O cano já foi provado cedo (Fase 6). Agora, com o produto completo, faz-se a infra com capricho — e há um passo que só existe por causa da divisão em duas entregas: **a migração dos dados** que o organizador digitou localmente durante o torneio para o armazenamento central online.

**Passos.**

1. **Empacotar com Docker** (arquitetura §9/T15) — imagem base Node 24, pela reprodutibilidade.
2. **PaaS de produção** (Railway/Render/Fly — arquitetura §9): Postgres gerenciado (Neon/Supabase — §13), HTTPS automático, variáveis de ambiente (segredos fora do versionamento — §10), `migrate deploy` aplicando as migrations em produção.
3. **Migração dos dados locais → central.** Como Entrega 1 e Entrega 2 usam o **mesmo motor (Postgres)**, isto é direto: um `pg_dump` do banco local (o mesmo backup da Fase 5) restaurado no banco gerenciado, ou uma carga controlada. **Planejar uma "janela de virada"**: a partir do momento em que o sistema online assume, o organizador para de usar o terminal e passa a usar a web, para os dados não divergirem entre os dois.
4. Frontend em Vercel/Netlify/Cloudflare Pages, ou servido pelo próprio servidor no caminho VPS.
5. **VPS Linux (evolução opcional)** — exercício deliberado de infra: provisionar o servidor, **Nginx** como reverse proxy, gerência de processo (systemd/PM2), Postgres instalado e protegido, firewall, **TLS via Let's Encrypt**.

**Pronto quando.** O sistema completo está no ar em HTTPS, com banco gerenciado, migrations aplicadas em produção, segredos fora do código, e **os dados reais da Entrega 1 já vivem no banco central**. (Se seguiu o VPS: atrás de Nginx com TLS e processo gerenciado.)

**Armadilhas.**
- Rodar `migrate dev` em produção. Em produção é `migrate deploy`.
- Esquecer a janela de virada e acabar com dados digitados em dois lugares (terminal local **e** web) que divergem.
- Segredo no repositório ou na imagem Docker. Sempre variável de ambiente.

---

## Fase 10 — Endurecimento e finalização

**Objetivo.** Fechar as pontas de qualidade: casos de borda restantes, responsividade real, acessibilidade básica, documentação e CI completo.

**Por que está aqui.** Com tudo no ar, é o polimento que transforma "funciona" em "bem feito, fácil de manter e evoluir".

**Passos.**

1. **Casos de borda** revisitados na interface web (os de domínio já foram cobertos por teste na Fase 1 e conferidos na Fase 5): rodada final 3º lugar + final na mesma rodada; piso de indicação; empate no 3º critério (ajuste manual); correção de resultado recalculando — agora vistos pela tela.
2. **Responsividade real** no celular e desktop, com listas de ~63 itens (funcional §16).
3. **Acessibilidade básica**: foco visível, contraste, navegação por teclado, rótulos. Boa prática barata.
4. **Documentação**: `README` completo (rodar local, testar, deployar) e o **runbook** do organizador atualizado para a versão web. Vincular os três documentos.
5. **CI completo**: lint + testes a cada push, bloqueando merge se quebrar; cobre todo o núcleo.

**Pronto quando.** Casos de borda com teste; app confortável em celular e desktop com a lista cheia; README + runbook; CI verde cobrindo o núcleo.

**Armadilhas.**
- Tratar esta fase como opcional. É ela que entrega a manutenibilidade e a evolução fácil que você quer.

---

## 5. Riscos e armadilhas transversais (valem para todas as fases)

- **Núcleo agnóstico de interface, sempre.** Nada de `console.log`, `req`/`res` ou tipos de framework dentro de `domain/`, `services/` ou `repositories/`. É o que faz a Entrega 1 virar fundação da Entrega 2 em vez de protótipo descartável. **Esta é a regra nº 1 desta versão do roteiro.**
- **Não pular a ordem de dentro para fora** (dentro de cada entrega). A tentação de "começar pela tela" é a maior fonte de retrabalho.
- **Derivado nunca vira coluna.** ~2 mil registros, recálculo instantâneo, e some uma classe inteira de bugs de dado desatualizado.
- **Regra de negócio mora no domínio.** Se a rota, o comando, o repositório ou a tela começarem a calcular, a arquitetura furou.
- **Texto do WhatsApp é gerado no núcleo (formatadores puros).** O adaptador só decide o destino (imprimir no terminal ou devolver por HTTP); a tela só copia.
- **Nada de over-engineering** (arquitetura §11): sem Redis, filas, microsserviços, GraphQL ou Kubernetes.
- **Backup do banco local na Entrega 1.** Enquanto não há banco central, o dump é a única rede de segurança dos dados reais.
- **Commits pequenos, CI verde, cada fase fecha com seu "Pronto quando".** Não avance com o chão de trás instável.

---

## 6. Checklist resumido (a sequência, em uma olhada)

**ENTREGA 1 — terminal, local, meta 27/06**

1. **Fase 0** — Repositório, TS estrito, Biome, Vitest, estrutura de pastas (com `cli/`), CI mínimo, README.
2. **Fase 1** — Funções puras do domínio com TDD (pontuação 3/1/0, valor a pagar com piso, desempate em cascata, quem não palpitou), com os casos prontos do funcional.
3. **Fase 2** — Formatadores puros dos 8 artefatos do WhatsApp (sem tabela, emoji/monoespaçado).
4. **Fase 3** — Schema Prisma (indicação auto-referente + unique do palpite), migrations, seed, **Postgres local** via Docker; ler o SQL gerado.
5. **Fase 4** — Features via terminal, fatias verticais por urgência: **Participantes(+export) → Pagamentos(+export)** [marco: antes dos jogos] **→ Catálogo → Rodadas/Jogos(+mensagem) → Palpites(+pendências/tabela) → Resultados/Pontuação(+resumos/classificação) → Resumo geral**. (Repo → serviço agnóstico → Zod → comando → testes em cada uma.)
6. **Fase 5** — Fechamento: backup do banco local, usabilidade mínima, runbook, conferência dos casos de borda de domínio. **→ Entrega 1 concluída.**

**ENTREGA 2 — front-end, online, multi-dispositivo, autenticação**

7. **Fase 6** — Adaptador HTTP (Fastify) + Zod na fronteira + `.env` validado + auth single-user (argon2id, cookie httpOnly) sobre os **mesmos serviços**. **→ Deploy de fumaça (esqueleto ambulante).**
8. **Fase 7** — Frontend base: Vite/React/TS/Tailwind, cliente HTTP, roteamento, layout responsivo, sessão, botão "Copiar".
9. **Fase 8** — Telas na ordem: Login → Participantes → Pagamentos → Rodadas/Montar → Rodada (detalhe) → Perfil → Painel.
10. **Fase 9** — Deploy de produção: Docker, PaaS + Postgres gerenciado, HTTPS, `migrate deploy`, **migração dos dados locais → central** (janela de virada); depois VPS + Nginx + TLS (opcional).
11. **Fase 10** — Endurecimento: casos de borda na web, responsividade real, acessibilidade básica, README + runbook, CI completo.

---

*Documento de roteiro de desenvolvimento (v2). Complementa — e nunca substitui — o documento de contexto funcional v8 (fonte de verdade do comportamento e da ordem de entrega) e o documento de arquitetura v1 (fonte de verdade da stack). Aqui mora apenas a ordem de execução e a justificativa dela. A única decisão técnica nova levantada aqui — o estilo do adaptador de terminal — deve ser ratificada no documento de arquitetura antes de implementada.*