# Documento de Roteiro de Desenvolvimento — Sistema de Gestão de Bolão (Copa do Mundo 2026)

**Versão:** 1 — roteiro de execução (companheiro do documento de contexto funcional v7 e do documento de arquitetura v1)
**Atualizado em:** 16/06/2026
**Natureza:** documento de **ordem de construção**. Define *em que sequência* o sistema descrito nos dois documentos anteriores deve ser construído, e *por quê* nessa ordem. Não redefine regras de negócio (essas vivem no documento funcional) nem reescolhe ferramentas (essas vivem no documento de arquitetura). Aqui o assunto é **o caminho**: o que fazer primeiro, o que fazer depois, e como saber que cada etapa terminou bem antes de avançar para a próxima.

Regra de precedência: em conflito, vale o **documento funcional** para comportamento e o **documento de arquitetura** para stack. Este documento organiza a execução dos dois.

---

## Histórico de versões

| Versão | O que mudou |
|--------|-------------|
| **1** | Documento criado. Princípios que governam a ordem; visão geral das 10 fases; detalhamento de cada fase (objetivo, justificativa da posição na ordem, passos, critério de pronto, armadilhas); riscos transversais; checklist final. |

---

## 1. Propósito e como ler este documento

Você já tem o **o quê** (funcional v7) e o **como** (arquitetura v1). Falta o **em que ordem** — e essa é uma decisão de engenharia tão importante quanto as outras duas. Uma ordem ruim faz você construir encanamento antes de saber se o cérebro funciona, descobrir o deploy só no fim (quando ele costuma dar problema), ou retrabalhar camadas inteiras porque a autenticação foi deixada para depois. Uma ordem boa faz cada etapa apoiar-se firme na anterior, com um ponto de verificação claro entre elas.

Cada fase abaixo segue sempre a mesma estrutura, de propósito:

- **Objetivo** — o que essa fase entrega.
- **Por que está aqui** — a justificativa da posição na sequência (o ponto mais importante para o aprendizado).
- **Passos** — a lista ordenada do que fazer.
- **Pronto quando (Definition of Done)** — o critério objetivo para considerar a fase concluída e poder avançar sem medo.
- **Armadilhas** — os erros típicos que essa fase convida, e como evitá-los.

Leia a seção 2 inteira antes de começar. Ela é o "porquê" de toda a ordem; sem ela, as fases viram uma lista de tarefas sem alma, e você perde justamente a parte que ensina.

---

## 2. Princípios que governam a ordem

Toda a sequência deste documento sai de oito princípios. Eles não são genéricos: cada um se conecta a uma característica concreta do **seu** sistema.

### 2.1 Construir de dentro para fora (inside-out)

A arquitetura escolhida (doc técnico, seção 5) é em camadas, com a regra de dependência apontando **para dentro**: HTTP → serviços → domínio, e os repositórios isolando o banco. O domínio não conhece HTTP nem Prisma.

A consequência para a **ordem** é direta: constrói-se de dentro para fora. Primeiro o **núcleo de domínio** (a camada mais interna, mais estável e que não depende de ninguém), depois a persistência, depois os serviços, depois o HTTP, e só então o frontend. Construir na direção contrária (começar pela tela, ou pela rota) obriga você a *fingir* o que ainda não existe e a refazer quando o de baixo muda. Construir de dentro para fora significa que, quando você chega numa camada, tudo que ela precisa **já existe e já foi testado**.

### 2.2 Risco primeiro: o cérebro antes do encanamento

O documento de arquitetura é explícito (seção 2.2): este **não** é um problema de escala — é um problema de **regra de negócio**. O risco de bug não está em servir 63 pessoas; está em calcular **3/1/0 errado**, em ordenar o desempate na ordem trocada, ou em aplicar o piso de R$5 fora de hora. Um ponto calculado errado gera participante bravo no grupo; um deploy lento não gera nada.

Por isso a ordem ataca **primeiro o que tem mais risco e mais valor**: as funções puras de pontuação, valor a pagar, desempate e formatação para WhatsApp. E há um presente embutido: o documento funcional **já te entregou os casos de teste prontos** (seção 8.3 e a tabela da 8.7). Você começa o projeto transformando esses exemplos em testes — e o "cérebro" nasce comprovadamente correto antes de qualquer encanamento.

### 2.3 Cada fase entrega algo verificável

A maior fonte de "cagada" em projeto solo é empilhar três ou quatro camadas e só então testar — aí, quando algo quebra, você não sabe em qual das quatro está o erro. A regra deste roteiro é: **nenhuma fase começa sem que a anterior tenha um critério de pronto satisfeito.** Cada fase fecha com um teste que passa, um endpoint que responde, uma tela que renderiza. Você sempre sabe que o chão atrás de você é firme.

### 2.4 Híbrido: núcleo horizontal, features verticais

Existem duas formas clássicas de ordenar:

- **Horizontal** — construir toda uma camada antes da próxima (todos os repositórios, depois todos os serviços, depois todas as rotas). Bom para consistência, ruim para feedback: você só vê algo funcionar de ponta a ponta muito tarde.
- **Vertical (fatias)** — pegar **uma** funcionalidade e levá-la por todas as camadas até funcionar, depois a próxima. Feedback rápido, mas pode gerar padrões de camada inconsistentes se você ainda está aprendendo o padrão.

O melhor para este projeto é o **híbrido**:

