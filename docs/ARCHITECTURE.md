# E2M architecture

E2M is a local-first MVP for exterior house renovation: upload a facade photo, detect surfaces, apply materials, measure areas, estimate cost, and export a PDF report.

Browsers talk only to the **frontend** (and, under ngrok, the same public URL). The **backend** owns data, queues, and storage URLs. The **AI worker** and **ComfyUI** stay on the machine; they are never exposed publicly.

## Service map

```text
Browser
  └─ Frontend (Vite)           :5173
       └─ Backend (NestJS)     :3000   /api/v1/*
            ├─ Postgres        :5432   projects, regions, estimates, …
            ├─ Redis           :6379   BullMQ job queues
            ├─ MinIO           :9000   originals, masks, textures, previews, reports
            │     browser reads via Nest asset proxy:
            │     {API_PUBLIC_URL}/api/v1/assets/{bucket}/{key}
            └─ AI worker       :8002   (Docker often maps :8000)
                  ├─ OpenCV / optional SAM2
                  └─ ComfyUI   :8188   optional SD 1.5 inpaint (external folder)
```

| Service | Path | Port | Role |
|---------|------|------|------|
| Frontend | `frontend/` | 5173 | UI + Renovation Studio canvas; proxies `/api` → Nest |
| Backend | `backend/` | 3000 | API, auth-less orchestration, estimation math, PDF jobs, MinIO proxy |
| AI worker | `ai-worker/` | **8002** local | Segmentation, OpenCV composite, optional Comfy inpaint |
| Postgres | Docker | 5432 | Durable app data (Drizzle schema) |
| Redis | Docker | 6379 | Async jobs (segment, render, report, …) |
| MinIO | Docker | 9000 / console 9001 | Object storage for images and PDFs |
| ComfyUI | external (`ComfyUI/`) | 8188 | Photoreal Apply Material (optional GPU) |
| Scripts | `scripts/` | — | ComfyUI start, ngrok tunnel + env patch |

**Local default:** `AI_WORKER_URL=http://localhost:8002`.  
**Docker Compose `ai-worker` service:** host port **8000** → container 8000 — set Nest’s `AI_WORKER_URL` to match how you run the worker.

## What each layer implements

### Frontend (`frontend/`)

| Feature | What it does |
|---------|----------------|
| Projects | Create / list renovation projects |
| Upload | Multipart image upload; quality gate before analyze |
| Analyze | Starts segmentation job; polls job status; continues to studio |
| Design (Studio) | React-Konva canvas: regions, masks, material assign, preview / rebuild / AI apply |
| Measure | Auto-measure (door / facade calibration) or manual; surface areas in ft² |
| Estimate | Quantities + deterministic cost from measurements and material catalog |
| Report | Request PDF generation; download via API asset URL |

State split: **Zustand** for canvas / selection; **TanStack Query** for API data. Never call MinIO, the AI worker, or ComfyUI from the browser.

### Backend (`backend/`)

| Module | What it implements |
|--------|--------------------|
| Projects / upload | Project CRUD, image storage to MinIO `originals` |
| Jobs | BullMQ processors: segmentation, refine, rendering, design-composite, inpaint-render, reports |
| Regions / materials | Confirm regions, assign catalog variants, trigger previews |
| Measurement | Scale (ft/px), areas from masks + calibration |
| Estimation | Material quantities and cost (Nest-side math, not AI) |
| Reports | PDFKit report → MinIO `reports` |
| Storage | MinIO client + **asset proxy** so browsers use Nest URLs |
| Health | `GET /api/v1/health` |

Swagger: `http://localhost:3000/docs`.

### AI worker (`ai-worker/`)

Internal FastAPI only (Nest → worker). See [`ai-worker/README.md`](../ai-worker/README.md).

| Concern | Implementation |
|---------|----------------|
| Instant material preview | OpenCV masked texture composite |
| Segmentation | Heuristic CV; optional SAM2 (`AI_WORKER_USE_SAM2`) |
| Photoreal apply | ComfyUI SD 1.5 inpaint (`AI_WORKER_USE_COMFY`); OpenCV fallback if Comfy down |
| Prompt assist | Optional LM Studio (`AI_WORKER_USE_LM_PROMPTS`) |
| CI / no GPU | `AI_WORKER_STUB_MODE=true` placeholder responses |

### Infrastructure (`infrastructure/`)

Docker Compose for **postgres**, **redis**, **minio**, and optional containerized **api** + **ai-worker**. Day-to-day MVP usually runs Nest / Vite / worker on the host against Docker data services.

### ComfyUI (external)

Not in this monorepo. Started with `scripts/start-comfyui.ps1` (or manually on `:8188`). Only the AI worker calls it (`COMFYUI_URL`). Checkpoint: `sd-v1-5-inpainting.ckpt` under ComfyUI `models/checkpoints/`.

## End-to-end product flow

```text
Upload → Analyze → Design → Measure → Estimate → Report
```

1. **Upload** — `POST /api/v1/projects/:id/images` → MinIO `originals`.
2. **Analyze** — Nest enqueues segmentation → worker `/internal/segment` → regions + masks in DB / MinIO `masks`.
3. **Design** — Confirm regions; assign materials; preview via OpenCV composite and/or Comfy inpaint; rebuild full facade design image.
4. **Measure** — Auto or manual calibration → areas per surface.
5. **Estimate** — Quantities then cost from catalog rates + measured areas.
6. **Report** — Async PDF with project summary, design, quantities, cost → download link.

## Env ownership

| File | Used by |
|------|---------|
| Root `.env` / `.env.example` | Shared / Compose / Nest when copied into `backend/.env` |
| `backend/.env` | Nest `ConfigModule` (cwd) |
| `frontend/.env` | Vite (`VITE_API_URL`, `VITE_AI_USE_COMFY`) |
| `ai-worker/.env` | Worker flags and ports |
| `.env.ngrok` | Written by `apply-ngrok-env.ps1` (gitignored); patches backend + frontend for share mode |

Sharing over the internet: [`TUNNELING.md`](./TUNNELING.md).

## Related docs

- [Root README](../README.md) — quick start
- [Tunneling / ngrok](./TUNNELING.md)
- [Backend](../backend/README.md)
- [Frontend](../frontend/README.md)
- [AI worker](../ai-worker/README.md)
- [Infrastructure](../infrastructure/README.md)
