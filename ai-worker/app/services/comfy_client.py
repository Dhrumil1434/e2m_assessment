import base64
import json
import logging
import os
import time
import uuid
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

import cv2
import httpx
import numpy as np

from app.services.prompt_builder import PromptResult
from app.services.texture_mapper import (
    DesignRegionInput,
    _feather_mask,
    composite_design_image,
    _load_image,
)

WORKFLOW_PATH = Path(__file__).resolve().parents[2] / "workflows" / "sd15_inpaint_material.json"


def is_comfy_enabled() -> bool:
    return os.getenv("AI_WORKER_USE_COMFY", "false").lower() == "true"


_comfy_reachable_cache: tuple[float, bool] | None = None


def is_comfy_reachable() -> bool:
    if not is_comfy_enabled():
        return False

    global _comfy_reachable_cache
    now = time.time()
    if _comfy_reachable_cache and now - _comfy_reachable_cache[0] < 5:
        return _comfy_reachable_cache[1]

    comfy_url = os.getenv("COMFYUI_URL", "http://localhost:8188").rstrip("/")
    reachable = False
    try:
        response = httpx.get(f"{comfy_url}/system_stats", timeout=0.75)
        reachable = response.status_code == 200
    except Exception:
        reachable = False

    _comfy_reachable_cache = (now, reachable)
    return reachable


def inpaint_region(
    image_url: str,
    mask_url: str,
    texture_url: Optional[str],
    prompts: PromptResult,
    base_image_url: Optional[str] = None,
    regions: Optional[List[DesignRegionInput]] = None,
) -> dict:
    base = _resolve_base_image(image_url, base_image_url, regions)
    resolved_texture = texture_url or "fallback/#C2B280.png"

    if not is_comfy_reachable():
        return _opencv_full_render(image_url, regions, mask_url, resolved_texture)

    comfy_url = os.getenv("COMFYUI_URL", "http://localhost:8188").rstrip("/")

    try:
        image_bytes = _run_comfy_workflow(
            comfy_url,
            base,
            mask_url,
            prompts["prompt"],
            prompts["negative_prompt"],
        )
        inpainted = _decode_image_bytes(image_bytes)
        merged = _merge_inpaint_at_full_res(base, inpainted, mask_url)
        return {"previewBase64": _encode_b64(merged), "generationMode": "ai"}
    except Exception as exc:
        logger.warning("ComfyUI inpaint failed, using OpenCV fallback: %s", exc)
        return _opencv_full_render(image_url, regions, mask_url, resolved_texture)


def _resolve_base_image(
    image_url: str,
    base_image_url: Optional[str],
    regions: Optional[List[DesignRegionInput]],
) -> np.ndarray:
    if base_image_url:
        return _load_image(base_image_url)

    if regions:
        result = composite_design_image(
            image_url,
            regions,
            full_rebuild=True,
        )
        return _decode_base64(result["previewBase64"])

    return _load_image(image_url)


def _opencv_full_render(
    image_url: str,
    regions: Optional[List[DesignRegionInput]],
    mask_url: str,
    texture_url: str,
) -> dict:
    if regions:
        result = composite_design_image(
            image_url,
            regions,
            full_rebuild=True,
        )
    else:
        result = composite_design_image(
            image_url,
            [{"maskUrl": mask_url, "textureUrl": texture_url}],
            full_rebuild=True,
        )

    result["generationMode"] = "opencv"
    return result


def _merge_inpaint_at_full_res(
    base: np.ndarray,
    inpainted: np.ndarray,
    mask_url: str,
) -> np.ndarray:
    height, width = base.shape[:2]

    if inpainted.shape[:2] != (height, width):
        inpainted = cv2.resize(
            inpainted,
            (width, height),
            interpolation=cv2.INTER_LANCZOS4,
        )

    mask = _load_mask_from_url(mask_url, (height, width))
    mask = _feather_mask(mask, kernel_size=11)
    alpha = (mask.astype(np.float32) / 255.0)[:, :, np.newaxis]

    base_f = base.astype(np.float32)
    inpaint_f = inpainted.astype(np.float32)
    blended = base_f * (1.0 - alpha) + inpaint_f * alpha
    return np.clip(blended, 0, 255).astype(np.uint8)


