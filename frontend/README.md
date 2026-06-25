# Frontend — Bolão Copa 2026

SPA que **só consome** a API do backend (CLAUDE.md §3.1): não recalcula regra nem
formata texto de WhatsApp — isso vive no núcleo. Stack: **Vite + React + TypeScript +
Tailwind v4 + shadcn/ui** (arquitetura §4.9). Inicializado na **Fase 7** do roteiro,
com o backend já completo e testável.

## Rodar (dev)

```bash
npm install
npm run dev        # Vite em http://localhost:5173
```

Precisa do **backend no ar** em `http://localhost:3000` (`cd ../backend && npm run dev`).

- `npm run build` — typecheck (`tsc -b`) + build de produção (Vite → `dist/`).
- `npm run preview` — serve o build localmente.

## Ligação com a API

O front fala com a API **direto** via `VITE_API_URL` (`http://localhost:3000`) — **sem
proxy do Vite**. O CORS do backend libera a origem `http://localhost:5173` com
`credentials: true`; o cliente HTTP (Fatia 7.2) usará `fetch(..., { credentials:
"include" })` para enviar o cookie de sessão.

> **Cookie de sessão em dev:** funciona porque `:5173` e `:3000` são o **mesmo site**
> (`SameSite` ignora a porta), então o cookie `SameSite=Strict` atravessa. Em produção
> cross-site (front e API em domínios diferentes), a política de cookie será revisitada
> (Fatia 7.2 / Fase 9).

Configure a URL copiando `.env.example` → `.env` (este último não é versionado).

## Estrutura (arquitetura §5.5)

- `src/pages/` — telas (Fase 8).
- `src/components/` — componentes; `components/ui/` são os do shadcn/ui.
- `src/api/` — cliente HTTP (Fatia 7.2; hoje vazio).
- `src/lib/` — utilitários (ex.: `cn`).

Componentes shadcn entram sob demanda: `npx shadcn@latest add <nome>` (config em
`components.json`). Hoje só o `Button` está instalado, para provar o pipeline.
