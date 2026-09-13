# Share E2M over the internet with ngrok (free plan)

Keep Postgres, Redis, MinIO, the AI worker, and ComfyUI on `localhost`.

**Free ngrok allows one public URL.** E2M uses a single tunnel:

```text
Remote browser
  -> https://<your-ngrok-host>
  -> localhost:5173 (Vite)
       /api/* proxied to localhost:3000 (Nest)
```

Remote browsers never talk to MinIO or ComfyUI directly.

## Prerequisites

1. Local stack running (see root [README.md](../README.md)):
   - Docker: postgres, redis, minio
   - Backend on `:3000`
   - AI worker on `:8002`
   - Frontend on `:5173`
   - Optional: ComfyUI on `:8188`
2. ngrok installed and authenticated (`ngrok config add-authtoken <token>`)
3. Use a recent agent (**3.20+**). Your dashboard may show “update available”.

## Start the tunnel

1. **Stop** any existing ngrok session (especially ones forwarding to `:80`).
2. From the repo root:

```powershell
.\scripts\start-ngrok.ps1
```

This runs `ngrok http 5173`. Inspector: [http://127.0.0.1:4040](http://127.0.0.1:4040)

3. In a second terminal:

```powershell
.\scripts\apply-ngrok-env.ps1
```

This writes `.env.ngrok` and patches `backend/.env` + `frontend/.env`:

| Variable | Value |
|----------|--------|
| `CORS_ORIGIN` / `FRONTEND_URL` / `API_PUBLIC_URL` | `https://<ngrok-host>` |
| `VITE_API_URL` | `/api/v1` (same-origin; Vite proxies to Nest) |

4. **Restart Nest and Vite** so env changes load.
5. Open the **HTTPS ngrok URL** (not localhost). Click through the free-tier interstitial if shown.

## Why one tunnel

Dual tunnels (FE + API) need a paid ngrok plan or multiple agents. Vite’s `/api` proxy keeps the free plan working while asset URLs stay public via `API_PUBLIC_URL`.

## Local vs shared

| Mode | `VITE_API_URL` | `API_PUBLIC_URL` |
|------|----------------|------------------|
| Local only | `http://localhost:3000/api/v1` | `http://localhost:3000` |
| Ngrok share | `/api/v1` | `https://<ngrok-host>` |

## Notes

- Free URLs change when you restart ngrok — re-run `apply-ngrok-env.ps1`
- Do not commit `.env`, `.env.ngrok`, or tokens
- ComfyUI stays on your GPU machine