def _run_comfy_workflow(
    comfy_url: str,
    base_image: np.ndarray,
    mask_url: str,
    prompt: str,
    negative_prompt: str,
) -> bytes:
    workflow = _load_workflow_template()
    init_bytes, mask_bytes = _prepare_inpaint_images(base_image, mask_url)
    suffix = uuid.uuid4().hex[:8]
    init_name = _upload_image_to_comfy(
        comfy_url, init_bytes, f"e2m_init_{suffix}.png"
    )
    mask_name = _upload_image_to_comfy(
        comfy_url, mask_bytes, f"e2m_mask_{suffix}.png"
    )

    workflow = _inject_workflow_inputs(
        workflow,
        init_name,
        mask_name,
        prompt,
        negative_prompt,
    )

    queued = httpx.post(
        f"{comfy_url}/prompt",
        json={"prompt": workflow, "client_id": str(uuid.uuid4())},
        timeout=30,
    )
    queued.raise_for_status()
    prompt_id = queued.json()["prompt_id"]
    return _poll_comfy_output(comfy_url, prompt_id)


def _prepare_inpaint_images(base_image: np.ndarray, mask_url: str) -> tuple[bytes, bytes]:
    init = base_image.copy()
    height, width = init.shape[:2]
    mask = _load_mask_from_url(mask_url, (height, width))
    max_side = int(os.getenv("INPAINT_MAX_SIDE", "768"))

    scale = min(1.0, max_side / max(height, width))
    if scale < 1.0:
        new_w = int(width * scale)
        new_h = int(height * scale)
        init = cv2.resize(init, (new_w, new_h), interpolation=cv2.INTER_AREA)
        mask = cv2.resize(mask, (new_w, new_h), interpolation=cv2.INTER_NEAREST)

    mask_rgb = cv2.merge([mask, mask, mask])
    ok_init, init_buffer = cv2.imencode(".png", init)
    ok_mask, mask_buffer = cv2.imencode(".png", mask_rgb)
    if not ok_init or not ok_mask:
        raise ValueError("Unable to encode inpaint images")
    return init_buffer.tobytes(), mask_buffer.tobytes()


