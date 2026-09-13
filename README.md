# E2M House Renovation AI

Monorepo for the house renovation MVP:

- `backend/` — NestJS API (Drizzle ORM, BullMQ, MinIO, deterministic estimation)
- `frontend/` — React web app (Vite, TanStack Query, React-Konva renovation studio)
- `ai-worker/` — Python FastAPI worker (Grounded SAM stub + OpenCV rendering)
- `infrastructure/` — Docker Compose for local development

## Quick start

1. Copy environment file:

```bash
cp .env.example .env
```

2. Start infrastructure:

```bash
docker compose -f infrastructure/docker-compose.yml up -d postgres redis minio
```

3. Backend setup:

```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

4. AI worker (Python 3.11/3.12 recommended):

```bash
cd ai-worker
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

If local pip fails on Windows (common with Python 3.14), use Docker instead:

```bash
docker compose -f infrastructure/docker-compose.yml up -d ai-worker
```

See [`ai-worker/README.md`](ai-worker/README.md) for troubleshooting.

5. Frontend (requires backend running):

```bash
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://localhost:5173`. See [`frontend/README.md`](frontend/README.md).

## Share via ngrok

To let others use your local stack (including ComfyUI on your NVIDIA GPU) over HTTPS:

1. Start infra, backend, ai-worker, frontend (and ComfyUI if needed)
2. Run `.\scripts\start-ngrok.ps1` then `.\scripts\apply-ngrok-env.ps1`
3. Copy the printed URLs into `backend/.env` / `frontend/.env` and restart Nest + Vite

Full guide: [`docs/TUNNELING.md`](docs/TUNNELING.md).

## API docs

- Swagger: `http://localhost:3000/docs`
- Health: `GET /api/v1/health`

## MVP flow

1. `POST /api/v1/projects`
2. `POST /api/v1/projects/:id/images`
3. `POST /api/v1/projects/:id/images/:imageId/analyze`
4. `GET /api/v1/jobs/:id`
5. `PATCH /api/v1/regions/:id` (confirm regions)
6. `POST /api/v1/regions/:id/materials`
7. `POST /api/v1/regions/:id/preview`
8. `POST /api/v1/projects/:id/measurements`
9. `POST /api/v1/projects/:id/estimate-areas`
10. `POST /api/v1/projects/:id/estimate-quantities`
11. `POST /api/v1/projects/:id/estimate-cost`
12. `POST /api/v1/projects/:id/reports`