1. O **núcleo puro** (domínio + formatação) é construído **horizontalmente**, porque é pequeno, coeso e é o cérebro — faz sentido tê-lo inteiro.
2. O **schema do banco** também é horizontal, porque o modelo de dados é um artefato único e interligado (não dá para modelar "meio Participante").
3. Da API para cima, construímos **por fatias verticais**, uma feature de cada vez (repositório → serviço → validação → rota → testes), numa **ordem de dependência**. Você estabelece o padrão de camadas na primeira fatia (Participantes, a mais simples) e **repete** o mesmo padrão nas demais. Aprende a estrutura no caso fácil antes de aplicá-la no caso difícil (recálculo de pontuação).

### 2.5 "Derivado não se armazena" molda a ordem das leituras

O princípio mais importante da modelagem (funcional seção 13, técnico seção 5.4): pontuação, valor a pagar, totais, classificação, placares exatos e "quem não palpitou" **não são colunas no banco** — são **calculados na hora**. Isso tem efeito direto na ordem: toda funcionalidade de **leitura agregada** (classificação, painel, perfil, totais de pagamento) depende de **duas coisas já existirem**: as funções de cálculo (fase do domínio) **e** os dados crus no banco (repositórios). Por isso essas leituras vêm depois — e o **painel**, que agrega tudo, é praticamente a última coisa do backend, ainda que seja a tela inicial do produto.

### 2.6 Esqueleto ambulante e deploy cedo

Erro clássico: deixar o deploy para o último dia. Deploy é onde aparecem os problemas de variável de ambiente, de HTTPS, de migration em produção, de "funciona na minha máquina". Descobrir isso no fim, com tudo pronto, é a pior hora.

A prática que evita isso é o **esqueleto ambulante** (*walking skeleton*): o fio mais fino possível atravessando o sistema inteiro — uma rota `/health` que conecta no Postgres e responde "ok", subida num PaaS com HTTPS — **bem cedo**, antes das features. Você prova que o cano inteiro existe (build → banco → deploy → HTTPS) quando ainda é barato consertar. Por isso este roteiro recomenda um **primeiro deploy de fumaça** logo após a autenticação funcionar, e deixa o **endurecimento de infra** (Docker caprichado, VPS, Nginx) para uma fase dedicada no fim. Deploy aparece, então, **duas vezes**: cedo (provar o cano) e tarde (fazer direito).

### 2.7 Backend inteiro antes do frontend

Como seu foco é back-end e como o documento de arquitetura trata a "API como contrato" (seção 4.9), a ordem mantém o backend e o frontend **separados no tempo**: primeiro um backend **completo, correto e testável** (você exercita os endpoints com um cliente HTTP tipo Insomnia/Postman/`curl`/arquivo `.http`), e só depois o frontend que consome esse contrato. Isso mantém o modelo mental limpo — você não fica alternando entre dois conjuntos de padrões enquanto ainda aprende cada um — e reforça a ideia de que a tela é apenas um cliente da API, não o lugar onde a regra mora.

### 2.8 Commits pequenos e CI desde cedo

Transversal a tudo: **commits pequenos e com sentido** (um por unidade lógica: "função de pontuação + testes", "repositório de participantes", "tela de pagamentos"). Isso te dá histórico legível e a capacidade de voltar atrás sem perder tudo. E o **CI** (rodar lint + testes a cada push) é montado cedo — assim que existirem os primeiros testes — para que toda mudança seja verificada automaticamente. O documento de arquitetura lista CI como ponto em aberto (seção 13); este roteiro o resolve cedo de propósito.

---

## 3. Visão geral das fases

| Fase | Nome | Entrega central | Camada / foco |
|---|---|---|---|
| 0 | Fundação e ferramental | Repositório, TypeScript, lint, testes, estrutura de pastas, CI mínimo | Workbench |
| 1 | Núcleo de domínio (TDD) | Funções puras de pontuação, desempate, valor a pagar, "quem não palpitou" | Domínio |
| 2 | Formatação WhatsApp | Formatadores puros dos 8 artefatos da seção 12 | Domínio (saída) |
| 3 | Persistência | Schema Prisma, migrations, seed do catálogo, Postgres local | Banco |
| 4 | Bootstrap HTTP + Autenticação | Fastify, validação na fronteira, erros, login/sessão, rota protegida | HTTP + segurança |
| 5 | Features do backend (fatias verticais) | Participantes → Pagamentos → Catálogo → Rodadas/Jogos → Palpites → Resultados/Pontuação → Exportações → Painel | Repos + serviços + rotas |
| 6 | Fundação do frontend | Vite/React/TS/Tailwind, cliente HTTP, roteamento, layout, sessão | Frontend base |
| 7 | Telas do frontend (ordem de dependência) | Login → Participantes → Pagamentos → Rodadas/Montar → Rodada (detalhe) → Perfil → Painel | Frontend telas |
| 8 | Deploy e infraestrutura | Docker, PaaS + Postgres gerenciado, HTTPS; depois VPS + Nginx | Infra |
| 9 | Endurecimento e finalização | Casos de borda, responsividade real, acessibilidade básica, README/runbook, CI completo | Qualidade |

Um **marco de deploy de fumaça** (esqueleto ambulante) é recomendado **entre a Fase 4 e o restante da Fase 5** — explicado na Fase 4.

---

## Fase 0 — Fundação do repositório e ferramental

**Objetivo.** Deixar a bancada de trabalho montada e correta, para que tudo construído depois nasça organizado. Nada de regra de negócio ainda; só o esqueleto do projeto e as ferramentas.

