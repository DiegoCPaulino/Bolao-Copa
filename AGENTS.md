# AGENTS.md — guia para agentes (Codex/GPT e outros) neste repositório

## 0. Leitura obrigatória antes de tocar em qualquer código

Este projeto tem um **`CLAUDE.md`** na raiz: é o briefing operacional e a **principal fonte
de contexto** — leia-o por inteiro primeiro. A verdade detalhada mora em **três
documentos-fonte** (em `docs/`):

- `docs/documentacao_oficial_bolao.md` — **funcional v8** (o QUÊ: escopo, regras, ordem de entrega).
- `docs/documentacao_arquitetura_bolao.md` — **arquitetura v2** (o COMO: stack, camadas, modelo físico).
- `docs/documentacao_roteiro_desenvolvimento_bolao.md` — **roteiro v2** (a ORDEM: 11 fases em 2 entregas).

**Não existe README na raiz** — use o `CLAUDE.md` + os três docs como leitura canônica (há um
`README` de reserva dentro de `frontend/`). Antes da tarefa, leia também os arquivos relevantes a ela.

**Precedência (em conflito):** comportamento/regra → **funcional v8**; stack/estrutura →
**arquitetura v2**; ordem de construção → **roteiro v2**. O `CLAUDE.md` resume e **nunca
redefine**; se ele divergir de um doc-fonte, vence o doc — e avise o autor.

## 1. O que é o projeto (em 5 linhas)

Sistema de **uso exclusivo do organizador** de um bolão de mata-mata da Copa 2026 (~63
participantes, 32 jogos, 5 rodadas). **Single-user:** participantes não acessam — existem só
como registros. O sistema **gera textos** para o organizador colar no WhatsApp (requisito
nº 1); **nunca** envia mensagem nem busca resultado sozinho. Não é problema de escala — é de
**regra de negócio** (o risco está no cálculo, não no volume).

## 2. As duas entregas e a FASE ATUAL

Mesma regra de negócio, ordens diferentes de entrega:

- **Entrega 1** — sistema funcional via **terminal (CLI)**, local, Postgres no Docker, **sem
  HTTP/auth/front/deploy**. (Concluída.)
- **Entrega 2** — **API HTTP (Fastify) + autenticação + front React + deploy**, sobre o
  **mesmo núcleo** (só acrescenta adaptadores).

> **Estamos na Entrega 2, Fase 8 (telas do front).** Prontas: Login, Participantes,
> Pagamentos. Stubs: Painel, Rodadas. **Não antecipe** fases/infra que não pertencem à atual.

> Vocabulário: **"Entrega 1/2"** = entregas do produto; **"Fase 0…10"** = etapas de
> construção (roteiro). Não confundir.

## 3. Princípios inegociáveis (CLAUDE.md §3)

1. **Núcleo agnóstico de interface (regra nº 1):** `domain/`, `services/`, `repositories/`
   **não** conhecem terminal nem HTTP. Nada de `console.log`, `req`/`res` ou tipos de
   framework ali. Serviços recebem/devolvem dados tipados; quem imprime/serializa é o
   **adaptador** (CLI ou HTTP).
2. **Derivado não se armazena:** pontuação, classificação, valor a pagar, totais, premiação,
   "quem não palpitou" são **calculados sob demanda** — nunca viram coluna.
3. **Regra no domínio (funções puras):** cálculo mora em `domain/`. Se rota/comando/repo/tela
   calcula regra, a arquitetura furou.
4. **Texto do WhatsApp no núcleo:** formatadores em `domain/whatsapp/` são puros e **devolvem
   `string`**; o adaptador decide o destino; o front só **copia**.
5. **Pontuação só 90 min:** prorrogação/pênaltis não contam; **empate é palpite válido**.
6. **Posições do jogo são POSICIONAIS** (esquerda/direita só importam para o placar:
   2×1 ≠ 1×2). **Nunca** modelar mando de campo / casa-fora.
7. **Correções sempre livres:** o organizador edita palpite/resultado a qualquer momento e
   tudo recalcula. **Não há trava** (o ciclo de vida da rodada é guia, não trava).