def _upload_image_to_comfy(comfy_url: str, image_bytes: bytes, filename: str) -> str:
    response = httpx.post(
        f"{comfy_url}/upload/image",
        files={"image": (filename, image_bytes, "image/png")},
        data={"overwrite": "true", "type": "input"},
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    name = payload.get("name")
    if not name:
        raise ValueError("ComfyUI upload returned no filename")

    subfolder = payload.get("subfolder", "")
    image_type = payload.get("type", "input")
    _verify_comfy_upload(comfy_url, name, subfolder, image_type)
    return name


def _verify_comfy_upload(
    comfy_url: str,
    filename: str,
    subfolder: str,
    image_type: str,
) -> None:
    view = httpx.get(
        f"{comfy_url}/view",
        params={
            "filename": filename,
            "subfolder": subfolder,
            "type": image_type,
        },
        timeout=30,
    )
    view.raise_for_status()
    if not view.content:
        raise ValueError(f"ComfyUI uploaded image is empty: {filename}")


def _load_mask_from_url(url: str, shape: tuple[int, int]) -> np.ndarray:
    if url.startswith("fallback/"):
        mask = np.zeros(shape, dtype=np.uint8)
        mask[
            int(shape[0] * 0.2) : int(shape[0] * 0.8),
            int(shape[1] * 0.2) : int(shape[1] * 0.8),
        ] = 255
        return mask

    response = httpx.get(url, timeout=30)
    response.raise_for_status()
    data = np.frombuffer(response.content, dtype=np.uint8)
    mask = cv2.imdecode(data, cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise ValueError("Unable to decode mask")
    if mask.shape[:2] != shape:
        mask = cv2.resize(mask, (shape[1], shape[0]), interpolation=cv2.INTER_NEAREST)
    return mask


def _decode_image_bytes(content: bytes) -> np.ndarray:
    data = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode inpainted image")
    return image


def _decode_base64(value: str) -> np.ndarray:
    data = base64.b64decode(value)
    return _decode_image_bytes(data)


def _encode_b64(image: np.ndarray) -> str:
    ok, buffer = cv2.imencode(".png", image)
    if not ok:
        raise ValueError("Unable to encode image")
    return base64.b64encode(buffer).decode("utf-8")


def _load_workflow_template() -> dict:
    if WORKFLOW_PATH.exists():
        return json.loads(WORKFLOW_PATH.read_text(encoding="utf-8"))
    return _default_workflow()


def _default_workflow() -> dict:
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": 42,
                "steps": 20,
                "cfg": 7.0,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 0.75,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["11", 0],
            },
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": "sd-v1-5-inpainting.ckpt"},
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": "__PROMPT__", "clip": ["4", 1]},
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": "__NEGATIVE__", "clip": ["4", 1]},
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "e2m_inpaint", "images": ["8", 0]},
        },
        "10": {"class_type": "LoadImage", "inputs": {"image": "__INIT__"}},
        "11": {
            "class_type": "VAEEncodeForInpaint",
            "inputs": {
                "pixels": ["10", 0],
                "vae": ["4", 2],
                "mask": ["12", 0],
                "grow_mask_by": 6,
            },
        },
        "12": {
            "class_type": "LoadImageMask",
            "inputs": {"image": "__MASK__", "channel": "red"},
        },
    }


def _inject_workflow_inputs(
    workflow: dict,
    init_filename: str,
    mask_filename: str,
    prompt: str,
    negative_prompt: str,
) -> dict:
    payload = json.loads(json.dumps(workflow))

    if "6" in payload:
        payload["6"].setdefault("inputs", {})["text"] = prompt
    if "7" in payload:
        payload["7"].setdefault("inputs", {})["text"] = negative_prompt
    if "10" in payload:
        payload["10"].setdefault("inputs", {})["image"] = init_filename
    if "12" in payload:
        payload["12"].setdefault("inputs", {})["image"] = mask_filename

    for node in payload.values():
        if not isinstance(node, dict):
            continue
        inputs = node.get("inputs", {})
        if inputs.get("text") in ("__PROMPT__", "__NEGATIVE__"):
            raise ValueError("Workflow prompt placeholders were not replaced")
        if inputs.get("image") in ("__INIT__", "__MASK__"):
            raise ValueError("Workflow image placeholders were not replaced")

    return payload


def _poll_comfy_output(
    comfy_url: str,
    prompt_id: str,
    timeout_s: int | None = None,
) -> bytes:
    if timeout_s is None:
        timeout_s = int(os.getenv("COMFY_INPAINT_TIMEOUT_S", "360"))
    deadline = time.time() + timeout_s

    while time.time() < deadline:
        history = httpx.get(f"{comfy_url}/history/{prompt_id}", timeout=15)
        history.raise_for_status()
        payload = history.json()

        if prompt_id not in payload:
            time.sleep(2)
            continue

        outputs = payload[prompt_id].get("outputs", {})
        for node_output in outputs.values():
            images = node_output.get("images", [])
            if not images:
                continue
            image_meta = images[0]
            view = httpx.get(
                f"{comfy_url}/view",
                params={
                    "filename": image_meta["filename"],
                    "subfolder": image_meta.get("subfolder", ""),
                    "type": image_meta.get("type", "output"),
                },
                timeout=30,
            )
            view.raise_for_status()
            return view.content

        time.sleep(2)

    raise TimeoutError("ComfyUI inpaint timed out")