**Por que está aqui.** É a base de todas as fases. Ferramental decidido depois vira retrabalho (reconfigurar lint quando já há 50 arquivos é dor). Fazendo agora, todo arquivo novo já nasce formatado, tipado e testável.

**Passos.**

1. Criar o repositório Git e o `.gitignore` (ignorar `node_modules`, `dist`, `.env`, artefatos de build, banco local). Definir desde já que **segredos nunca entram no versionamento**.
2. Decidir a topologia de pastas. Para este projeto, duas pastas-irmãs no mesmo repositório são suficientes e simples: `backend/` e `frontend/`. (Não precisa de monorepo com ferramenta dedicada — seria over-engineering para o tamanho; o próprio doc de arquitetura prega isso.)
3. Inicializar o **backend**: `package.json` com o campo **`engines`** fixando Node 24 (arquitetura T2), `tsconfig.json` em modo estrito (`strict: true` — você quer o compilador trabalhando a seu favor), e a estrutura de pastas proposta no doc técnico (seção 5.5): `domain/`, `services/`, `repositories/`, `http/`, `config/`, e `tests/` espelhando `domain/` e `services/`.
4. Instalar e configurar o **Biome** (lint + format numa ferramenta só — T14). Rodar uma vez para garantir que formata e acusa.
5. Instalar e configurar o **Vitest** (T13). Criar um teste trivial (`expect(1+1).toBe(2)`) só para provar que a suíte roda.
6. Configurar o **CI mínimo** (ex.: GitHub Actions): a cada push, instalar dependências, rodar lint e rodar testes. Por enquanto ele só valida o teste trivial — mas o cano de verificação automática já existe para quando os testes de verdade chegarem na Fase 1.
7. Escrever um `README` inicial curtinho explicando como rodar (`install`, `test`, `lint`). Ele cresce ao longo do projeto.

**Pronto quando.** `git clone` → `install` → `lint` → `test` funcionam do zero, e o CI passa verde no primeiro push.

**Armadilhas.**
- Pular o `tsconfig` estrito "para ir mais rápido". Você perde justamente a vantagem do TypeScript (arquitetura 4.1). Estrito desde o primeiro arquivo.
- Configurar ferramental demais agora (Docker, banco, deploy). Cada coisa tem sua fase. Aqui é só a bancada.

---

## Fase 1 — Núcleo de domínio (funções puras, com TDD)

**Objetivo.** Construir o **cérebro** do sistema: as funções puras que calculam tudo que é regra de negócio, sem tocar em banco, HTTP ou framework. Tudo guiado por testes escritos **antes** do código (TDD), usando os casos que o documento funcional já forneceu.

**Por que está aqui.** É a aplicação direta dos princípios 2.1 e 2.2: a camada mais interna, mais estável e de maior risco vem primeiro. Funções puras (entram dados, saem dados, sem efeito colateral) são o caso perfeito de teste unitário e podem ser construídas **sem nada mais existir**. Quando essa fase fecha, você tem a garantia comprovada de que o coração do sistema está correto — e o resto vira encanamento em volta de algo confiável.

**Passos.**

1. Modelar os **tipos do domínio** primeiro. Por exemplo: um placar como `{ golsEsquerda: number; golsDireita: number }`; os pontos possíveis como o tipo literal `0 | 1 | 3`; os enums de estado da rodada e fase como uniões de strings. Tipar a forma dos dados **antes** da lógica é a disciplina que o doc de arquitetura quer construir (4.1): o compilador passa a barrar combinações impossíveis.
2. Criar o **módulo de constantes do domínio** num único lugar (arquitetura 5.2): valor base **R$40**, desconto **R$5**, piso **R$5**. Nunca espalhar esses números como "números mágicos" pelo código. Se a regra mudar, muda num lugar só.
3. **`calcularPontos(palpite, resultado): 0 | 1 | 3`** — a regra 3/1/0 (funcional 8.2). Escrever **primeiro** os testes a partir dos exemplos prontos da seção 8.3:
   - resultado real **2×1**: `2x1`→3, `3x1`→1, `1x0`→1, `1x1`→0, `0x1`→0;
   - resultado real **1×1**: `1x1`→3, `2x2`→1, `2x1`→0.
   Incluir explicitamente o caso do **empate como palpite válido** (8.1) e o caso de **palpite ausente → 0** (8.4). Só depois de os testes existirem, escrever a função até todos passarem.
4. **`calcularValorAPagar(qtdIndicadosDiretos): number`** — a fórmula `máximo(5, 40 − 5 × n)` (funcional 8.7). Testar com a tabela inteira da 8.7: 0→40, 1→35, … , 7→5, e **8+ continua 5** (o piso). Testar a borda do piso é o que pega bug.
5. **`ordenarClassificacao(...)`** — os critérios de desempate em cascata (funcional 8.5): 1º total de pontos; 2º mais placares exatos; 3º mais resultados certos; 4º empate mantido (mesma posição), com possibilidade de ajuste manual. Testar especialmente os **empates** em cada nível, que é onde a ordem dos critérios costuma sair trocada.
6. **`participantesSemPalpite(rodada, participantes, palpites)`** — quem ainda não palpitou numa rodada (funcional funcionalidade 8 / artefato 12.8). Pura: recebe as listas, devolve quem falta.
7. (Opcional, mas recomendado) funções puras para os **totais de pagamento** (esperado / recebido / falta — funcional 8.8), recebendo a lista de participantes com seus valores e status.

Trabalhe sempre no ciclo TDD: escreve o teste (vermelho) → implementa o mínimo (verde) → limpa o código (refatora). É lento nos primeiros minutos e rápido pelo resto do projeto.

