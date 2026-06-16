# Bolão Copa do Mundo 2026

Sistema web de **uso exclusivo do organizador** de um bolão de mata-mata da Copa 2026:
rodadas, jogos, palpites, resultados, cálculo automático de pontuação/classificação,
controle de pagamentos (com desconto por indicação) e **geração de textos prontos para
colar no WhatsApp**.

> A verdade do projeto está nos documentos-fonte em [`docs/`](docs/):
> [funcional](docs/documentacao_oficial_bolao.md) (o quê),
> [arquitetura](docs/documentacao_arquitetura_bolao.md) (como) e
> [roteiro](docs/documentacao_roteiro_desenvolvimento_bolao.md) (em que ordem).
> O guia operacional do dia a dia está no [CLAUDE.md](CLAUDE.md).

## Estrutura

```
backend/    # API (TypeScript + Node 24). Domínio, serviços, repositórios, HTTP.
frontend/   # SPA — inicializado na Fase 6 (Vite + React + TS + Tailwind).
docs/       # documentos-fonte.
```

## Pré-requisitos

- **Node.js 24** (Active LTS) — fixado em `backend/package.json` (`engines`) e em
  `backend/.nvmrc`. O `backend/.npmrc` liga `engine-strict=true`, então o `npm install`
  **falha** em versões diferentes de Node 24 (paridade com CI e produção é garantida, não
  só avisada).
- **npm** (gerenciador único do projeto).

## Como rodar (backend)

Dentro de `backend/`:

```bash
npm install          # instala as dependências (exige Node 24)

npm run check        # Biome: lint + format check (porta do CI / pré-commit)
npm run typecheck    # tsc --noEmit: valida os tipos (strict)
npm test             # Vitest (uma vez)
npm run test:watch   # Vitest em watch (use no TDD do domínio, Fase 1)

npm run format       # Biome: formata e escreve
npm run lint         # Biome: só o linter
```

## Estado atual

**Fase 0 — Fundação e ferramental.** Bancada montada (TS estrito, Biome, Vitest, CI).
Ainda **sem regra de negócio** — isso começa na Fase 1. A ordem de construção está no
[roteiro](docs/documentacao_roteiro_desenvolvimento_bolao.md).
