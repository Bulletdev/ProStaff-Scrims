
```
>  ███████╗ ██████╗██████╗ ██╗███╗   ███╗███████╗   ██╗      ██████╗ ██╗
>  ██╔════╝██╔════╝██╔══██╗██║████╗ ████║██╔════╝   ██║     ██╔═══██╗██║
>  ███████╗██║     ██████╔╝██║██╔████╔██║███████╗   ██║     ██║   ██║██║
>  ╚════██║██║     ██╔══██╗██║██║╚██╔╝██║╚════██║   ██║     ██║   ██║██║
>  ███████║╚██████╗██║  ██║██║██║ ╚═╝ ██║███████║   ███████╗╚██████╔╝███████╗
>  ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚══════╝   ╚══════╝ ╚═════╝ ╚══════╝
>                    WEB — Scrim Management Platform for LoL
```

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](http://creativecommons.org/licenses/by-nc-sa/4.0/)

</div>

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  SCRIMS.LOL — Next.js 15 (App Router)                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Frontend for the scrims.lol scrim management platform.                      ║
║  Powered by ProStaff.gg · PT-BR & EN · JWT Auth · TanStack Query             ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

<details>
<summary><kbd>▶ Key Features (click to expand)</kbd></summary>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [■] Dashboard             — Record de scrims, atividade recente e métricas │
│  [■] Scrims                — Agendamento, histórico e analytics de treinos  │
│  [■] Matchmaking           — Sugestões de adversários por região e tier     │
│  [■] Disponibilidade       — Janelas de horário configuráveis por semana    │
│  [■] Inhouse               — Sessões internas com balanceamento por tier    │
│  [■] Analytics             — KDA, gráficos e tendências de performance      │
│  [■] Lobby Público         — Página pública do time para receber desafios   │
│  [■] Convites de Scrim     — Formato de draft, data proposta e mensagem     │
│  [■] Configurações         — Perfil, tagline pública, integração Discord    │
│  [■] i18n                  — Suporte a PT-BR e EN                           │
│  [■] Retro UI              — Design system com tema escuro inspirado em LoL │
└─────────────────────────────────────────────────────────────────────────────┘
```

</details>

---

## Table of Contents

```
┌──────────────────────────────────────────────────────┐
│  01 · Quick Start                                    │
│  02 · Technology Stack                               │
│  03 · Project Structure                              │
│  04 · Environment Variables                          │
│  05 · Pages & Routes                                 │
│  06 · Internacionalização                            │
│  07 · Design System                                  │
│  08 · API Integration                                │
│  09 · License                                        │
└──────────────────────────────────────────────────────┘
```

---

## 01 · Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Start development server (Turbopack, port 4444)
npm run dev
```

```
  App:  http://localhost:4444
  API:  http://localhost:3333/api/v1  (prostaff-api)
```

---

## 02 · Technology Stack

```
╔══════════════════════╦════════════════════════════════════════════════════╗
║  LAYER               ║  TECHNOLOGY                                        ║
╠══════════════════════╬════════════════════════════════════════════════════╣
║  Framework           ║  Next.js 15 (App Router, Turbopack)                ║
║  Language            ║  TypeScript 5                                      ║
║  Styling             ║  Tailwind CSS 3                                    ║
║  State / Fetching    ║  TanStack Query v5 + Zustand v5                    ║
║  Forms               ║  React Hook Form + Zod                             ║
║  Charts              ║  Recharts 3                                        ║
║  UI Primitives       ║  Radix UI (Dialog, Tabs, Tooltip, etc.)            ║
║  Animations          ║  Framer Motion 11                                  ║
║  Notifications       ║  Sonner (toasts)                                   ║
║  Icons               ║  Lucide React                                      ║
║  HTTP Client         ║  Fetch wrapper (src/lib/api.ts)                    ║
║  Auth                ║  JWT via cookie (useToken hook)                    ║
╚══════════════════════╩════════════════════════════════════════════════════╝
```

---

## 03 · Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── page.tsx              — Dashboard principal
│   │       ├── scrims/               — Scrims (lista + form)
│   │       ├── matchmaking/          — Sugestões + convites
│   │       ├── availability/         — Janelas de disponibilidade
│   │       ├── inhouse/              — Sessões inhouse
│   │       ├── analytics/            — Gráficos e métricas
│   │       └── settings/             — Configurações da org
│   ├── lobby/                        — Lobby público (sem auth)
│   └── page.tsx                      — Landing page
├── components/
│   ├── ui/                           — Design system (Button, RetroPanel, etc.)
│   └── layout/                       — Sidebar, Header
├── contexts/
│   └── LanguageContext.tsx           — Provedor de i18n
├── hooks/
│   └── useToken.ts                   — JWT do cookie
├── lib/
│   ├── api.ts                        — Fetch wrapper com auth
│   └── utils.ts                      — Helpers (tierLabel, cn, etc.)
├── translations/
│   ├── pt.json                       — Strings em PT-BR
│   └── en.json                       — Strings em EN
└── types/
    └── index.ts                      — Tipos TypeScript globais
```

---

## 04 · Environment Variables

Crie `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1
```

---

## 05 · Pages & Routes

```
┌──────────────────────────────────┬──────────────────────────────────────────┐
│  ROUTE                           │  DESCRIPTION                             │
├──────────────────────────────────┼──────────────────────────────────────────┤
│  /                               │  Landing page pública                    │
│  /lobby                          │  Perfil público do time                  │
│  /dashboard                      │  Overview: record, scrims, atividade     │
│  /dashboard/scrims               │  Agendamento e histórico de scrims       │
│  /dashboard/matchmaking          │  Sugestões e envio de convites           │
│  /dashboard/availability         │  Janelas de horário disponíveis          │
│  /dashboard/inhouse              │  Sessões internas balanceadas            │
│  /dashboard/analytics            │  Estatísticas e gráficos                 │
│  /dashboard/settings             │  Perfil da organização                   │
└──────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 06 · Internacionalização

Suporte completo a **PT-BR** e **EN** via `LanguageContext`.

```
src/translations/
├── pt.json   — Strings em português
└── en.json   — Strings em inglês
```

Para usar em qualquer componente:

```tsx
const { t } = useLanguage()

<p>{t('dashboard.title')}</p>
<p>{t('matchmaking.score', { value: '4.20' })}</p>
```

O idioma é persistido via cookie e pode ser alternado no header do dashboard.

---

## 07 · Design System

O design system usa um tema **retro/dark** inspirado na estética de LoL competitivo.

```
┌────────────────────┬──────────────────────────────────────────────────────┐
│  COMPONENT         │  DESCRIPTION                                         │
├────────────────────┼──────────────────────────────────────────────────────┤
│  RetroPanel        │  Card com cantos decorativos e borda dourada         │
│  RetroBadge        │  Badge com variantes: gold, blue, red, muted         │
│  Button            │  Variantes: primary, secondary, ghost, outline       │
│  ScoreBar          │  Barra win/loss com percentual                       │
└────────────────────┴──────────────────────────────────────────────────────┘
```

Cores principais (`tailwind.config.ts`):

```
navy-deep    — fundo principal
navy-card    — cards e painéis
gold         — destaque / bordas
text-primary — texto principal
text-muted   — texto secundário
danger       — erros / vermelho
```

---

## 08 · API Integration

O frontend consome a API REST do **prostaff-api** (Rails 7.2).

```
Base URL: NEXT_PUBLIC_API_URL (default: http://localhost:3333/api/v1)
Auth:     Bearer token JWT enviado via cookie (cookie: "token")
```

Wrapper em `src/lib/api.ts`:

```ts
api.get('/scrims', { token })
api.post('/matchmaking/scrim-requests', body, { token })
api.patch('/matchmaking/scrim-requests/:id/accept', {}, { token })
```

> Para rodar a API localmente, veja o repositório `prostaff-api`.

---

## 09 · Scripts

```bash
npm run dev      # Desenvolvimento (Turbopack, porta 4444)
npm run build    # Build de produção
npm run start    # Serve o build de produção
npm run lint     # ESLint
```

---

## 10 · License

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">
  <img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" />
</a>

This work is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

---

<div align="center">
  <strong>scrims.lol</strong> · Powered by <a href="https://prostaff.gg">ProStaff.gg</a>
</div>
