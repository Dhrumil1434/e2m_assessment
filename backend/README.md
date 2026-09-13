# Backend (NestJS)

Orchestration API for E2M. Owns projects, uploads, job queues, regions/materials, measurement, cost estimation, PDF reports, and the MinIO **asset proxy**.

Full system picture: [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Stack

- NestJS 11, TypeScript
- Drizzle ORM + Postgres
- BullMQ + Redis
- MinIO (S3 SDK)
- Sharp, PDFKit, Axios (calls AI worker)

## Port

**3000** — Swagger at `/docs`, API under `/api/v1`.

## What this service implements

| Area | Responsibility |
|------|----------------|
| Projects / images | CRUD; store originals in MinIO |
| Analyze / jobs | Enqueue segmentation & render jobs; pollable job status |
| Regions / materials | Confirm surfaces; assign catalog variants; trigger previews |
| Measurement | Scale calibration; areas from masks |
| Estimation | Deterministic quantities + cost (not ML) |
| Reports | Generate PDF into MinIO `reports` |
| Assets | `GET /api/v1/assets/:bucket/:key` so browsers never hit MinIO directly |
| Health | `GET /api/v1/health` |

Queues typically include: `segmentation`, refine, `rendering` / design-composite, `inpaint-render`, `reports`.

Downstream: `AI_WORKER_URL` (default `http://localhost:8002`).

## Setup

From repo root, ensure Docker infra is up (`postgres`, `redis`, `minio`), then:

```bash
cd backend
npm install
cp ../.env.example .env   # or maintain backend/.env directly
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed-textures   # material texture PNGs in MinIO
npm run start:dev
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Watch mode |
| `npm run start:prod` | Production |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:seed` | Seed catalog / baseline data |
| `npm run db:seed-textures` | Upload texture assets |

## Env (high level)

See root [`.env.example`](../.env.example). Important keys: `DATABASE_URL`, Redis, MinIO buckets, `AI_WORKER_URL`, `CORS_ORIGIN`, `FRONTEND_URL`, `API_PUBLIC_URL`.

For ngrok share mode, `API_PUBLIC_URL` must be the public HTTPS host so asset links work for remote users ([`docs/TUNNELING.md`](../docs/TUNNELING.md)).
