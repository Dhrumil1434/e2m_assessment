# E2M House Renovation AI

Monorepo MVP: upload a house photo → detect surfaces → apply materials → measure → estimate cost → PDF report.

**How the stack fits together:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [all docs](docs/README.md)

Browsers only talk to the frontend (and Nest via `/api`). MinIO, the AI worker, and ComfyUI stay on localhost.

## What’s in each package

| Package | Port | Implements |
|---------|------|------------|
| [`frontend/`](frontend/README.md) | 5173 | Workflow UI + Konva renovation studio |
| [`backend/`](backend/README.md) | 3000 | Nest API, queues, estimation, PDF, asset proxy |
| [`ai-worker/`](ai-worker/README.md) | **8002** (local) | Segmentation, OpenCV composite, optional ComfyUI inpaint |
| [`infrastructure/`](infrastructure/README.md) | 5432 / 6379 / 9000 | Postgres, Redis, MinIO (Docker) |
| ComfyUI (external) | 8188 | Optional GPU photoreal Apply Material |

## Tech stack summaries

### Frontend (`frontend/`)

| Used for | Technology |
|----------|------------|
| App shell & build | React 19, TypeScript, Vite 8 |
| Routing | React Router |
| Server data (API) | TanStack Query + Axios |
| Canvas / selection UI state | Zustand |
| Renovation studio canvas | React-Konva / Konva |
| Styling & UI primitives | Tailwind CSS v4, Radix, Lucide, Motion |
| Forms / validation | React Hook Form, Zod |

**Implements:** projects, upload, analyze polling, design studio (masks + materials), measure, estimate, report download. Proxies `/api` → Nest when sharing via ngrok.

### Backend (`backend/`)

| Used for | Technology |
|----------|------------|
| HTTP API | NestJS 11, Swagger |
| Validation / config | class-validator, `@nestjs/config` |
| Database | PostgreSQL + Drizzle ORM |
| Async jobs | BullMQ + Redis (ioredis) |
| Object storage | MinIO via AWS S3 SDK |
| Image helpers | Sharp |
| PDF reports | PDFKit |
| AI worker calls | Axios |
| Rate limiting | Nest Throttler |

**Implements:** projects/images, job enqueue + status, regions/materials, measurement math, deterministic cost estimation, PDF generation, MinIO asset proxy for the browser.

### AI worker (`ai-worker/`)

| Used for | Technology |
|----------|------------|
| Internal HTTP API | FastAPI + Uvicorn |
| Instant material previews | OpenCV + NumPy + Pillow |
| Optional segmentation | SAM2 (flag-gated) |
| Optional photoreal apply | ComfyUI SD 1.5 inpaint (HTTP client) |
| Optional prompts | LM Studio (local OpenAI-compatible API) |

**Implements:** `/internal/segment`, composite-design, render, inpaint (with OpenCV fallback). Stub mode for CI. Not called from the browser.

### Infrastructure (`infrastructure/`)

| Used for | Technology |
|----------|------------|
| Relational data | PostgreSQL 16 |
| Job queues | Redis 7 |
| Files / images / PDFs | MinIO (S3-compatible) |
| Optional containers | Docker Compose (`api`, `ai-worker`) |

### Sharing & GPU helpers (`scripts/`, docs)

| Used for | Technology |
|----------|------------|
| Public demo URL | ngrok → Vite `:5173` (Nest via Vite `/api` proxy) |
| Photoreal Apply Material | ComfyUI on `:8188` (`scripts/start-comfyui.ps1`) |

## Quick start

1. Copy environment file:

```bash
cp .env.example .env
```

Also keep a matching `backend/.env` (Nest loads from its cwd). Frontend: `frontend/.env` from `frontend/.env.example`.

2. Start infrastructure:

```bash
docker compose -f infrastructure/docker-compose.yml up -d postgres redis minio
```

3. Backend:

```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed-textures
npm run start:dev
```

4. AI worker (Python **3.11/3.12** recommended) — port **8002**:

```bash
cd ai-worker
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
.\start.ps1
```

If local pip fails on Windows (common with Python 3.14), use Docker:

```bash
docker compose -f infrastructure/docker-compose.yml up -d ai-worker
```

Then set Nest `AI_WORKER_URL=http://localhost:8000` (Compose host port). See [`ai-worker/README.md`](ai-worker/README.md).

5. Frontend:

```bash
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://localhost:5173`.

Optional GPU renders: start ComfyUI on `:8188` (`scripts/start-comfyui.ps1`) with `AI_WORKER_USE_COMFY=true`.

## Share via ngrok

Free ngrok = **one** public URL. Tunnel Vite (`:5173`); Nest is reached through Vite’s `/api` proxy.

```powershell
.\scripts\start-ngrok.ps1
.\scripts\apply-ngrok-env.ps1
# Restart Nest + Vite, open the printed HTTPS URL
```

Details: [`docs/TUNNELING.md`](docs/TUNNELING.md).

## API

- Swagger: `http://localhost:3000/docs`
- Health: `GET /api/v1/health`

## Product flow

1. Create project → upload facade image  
2. Analyze (segmentation → regions + masks)  
3. Design studio (confirm regions, materials, OpenCV / AI apply)  
4. Measure areas → estimate quantities & cost  
5. Generate and download PDF report  

API sequence and module detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
