# Infrastructure

Docker Compose dependencies for local E2M development.

Architecture overview: [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Services

| Compose service | Image / build | Host ports | Purpose |
|-----------------|---------------|------------|---------|
| `postgres` | postgres:16 | 5432 | App database |
| `redis` | redis:7 | 6379 | BullMQ queues for Nest |
| `minio` | minio/minio | 9000 (API), 9001 (console) | Object storage |
| `api` | `backend/` Dockerfile | 3000 | Optional containerized Nest |
| `ai-worker` | `ai-worker/` Dockerfile | **8000** | Optional containerized worker |

Day-to-day MVP: run **postgres / redis / minio** in Docker; run Nest, Vite, and AI worker on the host. Nest then uses `AI_WORKER_URL=http://localhost:8002`.

If you start Compose `ai-worker` instead, point Nest at `http://localhost:8000` (mapped port).

## Start data plane

From repo root:

```bash
docker compose -f infrastructure/docker-compose.yml up -d postgres redis minio
```

MinIO console: `http://localhost:9001` (default `minioadmin` / `minioadmin`).

Buckets used by the app: `originals`, `masks`, `textures`, `previews`, `reports` (created/used by backend seed and storage code).

## Optional full stack in Docker

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

Still run the frontend with Vite on the host (or serve a built SPA separately). ComfyUI is **not** in Compose — keep it on the GPU machine.