**Pronto quando.** Todos os exemplos numéricos dos documentos funcional 8.3 e 8.7 estão como testes verdes, mais os testes de desempate e de palpite ausente. Cobertura **alta neste núcleo** (arquitetura seção 8) — é aqui que mora o risco.

**Armadilhas.**
- Misturar efeito colateral (ler banco, formatar string, logar) dentro dessas funções. Elas têm que ser **puras**. Persistência e formatação são outras fases.
- "Otimizar" a classificação pensando em escala. São ~2 mil registros no torneio inteiro (arquitetura 2.1); clareza vence performance aqui, sempre.
- Confundir resultado real com palpite na assinatura — deixar os tipos bem nomeados (`Palpite` ≠ `Resultado`) evita trocar a ordem dos argumentos.

---

## Fase 2 — Formatação para WhatsApp (funções puras)

**Objetivo.** Construir o módulo que transforma as estruturas do domínio nos **8 artefatos** da seção 12 do documento funcional (mensagem da rodada, tabela de palpites, resumo do jogo, resumo da rodada, classificação geral, lista de participantes, pagamentos, pendências de palpite). Tudo como **funções puras** que recebem dados e devolvem **texto formatado**.

**Por que está aqui.** Exportar para o WhatsApp é o **requisito não-funcional nº 1** (funcional 15; arquitetura 2.3 — "não é cosmético, é o produto"). E, como os formatadores são puros e só dependem dos tipos já definidos na Fase 1, eles cabem naturalmente logo em seguida, ainda no "núcleo puro", antes de qualquer banco ou HTTP. Construir cedo também te força a confirmar que o domínio expõe os dados nas formas que a saída precisa.

**Passos.**

1. Criar o submódulo `domain/whatsapp/` (arquitetura 5.3), um formatador por artefato.
2. Implementar as regras de formatação como utilitárias reutilizáveis: `*negrito*`, `_itálico_`, monoespaçado, emojis, **nunca tabelas**, alinhamento por monoespaçado/emoji (funcional 12; arquitetura 5.3). O WhatsApp não renderiza tabela — quem tentar alinhar com tabela quebra no celular.
3. Implementar cada formatador, testando contra a **estrutura** dos exemplos da seção 12 (não o texto exato, que o próprio doc diz ser ilustrativo — mas a estrutura e a informação contida): mensagem da rodada (12.1), tabela de palpites (12.2), resumo do jogo com os pontos por palpite (12.3), resumo da rodada (12.4), classificação geral (12.5), lista de participantes (12.6), pagamentos com os totais na última linha (12.7), pendências (12.8).
4. Testar bordas: nomes com **apelido** para diferenciar homônimos (funcional 27); participante sem palpite aparecendo nas pendências; lista grande (63 nomes) não quebrar.

**Pronto quando.** Cada formatador é uma função pura testada, gerando texto coerente com a seção 12, sem nenhuma tabela e com a formatação amigável ao WhatsApp.

**Armadilhas.**
- Gerar o texto **no frontend**. O doc de arquitetura é explícito (4.9): a formatação acontece **no back-end**, fonte única de verdade; o front só recebe pronto e copia. Resista à tentação de "montar a string na tela".
- Acoplar formatação com cálculo. O formatador **recebe** os pontos já calculados (da Fase 1); ele não recalcula nada.

---

## Fase 3 — Persistência: schema, migrations, seed e Postgres local

**Objetivo.** Traduzir o modelo conceitual (funcional seção 13) para o schema físico Prisma (arquitetura seção 6), gerar as migrations, popular o catálogo de seleções por seed e ter um Postgres rodando localmente.

**Por que está aqui.** O núcleo já está pronto e provado; agora ele precisa de um lugar para os **dados crus** morarem. O schema é um artefato **único e interligado** (Participante ↔ indicação auto-referente, Rodada → Jogo → Palpite), então é construído de uma vez (horizontal). Tudo da API para cima depende dele.

**Passos.**

1. Subir um **Postgres local via Docker Compose**. Isso te dá um banco descartável e idêntico ao de produção, e já adianta o aprendizado de Docker que será usado no deploy.
2. Escrever o `schema.prisma` traduzindo a seção 13 do funcional, seguindo a proposta da seção 6 do técnico:
   - **enums**: `StatusPagamento`, `FaseRodada`, `EstadoRodada`;
   - **Selecao** (nome + bandeira);
   - **Participante** com a **indicação auto-referente** (`indicadorId` opcional → `Participante`, relação um-indicador-para-vários-indicados) — o ponto mais interessante da modelagem;
   - **Rodada** (fase, ordem 1..5, estado) **1—N** **Jogo**;
   - **Jogo** com `selecaoEsquerdaId`/`selecaoDireitaId` (**posicionais** — 2×1 ≠ 1×2, e isso **não** é mando de campo) e `golsEsquerdaReal`/`golsDireitaReal` **nulos** até o resultado existir;
   - **Palpite** com a constraint `@@unique([participanteId, jogoId])` — **um palpite por participante por jogo**.
3. **Confirmar que os campos derivados NÃO viram coluna** (arquitetura 6 / 5.4): valor a pagar, pontos, totais, classificação, placares exatos não existem no schema. Se você sentir vontade de criar uma coluna `pontos`, pare — ela é calculada na hora.
4. Gerar a primeira **migration** e aplicá-la no banco local. Entender a diferença entre `migrate dev` (desenvolvimento, cria e aplica) e `migrate deploy` (produção, só aplica o que já existe) — isso volta na Fase 8.
5. Escrever o **seed** do catálogo de seleções (nome + bandeira emoji). É dado de referência, majoritariamente fixo (funcional 11.8; arquitetura 6).
6. Ligar o **log de queries do Prisma** e **ler o SQL gerado** ao menos uma vez (arquitetura 4.6) — é a sua diretriz para não perder o aprendizado de SQL enquanto usa ORM.

