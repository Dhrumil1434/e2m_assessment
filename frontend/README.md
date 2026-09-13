# Frontend

React UI for the E2M renovation workflow. Desktop-first dark monochrome studio.

System context: [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Stack

- Vite 8, React 19, TypeScript
- Tailwind CSS v4, shadcn-style primitives
- TanStack Query (server state), Zustand (canvas / selection)
- React Router, React-Konva (renovation canvas)

## Port

**5173** — in share mode, ngrok tunnels here; `/api` is proxied to Nest `:3000`.

## What this app implements

| Step | UI | Behavior |
|------|-----|----------|
| Projects | Project list / create | Entry to a renovation job |
| Upload | Image picker | Multipart upload + quality check |
| Analyze | Progress / regions prep | Starts analyze job; polls until masks exist |
| Design | Renovation Studio | Konva canvas, masks, materials, OpenCV/AI apply |
| Measure | Calibration + areas | Auto-measure or manual; continues to estimate |
| Estimate | Cost breakdown | Quantities + cost from API |
| Report | PDF download | Triggers report job; downloads via asset URL |

Calls **only** `VITE_API_URL` (Nest). Never talks to MinIO, AI worker, or ComfyUI.

## Setup

```bash
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://localhost:5173`.

## Env

| Variable | Local | Ngrok share |
|----------|-------|-------------|
| `VITE_API_URL` | `http://localhost:3000/api/v1` | `/api/v1` (same-origin + Vite proxy) |
| `VITE_AI_USE_COMFY` | optional UI hint for AI apply | same |

See [`docs/TUNNELING.md`](../docs/TUNNELING.md).

## Scripts

- `pnpm dev` — Vite dev server (`host: true` for ngrok)
- `pnpm build` — production build
- `pnpm typecheck` — TypeScript
- `pnpm preview` — preview build
