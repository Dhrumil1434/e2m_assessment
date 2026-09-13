# E2M AI Worker

Python FastAPI service for image analysis, segmentation, material preview rendering, and optional ComfyUI inpainting.

Called **only by Nest** (`AI_WORKER_URL`). Not browser-facing. System overview: [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Requirements

- **Python 3.11 or 3.12 recommended**
- Python 3.14 may fail on `numpy`/`opencv` because prebuilt wheels are not always available yet

## Local setup

```powershell
cd ai-worker
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
.\start.ps1
```

The worker runs on **port 8002** by default (see `AI_WORKER_PORT` in `.env`). Point the backend at `AI_WORKER_URL=http://localhost:8002`.

## Render pipeline


| Stage           | Technology                   | Env flag                                   |
| --------------- | ---------------------------- | ------------------------------------------ |
| Instant preview | OpenCV masked composite      | always on when `AI_WORKER_STUB_MODE=false` |
| Segmentation    | Heuristic CV + optional SAM2 | `AI_WORKER_USE_SAM2=true`                  |
| Prompts         | LM Studio or templates       | `AI_WORKER_USE_LM_PROMPTS=true`            |
| Final render    | ComfyUI SD 1.5 inpaint       | `AI_WORKER_USE_COMFY=true`                 |


When ComfyUI or LM Studio are unavailable, the worker falls back to OpenCV compositing so Apply Material never silently fails.

## NVIDIA T1200 (~4GB VRAM) setup

This GPU is too small for SDXL/FLUX. Use:

1. **OpenCV preview** — CPU, instant
2. **ComfyUI** — SD 1.5 inpainting checkpoint, start with `--lowvram`
3. **SAM2 Hiera Tiny** — load only during segmentation, not alongside ComfyUI
4. **LM Studio** — lightweight instruct model for prompt generation (CPU/GPU)

```powershell
# ComfyUI (separate terminal)
cd path\to\ComfyUI
python main.py --port 8188 --lowvram

# LM Studio — load a small instruct model, enable local server on port 1234
```

Download `sd-v1-5-inpainting.ckpt` into ComfyUI's `models/checkpoints/` folder.

Set in `ai-worker/.env`:

```
AI_WORKER_STUB_MODE=false
AI_WORKER_USE_COMFY=true
AI_WORKER_USE_LM_PROMPTS=true
AI_WORKER_USE_SAM2=false
INPAINT_MAX_SIDE=768
COMFYUI_URL=http://localhost:8188
LM_STUDIO_URL=http://localhost:1234/v1
```



## SAM2 (optional)

```powershell
pip install -r requirements-ml.txt
pip install git+https://github.com/facebookresearch/sam2.git
```

Download `sam2_hiera_tiny.pt` from the SAM2 repo into `ai-worker/checkpoints/`.

Set `AI_WORKER_USE_SAM2=true`.

## Stub mode

Set `AI_WORKER_STUB_MODE=true` to return placeholder previews without OpenCV work (useful for CI).

## Docker

From the repo root:

```bash
docker compose -f infrastructure/docker-compose.yml up -d ai-worker
```

Ensure root `.env` has `AI_WORKER_STUB_MODE=false` for real rendering inside Docker.

## API endpoints


| Endpoint                          | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `POST /internal/segment`          | Surface detection                         |
| `POST /internal/composite-design` | Fast OpenCV material composite            |
| `POST /internal/inpaint`          | ComfyUI inpainting (with OpenCV fallback) |
| `POST /internal/render`           | Single-region preview                     |




## Troubleshooting

If `pip install` fails with a NumPy/Meson/compiler error on Windows:

1. Use Python 3.11 or 3.12 instead of 3.14
2. Or run via Docker
3. Or install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the C++ workload

If Apply Material shows flat color blocks:

1. Confirm `AI_WORKER_STUB_MODE=false`
2. Restart backend so it picks up `AI_WORKER_URL=http://localhost:8002`
3. Re-analyze the image for fresh masks
4. Run `npm run db:seed-textures` in backend for texture PNGs

