import os

from fastapi import APIRouter

from app.services.comfy_client import is_comfy_enabled, is_comfy_reachable
from app.services import sam_segmenter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    """Keep health non-blocking so re-analyze is never starved by inpaint."""
    return {
        "status": "ok",
        "stubMode": os.getenv("AI_WORKER_STUB_MODE", "true").lower() == "true",
        "comfyEnabled": is_comfy_enabled(),
        "comfyReachable": is_comfy_reachable(),
        "sam2Enabled": sam_segmenter.is_sam2_enabled(),
        "lmPromptsEnabled": os.getenv("AI_WORKER_USE_LM_PROMPTS", "false").lower()
        == "true",
    }