**Pronto quando.** `migrate` aplica do zero num banco limpo, o seed popula o catálogo, e você consegue inspecionar as tabelas (ex.: pelo Prisma Studio ou um cliente SQL) e ver a estrutura batendo com a seção 13.

**Armadilhas.**
- Modelar mando de campo nos times. Não existe: a posição esquerda/direita é só para o placar (funcional 13; arquitetura 6). Modelar "casa/fora" introduz um conceito que o domínio não tem.
- Criar coluna para dado derivado "para facilitar". É exatamente a classe de bug que o princípio 5.4 elimina. Não faça.
- Esquecer a constraint `@@unique` no palpite. Sem ela, um participante pode acabar com dois palpites no mesmo jogo e o cálculo fica ambíguo.

---

## Fase 4 — Bootstrap HTTP + Autenticação

**Objetivo.** Levantar o servidor Fastify com a fronteira de validação (Zod), o tratamento de erros, e o fluxo de autenticação **single-user** (login → sessão por cookie httpOnly → rota protegida). Provar o loop de auth com uma rota de saúde antes de construir qualquer feature.

**Por que está aqui — e por que auth ANTES das features.** Esta é uma decisão de ordem deliberada para **evitar retrabalho**. Se você construir todas as rotas de feature sem proteção e só depois "tampar" com autenticação, terá que voltar em cada rota e em cada teste de API para incluir a sessão. Montando o esqueleto de auth **agora** — login, sessão, e um *preHandler* "proteger" aplicável a grupos de rotas — toda rota de feature já nasce protegida e cada teste de API já é escrito autenticado. Auth no Fastify é um hook que envolve as rotas; ele não muda a lógica delas, então cabe perfeitamente como camada de bootstrap.

**Passos.**

1. Levantar o **Fastify** com TypeScript (arquitetura 4.3). Configurar o **tratamento de erros** central (transformar erros de validação e de domínio em respostas HTTP coerentes).
2. Montar a **fronteira de validação com Zod** (arquitetura 4.7): o padrão de como cada payload é validado antes de chegar ao serviço. Validar também o **`.env` no boot** com um schema Zod (arquitetura 10) — se faltar uma variável essencial, a aplicação falha ao subir, não no meio de uma requisição.
3. Implementar a **autenticação mínima e correta** (arquitetura 4.8 / 10):
   - senha do organizador **hasheada com argon2id** (bcrypt aceitável), guardada no banco — nunca em texto puro nem hardcoded;
   - rotas `POST /auth/login` e `POST /auth/logout`;
   - **sessão por cookie httpOnly** (+ `Secure`, `SameSite`);
   - um **preHandler** "exigir sessão" que protege grupos de rotas.
4. Criar uma rota de saúde protegida (ex.: `GET /painel` ainda stub, ou um `GET /me`) só para **provar o loop**: sem cookie → 401; com login válido → cookie → acesso liberado.

**Marco recomendado — deploy de fumaça (esqueleto ambulante).** Com auth funcionando e o banco conectado, faça aqui o **primeiro deploy** num PaaS (Railway/Render — arquitetura 9) com Postgres gerenciado e HTTPS. Objetivo único: provar que o cano inteiro (build → banco → migration em produção → HTTPS → login) existe e funciona. É barato consertar problema de deploy agora; é caro descobri-lo no fim. O endurecimento de infra fica para a Fase 8 — aqui é só o fio fino atravessando tudo.

**Pronto quando.** Servidor sobe; `.env` é validado no boot; login com senha correta cria sessão; rota protegida bloqueia sem sessão e libera com sessão; (idealmente) isso tudo já roda também no deploy de fumaça.

**Armadilhas.**
- Trazer uma biblioteca de auth pesada (OAuth, papéis, recuperação social). Você tem **um usuário** (arquitetura 4.8). Implementar o fluxo mínimo à mão é também o exercício de segurança.
- Senha hardcoded ou em texto puro "só para testar". Já comece hasheada — o hábito errado gruda.
- Esquecer `httpOnly`/`Secure`/`SameSite` no cookie. São a defesa básica (contra XSS e afins) que justifica a escolha de sessão por cookie.

---

## Fase 5 — Features do backend (fatias verticais, em ordem de dependência)

**Objetivo.** Construir o backend completo, **uma feature de cada vez**, cada uma atravessando repositório → serviço → schema Zod → rota → testes. Ao final, a API inteira responde, validada e testável por um cliente HTTP, sem nenhuma tela ainda.

**Por que esta ordem interna.** As features são ordenadas por **dependência**: cada uma só usa coisas que as anteriores já entregaram. Você estabelece o **padrão de camadas** na primeira fatia (a mais simples) e o repete — aprende a estrutura no caso fácil antes do difícil. As leituras agregadas (que dependem do princípio "derivado não se armazena") vêm no fim, e o painel — que agrega tudo — é o último.

