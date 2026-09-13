# Share E2M over the internet with ngrok

Keep Postgres, Redis, MinIO, the AI worker, and ComfyUI on `localhost`. Only expose:

| Tunnel | Local port | Purpose |
|--------|------------|---------|
| Frontend | `5173` | Vite SPA for remote users |
| API | `3000` | NestJS API + `/api/v1/assets/...` proxy |

Remote browsers never talk to MinIO or ComfyUI directly.

## Prerequisites

1. Local stack running (see root [README.md](../README.md)):
   - Docker: postgres, redis, minio
   - Backend on `:3000`
   - AI worker on `:8002`
   - Frontend on `:5173`
   - Optional: ComfyUI on `:8188` for photorealistic Apply Material
2. [ngrok](https://ngrok.com/download) installed and authenticated:

```powershell
ngrok config add-authtoken <YOUR_TOKEN>
```

## Start tunnels

```powershell
# From repo root
.\scripts\start-ngrok.ps1
```

Leave that window open. Ngrok inspector: [http://127.0.0.1:4040](http://127.0.0.1:4040)

In a second terminal:

```powershell
.\scripts\apply-ngrok-env.ps1
```

This prints the two HTTPS URLs and writes `.env.ngrok` (gitignored).

## Wire environment

**Backend** (`backend/.env` and/or root `.env`):

```env
CORS_ORIGIN=https://<frontend-ngrok-host>
FRONTEND_URL=https://<frontend-ngrok-host>
API_PUBLIC_URL=https://<api-ngrok-host>
```

Keep internal services local:

```env
AI_WORKER_URL=http://localhost:8002
MINIO_ENDPOINT=localhost
REDIS_HOST=localhost
DATABASE_URL=postgresql://e2m:e2m@localhost:5432/e2m
```

**Frontend** (`frontend/.env`):

```env
VITE_API_URL=https://<api-ngrok-host>/api/v1
VITE_AI_USE_COMFY=true
```

Restart Nest and Vite after changing env (Vite bakes `VITE_*` at startup).

## Open the app

Use the **frontend** ngrok HTTPS URL (not localhost). Free-tier ngrok may show an interstitial page once — click through.

## Why these env vars matter

- `API_PUBLIC_URL` — asset URLs returned to the browser (`/api/v1/assets/...`) must be reachable remotely
- `CORS_ORIGIN` / `FRONTEND_URL` — allow the ngrok SPA origin to call the API
- `VITE_API_URL` — SPA must call the API tunnel, not `localhost:3000`

## Notes

- Free ngrok URLs change when you restart tunnels — re-run `apply-ngrok-env.ps1` and update env
- Do not commit `.env`, `.env.ngrok`, or real tokens
- ComfyUI stays on your GPU machine; remote users only wait for generation
