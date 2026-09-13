# Renovate AI Frontend

React + TypeScript frontend for the E2M house renovation platform.

## Stack

- Vite, React, TypeScript
- Tailwind CSS v4, shadcn/ui
- TanStack Query, Zustand, React-Konva, Motion

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

App runs at `http://localhost:5173` and connects to the NestJS API at `http://localhost:3000/api/v1`.

## Scripts

- `pnpm dev` — development server
- `pnpm build` — production build
- `pnpm typecheck` — TypeScript check
- `pnpm preview` — preview production build
