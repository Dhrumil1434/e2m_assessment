import json
import os
from typing import TypedDict

import httpx


class PromptInput(TypedDict, total=False):
    surfaceLabel: str
    materialName: str
    colorHex: str
    finish: str
    style: str


class PromptResult(TypedDict):
    prompt: str
    negative_prompt: str


DEFAULT_NEGATIVE = (
    "changed architecture, moved windows, new doors, distorted building, "
    "unrealistic geometry, blurry, low quality, oversaturated, cartoon"
)


def build_inpaint_prompt(payload: PromptInput) -> PromptResult:
    if os.getenv("AI_WORKER_USE_LM_PROMPTS", "false").lower() == "true":
        try:
            return _build_with_lm_studio(payload)
        except Exception:
            pass

    return _build_template_prompt(payload)


def _build_template_prompt(payload: PromptInput) -> PromptResult:
    surface = payload.get("surfaceLabel") or "selected surface"
    material = payload.get("materialName") or "renovation material"
    color = payload.get("colorHex") or ""
    finish = payload.get("finish") or "matte"
    style = payload.get("style") or "modern luxury residential"

    color_clause = f" in {color}" if color else ""
    prompt = (
        f"Photorealistic architectural photo of the same residential house. "
        f"Replace ONLY the {surface} with {material}{color_clause}, "
        f"{finish} finish, {style} style. "
        f"Keep identical building geometry, camera angle, perspective, lighting, "
        f"shadows, sky, and all unchanged surfaces exactly as in the original photo."
    )

    return {"prompt": prompt, "negative_prompt": DEFAULT_NEGATIVE}


def _build_with_lm_studio(payload: PromptInput) -> PromptResult:
    base_url = os.getenv("LM_STUDIO_URL", "http://localhost:1234/v1").rstrip("/")
    model = os.getenv("LM_STUDIO_MODEL", "local-model")

    system = (
        "You generate controlled inpainting prompts for architectural renovation. "
        "Return ONLY valid JSON with keys prompt and negative_prompt."
    )
    user = json.dumps(payload)

    response = httpx.post(
        f"{base_url}/chat/completions",
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
            "max_tokens": 512,
        },
        timeout=30,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]

    parsed = json.loads(_extract_json(content))
    prompt = parsed.get("prompt", "")
    negative = parsed.get("negative_prompt", DEFAULT_NEGATIVE)

    if not prompt:
        return _build_template_prompt(payload)

    return {"prompt": prompt, "negative_prompt": negative}


def _extract_json(content: str) -> str:
    start = content.find("{")
    end = content.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object in LM Studio response")
    return content[start : end + 1]