> **Padrão de cada fatia (repita em todas):** (1) **Repositório** — única camada que fala com o Prisma, expõe métodos de leitura/escrita de dados crus; (2) **Serviço** — orquestra o fluxo, chama repositório + funções de domínio, **sem SQL e sem HTTP**; (3) **Schema Zod** — valida o payload da rota; (4) **Rota Fastify** — traduz requisição↔resposta, **sem regra**, já sob o preHandler de auth; (5) **Testes** — de serviço/integração no fluxo, e de API no caminho feliz.

**Ordem das fatias.**

1. **Participantes (CRUD).** A fatia fundadora — *tudo* referencia participante. Inclui o cadastro de nome, **apelido opcional**, **status** (padrão Pendente) e o **"indicado por" opcional, selecionando um participante já existente** (a indicação auto-referente; nunca digitar nome). É a fatia mais simples, ideal para fixar o padrão de camadas. Endpoints: `GET/POST /participantes`, `PUT /participantes/:id`. Já considerar busca/filtro/ordenação como parâmetros de query (funcional 9.2; arquitetura 7).
2. **Pagamentos.** Depende de Participantes + da função pura `calcularValorAPagar` (Fase 1) + dos totais. O **valor a pagar é derivado** (conta os indicados diretos na hora); o status é manual (`PUT /pagamentos/:participanteId` alterna Pago/Pendente). Os **totais** (esperado/recebido/falta) também são derivados. Aqui você sente, na prática, o princípio 5.4 funcionando: nada disso é coluna.
3. **Catálogo de seleções.** Pequena, majoritariamente leitura (`GET`), apoiada no seed da Fase 3. Necessária antes de montar rodadas.
4. **Rodadas e Jogos (montar rodada).** Criar rodada selecionando seleções **par a par** do catálogo (funcional 9.6; arquitetura 7: `POST /rodadas`). Implementar as transições do **ciclo de vida** (montada → palpites abertos → resultados em andamento → encerrada) como `PUT /rodadas/:id/estado` — lembrando que o estado é **guia, não trava** (funcional 10; correções são sempre livres).
5. **Palpites.** Registrar os palpites de um participante numa rodada (`PUT /participantes/:pid/rodadas/:rid/palpites`), respeitando o unique (um por jogo). Expor **"quem ainda não palpitou"** (`GET /rodadas/:id/pendentes`) usando a função pura da Fase 1.
6. **Resultados e Pontuação.** O **coração da orquestração**: `PUT /jogos/:id/resultado` registra o placar de 90 min e **dispara o recálculo** — pontos da rodada e classificação geral, tudo via funções puras da Fase 1, **calculado sob demanda**. Como correções são livres (funcional 8.6), reeditar um resultado simplesmente recalcula. Testar o fluxo "registrar resultado recalcula rodada e classificação" (arquitetura 8) é prioridade.
7. **Exportações.** Agora que os dados e os cálculos existem, os endpoints que retornam **`text/plain`** ligando repositórios + formatadores da Fase 2: mensagem da rodada, resumo do jogo, resumo da rodada, classificação, lista de participantes, pagamentos, pendências (arquitetura 7). É o `derivado-não-se-armazena` em ação: busca o estado atual → formata na hora → devolve texto.
8. **Painel.** Por último, porque **agrega tudo**: pagamentos (quantos pagaram de quantos, total recebido vs. esperado, falta), rodada atual (qual, estado, quantos já palpitaram) — `GET /painel` (funcional 11.2; arquitetura 7).

**Pronto quando.** Todos os endpoints do contrato (arquitetura seção 7) respondem corretamente, validados por Zod, protegidos por auth, com testes de serviço nos fluxos críticos (pontuação, indicação) e testes de API nos caminhos felizes. Você consegue operar um bolão inteiro de mentira só pela API (cadastrar gente, montar rodada, lançar palpites, lançar resultados, ver classificação, gerar todos os textos) usando só um cliente HTTP.

**Armadilhas.**
- Vazar regra de negócio para a rota ou para o repositório. Regra mora no **domínio**; serviço **orquestra**; rota **traduz**; repositório **persiste**. Quando a rota começa a calcular pontos, a arquitetura furou.
- Persistir um derivado "porque a query ficou repetida". Com ~2 mil registros o recálculo é instantâneo (arquitetura 5.4); a repetição se resolve extraindo uma função, não criando coluna.
- Construir os endpoints de exportação **antes** de Resultados/Pontuação. O resumo do jogo precisa dos pontos; respeite a ordem.
- Pular os testes de serviço da regra de indicação (desconto vale mesmo sem o indicado ter pago; só indicação direta — funcional 8.7). É regra sutil e fácil de implementar errado.

---

## Fase 6 — Fundação do frontend

**Objetivo.** Montar a base do SPA (Vite + React + TypeScript + Tailwind) que vai consumir a API: estrutura de pastas, cliente HTTP, roteamento, layout responsivo base e o tratamento de sessão/login no front.

**Por que está aqui.** Só faz sentido começar o frontend com o backend completo e estável (princípio 2.7): a tela é cliente de um **contrato** já pronto e testado (arquitetura 4.9). Montar a fundação antes das telas evita refazer o cliente HTTP e o layout a cada nova página.

**Passos.**