8. **Single-user; auth só na Entrega 2.** Sem cadastro público, OAuth, papéis.
9. **Nada de over-engineering:** sem Redis, filas, microsserviços, GraphQL, Kubernetes;
   **Postgres mesmo local** (não SQLite); duas pastas-irmãs (não monorepo com ferramenta).

## 4. Mapa de pastas e regra de dependência

Dependências apontam **para dentro:** `adaptador (cli|http) → services → domain`; os
`repositories` isolam o Prisma; o `domain` não conhece interface nem Prisma.

```
backend/src/
  domain/        # regras puras + constantes + whatsapp/ (formatadores puros, devolvem string)
  repositories/  # ÚNICA camada que fala Prisma
  services/      # casos de uso — AGNÓSTICOS de interface (reusados pelos dois adaptadores)
  schemas/       # Zod NEUTRO — fonte única CLI + HTTP
  shared/        # utilitários compartilhados entre adaptadores
  config/        # env validado (Zod) + conexão Prisma
  cli/           # adaptador de terminal (Entrega 1)
  http/          # adaptador HTTP (Entrega 2): app/server/auth + routes/
frontend/src/    # pages/ components/ api/ lib/ — só CONSOME a API; nunca recalcula/formata
```

## 5. Comandos do dia a dia

Backend (de `backend/`; o Postgres sobe da raiz):

```
docker compose up -d                 # Postgres local (rodar na raiz do projeto)
npm run cli                          # abre o sistema no terminal (Entrega 1)
npm run dev                          # sobe o Fastify em watch (Entrega 2)
npm run test                         # Vitest
npm run check                        # Biome (lint + format) — rode antes de propor commit
npx prisma migrate dev --name <x>    # DEV (cria + aplica). Em produção: prisma migrate deploy
npm run db:seed                      # popula o catálogo de seleções
```

Frontend (de `frontend/`): `npm run dev` / `npm run build`.

> **⚠️ Windows:** o `npm run dev` do backend mantém o **DLL do engine do Prisma travado**.
> Antes de `prisma generate`/`migrate`, **derrube o dev server** (senão dá `EPERM` no rename
> do engine) e suba de novo depois. Vale também para o banco de TESTE: após mudar o schema,
> rode `npm run test:db` antes da suíte.

## 6. Regras obrigatórias para o agente

- **Não** alterar `.env`, segredos, credenciais ou chaves.
- **Não** commitar nem fazer push sem autorização explícita. **Não** reescrever histórico Git.
- **Não** instalar dependências sem aprovação. **Não** reestruturar pastas sem explicar e aprovar.
- Antes de mudança grande, **apresentar plano curto e aguardar OK**. Depois, **explicar
  exatamente o que mudou** (arquivos, testes, pendências).
- Rodar testes/lint/build quando possível. **Manter o padrão arquitetural**; não criar
  camadas novas sem justificativa.
- **TDD no domínio:** escrever o teste **antes** da implementação (o funcional já traz os
  casos prontos — §8.3 e §8.7).

## 7. Não "consertar" o que já é decisão

Duas features existem no código **e estão documentadas** — **não** as trate como divergência
a remover/"harmonizar":

- **Premiação (divisão do pote 75% / 25%)** — funcional **§8.9**; constante `FRACAO_PREMIACAO`.
  O sistema **calcula e exibe** o prêmio; **não movimenta dinheiro**.
- **"Exibir como pago no grupo"** — funcional **§8.8.1** / `CLAUDE.md` §7.4. É override só da
  **exportação**; a verdade interna é o `status` real (Pago/Pendente).

Em dúvida sobre uma regra, **pergunte ao autor** — não invente nem reescreva regra por conta
própria. Divergência entre código e doc é decisão do autor, não do agente.

## 8. Fluxo de trabalho

1. Entender a tarefa. 2. Ler `CLAUDE.md` + os três docs + arquivos relevantes. 3. Apresentar
plano. 4. Aguardar aprovação quando a mudança for grande. 5. Implementar com o menor impacto
possível. 6. Validar (test/lint/build). 7. Resumir alterações, testes e pendências.
