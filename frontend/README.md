# VirtuEx Frontend

Next.js 15 App Router 기반 실시간 모의 거래 플랫폼 웹 UI입니다.
Real-time simulated trading platform web UI built with Next.js 15 App Router.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
cp .env.example .env.local   # adjust values as needed
pnpm dev                      # starts on http://localhost:4000
```

## Environment Variables (.env.local)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | API Gateway URL (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL (default: `ws://localhost:3000`) |

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server on port 4000 |
| `pnpm build` | Production build |
| `pnpm start` | Start production server on port 4000 |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run Jest tests |
| `pnpm test:cov` | Run tests with coverage |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Query (TanStack Query)
- **Charts**: Lightweight Charts
- **Editor**: TipTap (rich text)
- **i18n**: Custom dual-language (KO/EN)