1. Inicializar **Vite + React + TypeScript** e configurar **Tailwind** (arquitetura 4.9). Replicar a estrutura de pastas proposta (técnico 5.5): `pages/`, `components/`, `api/`, `lib/`.
2. Construir o **cliente HTTP** (`api/`) — a camada que conhece o contrato da API. Centralizar aqui as chamadas, o envio do cookie de sessão e o tratamento de 401 (redirecionar para login). Isso reforça "API como contrato".
3. Configurar o **roteamento** e um **layout base responsivo** (funcional 5/15: limpo e confortável no mobile **e** no desktop). Definir cedo a navegação entre as telas do mapa (funcional seção 11).
4. Construir um **componente compartilhado de "Copiar para WhatsApp"** usando a Clipboard API — ele recebe o texto pronto do back e copia. Como exportar é o requisito nº 1 (funcional 15), trate-o como peça de primeira classe, reutilizada em todas as telas.
5. Decidir Tailwind puro vs. biblioteca de componentes (ex.: shadcn/ui — arquitetura 4.9/13). Para um projeto solo focado em aprendizado, começar com Tailwind puro e adotar componentes só onde acelerar é uma escolha defensável.

**Pronto quando.** O app sobe, faz login contra a API real, mantém a sessão, navega entre rotas vazias (stubs) e tem o botão "Copiar" funcionando com um texto de teste.

**Armadilhas.**
- Reimplementar regra ou formatação no front. O front **só consome** o que o back já calculou e formatou (arquitetura 4.9). Nada de recalcular pontos ou montar a string do WhatsApp na tela.
- Espalhar `fetch` por todo componente. Centralize no `api/` — quando o contrato mudar, muda num lugar só.

---

## Fase 7 — Telas do frontend (em ordem de dependência)

**Objetivo.** Implementar as 8 telas do mapa (funcional seção 11), cada uma consumindo os endpoints já prontos, com busca/filtro/ordenação nas listas e o botão de exportação em toda lista.

**Por que esta ordem.** Mesma lógica do backend: cada tela depende de dados/telas anteriores; a tela inicial (painel) agrega tudo e por isso vem **por último**, mesmo sendo a "porta de entrada" do produto.

**Ordem das telas.**

1. **Login** (funcional 11.1) — o portão; sem ele nada mais é acessível.
2. **Participantes** (11.3) — lista com **busca, filtro e ordenação**; cadastro/edição com nome, apelido, "indicado por" (seleção de existente) e status; clicar abre o perfil. Exportável.
3. **Pagamentos** (11.5) — lista com status e valor a pagar, filtro (ex.: só pendentes), ordenação, e os **totais** (esperado/recebido/falta). Exportável.
4. **Rodadas + Catálogo + Montar rodada** (11.6/11.8) — as 5 rodadas com seus estados; montar selecionando seleções par a par do catálogo.
5. **Rodada (detalhe)** (11.7) — a tela mais rica: jogos da rodada, registrar palpites por participante, ver **quem ainda falta**, registrar resultados (placar 90 min), ver a pontuação calculada, e os **artefatos** (mensagem da rodada, tabela de palpites, resumo do jogo, resumo da rodada, pendências) com botão de copiar.
6. **Perfil do participante** (11.4) — visão individual consolidada: quem indicou e quem ele indicou, valor/status, placares exatos, pontos por rodada e posição acumulada. Serve para responder rápido "como eu estou?".
7. **Painel de visão geral** (11.2) — a tela inicial: pagamentos num relance, pote, rodada atual e quantos já palpitaram, com atalhos. Construída por último porque depende de todas as agregações.

Em todas: **toda lista tem exportação** (regra geral da seção 11) e a interface é confortável no mobile e no desktop.

**Pronto quando.** As 8 telas funcionam ponta a ponta contra a API real; listas têm busca/filtro/ordenação; cada lista exporta texto correto para o WhatsApp; a navegação do mapa (seção 11) está completa.

**Armadilhas.**
- Começar pelo painel "porque é a home". Ele depende de tudo; deixá-lo por último evita construir contra dados que ainda não existem nas outras telas.
- Esquecer o teste real no **celular**. O requisito é explícito (funcional 5/15) e o organizador vai operar muito pelo celular. Emulador não substitui o aparelho real.

---

## Fase 8 — Deploy e infraestrutura (fazer direito)

**Objetivo.** Transformar o deploy de fumaça da Fase 4 num deploy de produção sólido e, opcionalmente, evoluir para VPS como exercício de infraestrutura.

**Por que está aqui.** O cano já foi provado cedo (Fase 4). Agora, com o produto completo, faz-se a infra com capricho: empacotamento reproduzível, variáveis, HTTPS, migrations em produção, e — se você quiser o aprendizado de ops — o caminho de VPS.

**Passos.**

1. **Empacotar com Docker** (arquitetura 9/T15) — fixando a imagem base no Node 24 (T2), pela reprodutibilidade (sobe igual no PC, no CI e em produção). Recomendado, não obrigatório dado o tamanho — mas é ótimo aprendizado de infra.
2. **PaaS de produção** (Railway/Render/Fly.io — arquitetura 9): Postgres gerenciado (Neon/Supabase — arquitetura 13), HTTPS automático, variáveis de ambiente configuradas (segredos fora do versionamento — arquitetura 10), e `migrate deploy` aplicando as migrations em produção.
3. Frontend em Vercel/Netlify/Cloudflare Pages (arquitetura 9), ou servido pelo próprio servidor no caminho VPS.
4. **VPS Linux (evolução opcional, arquitetura 9)** — como exercício deliberado, casa direto com seu interesse em Linux/infra/segurança: provisionar o servidor, **Nginx** como reverse proxy, gerência de processo (systemd ou PM2), Postgres instalado e protegido, firewall, **TLS via Let's Encrypt**.

**Pronto quando.** O sistema completo está no ar em HTTPS, com banco gerenciado, migrations aplicadas em produção e segredos fora do código. (Se seguiu o VPS: rodando atrás de Nginx com TLS e processo gerenciado.)

**Armadilhas.**
- Rodar `migrate dev` em produção. Em produção é `migrate deploy` (aplica, não cria) — entendido lá na Fase 3.
- Colocar segredo no repositório ou na imagem Docker. Variáveis de ambiente, sempre fora do versionamento (arquitetura 10).
- Pular o Docker "porque é pequeno" e perder a reprodutibilidade. É opcional pela escala, mas é justamente o aprendizado de infra que te interessa.

---

## Fase 9 — Endurecimento e finalização

**Objetivo.** Fechar as pontas de qualidade: casos de borda, responsividade real, acessibilidade básica, documentação e CI completo.

**Por que está aqui.** Com tudo funcionando e no ar, esta fase é o polimento que transforma "funciona" em "bem feito, fácil de manter e de evoluir" — exatamente o que você pediu.

**Passos.**

1. **Casos de borda** do domínio na prática: rodada final com **3º lugar + final (2 jogos)** numa rodada só (funcional 6/16 #19); participante com 7+ indicados travado no piso; empate de classificação no terceiro critério (ajuste manual); correção de resultado já lançado recalculando tudo (funcional 8.6).
2. **Responsividade real** no celular e no desktop, com listas de ~63 itens (funcional 15): a tela continua confortável e a exportação continua impecável.
3. **Acessibilidade básica**: foco visível, contraste, navegação por teclado nos formulários, rótulos nos campos. Não é exigência do doc, mas é boa prática barata que faz diferença.
4. **Documentação**: `README` completo (como rodar local, como testar, como fazer deploy) e um **runbook** curto do organizador ("como abrir uma rodada", "como lançar resultado", "como gerar a classificação"). Vincular os três documentos (funcional, arquitetura, este roteiro).
5. **CI completo** (arquitetura 13): lint + testes a cada push, idealmente bloqueando merge se quebrar. Você já montou o esqueleto na Fase 0; agora ele cobre todo o núcleo.

**Pronto quando.** Os casos de borda têm teste; o app é confortável em celular e desktop com a lista cheia; há README + runbook; o CI roda verde e cobre o núcleo de domínio.

**Armadilhas.**
- Tratar esta fase como "opcional". É ela que entrega a manutenibilidade e a evolução fácil que você quer — pular aqui é entregar dívida.

---

## 4. Riscos e armadilhas transversais (valem para todas as fases)

- **Não pular a ordem de dentro para fora.** A tentação de "começar pela tela porque é visível" é a maior fonte de retrabalho. A tela é a última camada por um motivo.
- **Derivado nunca vira coluna.** Toda vez que bater a vontade de salvar um valor calculado, lembre da seção 5.4: ~2 mil registros, recálculo instantâneo, e some uma classe inteira de bugs de dado desatualizado.
- **Regra de negócio mora no domínio.** Se a rota, o repositório ou a tela começarem a calcular, a arquitetura furou. Mova a regra para uma função pura testada.
- **Texto do WhatsApp é gerado no back-end.** Sempre. O front só copia.
- **Nada de over-engineering.** Os anti-padrões já estão listados (arquitetura 11): sem Redis, filas, microsserviços, GraphQL ou Kubernetes. A maturidade aqui é *não* trazer complexidade que o problema não pede.
- **Commits pequenos, CI verde.** Cada unidade lógica num commit; cada push verificado. Histórico legível é manutenção barata.
- **Cada fase fecha com seu "Pronto quando".** Não avance com o chão de trás instável.

---

## 5. Checklist resumido (a sequência, em uma olhada)

1. **Fase 0** — Repositório, TS estrito, Biome, Vitest, estrutura de pastas, CI mínimo, README inicial.
2. **Fase 1** — Funções puras do domínio com TDD (pontuação 3/1/0, valor a pagar com piso, desempate em cascata, quem não palpitou), usando os casos prontos do doc funcional.
3. **Fase 2** — Formatadores puros dos 8 artefatos do WhatsApp (sem tabela, com emoji/monoespaçado).
4. **Fase 3** — Schema Prisma (incl. indicação auto-referente e unique do palpite), migrations, seed do catálogo, Postgres local via Docker; ler o SQL gerado.
5. **Fase 4** — Fastify + Zod na fronteira + `.env` validado + auth single-user (argon2id, cookie httpOnly) + rota protegida. **→ Deploy de fumaça (esqueleto ambulante).**
6. **Fase 5** — Features verticais na ordem: Participantes → Pagamentos → Catálogo → Rodadas/Jogos → Palpites → Resultados/Pontuação → Exportações → Painel. (Repo → serviço → Zod → rota → testes em cada uma.)
7. **Fase 6** — Frontend base: Vite/React/TS/Tailwind, cliente HTTP, roteamento, layout responsivo, sessão, botão "Copiar".
8. **Fase 7** — Telas na ordem: Login → Participantes → Pagamentos → Rodadas/Montar → Rodada (detalhe) → Perfil → Painel.
9. **Fase 8** — Deploy de produção: Docker, PaaS + Postgres gerenciado, HTTPS, `migrate deploy`; depois VPS + Nginx + TLS (opcional).
10. **Fase 9** — Endurecimento: casos de borda, responsividade real, acessibilidade básica, README + runbook, CI completo.

---

*Documento de roteiro de desenvolvimento. Complementa — e nunca substitui — o documento de contexto funcional (fonte de verdade do comportamento) e o documento de arquitetura (fonte de verdade da stack). Aqui mora apenas a ordem de execução e a justificativa dela.*
