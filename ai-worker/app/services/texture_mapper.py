import base64
import os
from typing import List, NotRequired, TypedDict

import cv2
import httpx
import numpy as np


class DesignRegionInput(TypedDict):
    maskUrl: str
    textureUrl: str
    regionId: NotRequired[str]
    label: NotRequired[str]
    materialName: NotRequired[str]
    colorHex: NotRequired[str]


def render_material_preview(image_url: str, mask_url: str, texture_url: str) -> dict:
    if os.getenv("AI_WORKER_STUB_MODE", "true").lower() == "true":
        return {"previewBase64": _stub_preview_base64()}

    original = _load_image(image_url)
    composite = _apply_region_material(original, mask_url, texture_url)
    _, buffer = cv2.imencode(".png", composite)
    return {"previewBase64": base64.b64encode(buffer).decode("utf-8")}


def composite_design_image(
    image_url: str,
    regions: List[DesignRegionInput],
    base_image_url: str | None = None,
    target_region_id: str | None = None,
    full_rebuild: bool = False,
) -> dict:
    if os.getenv("AI_WORKER_STUB_MODE", "true").lower() == "true":
        return {"previewBase64": _stub_preview_base64()}

    if full_rebuild or not base_image_url:
        composite = _load_image(image_url)
    else:
        composite = _load_image(base_image_url)

    height, width = composite.shape[:2]

    regions_to_apply = regions
    if target_region_id and not full_rebuild:
        regions_to_apply = [
            region for region in regions if region.get("regionId") == target_region_id
        ] or regions

    for region in regions_to_apply:
        composite = _apply_region_material(
            composite,
            region["maskUrl"],
            region["textureUrl"],
            height=height,
            width=width,
        )

    _, buffer = cv2.imencode(".png", composite)
    return {"previewBase64": base64.b64encode(buffer).decode("utf-8")}


def _apply_region_material(
    original: np.ndarray,
    mask_url: str,
    texture_url: str,
    height: int | None = None,
    width: int | None = None,
) -> np.ndarray:
    height = height or original.shape[0]
    width = width or original.shape[1]
    mask = _load_mask(mask_url, (height, width))
    mask = _feather_mask(mask)

    bbox = _mask_bounding_box(mask)
    if bbox is None:
        return original

    x1, y1, x2, y2 = bbox
    region_w = max(x2 - x1, 1)
    region_h = max(y2 - y1, 1)

    texture_tile = _load_texture_tile(texture_url, region_w, region_h)
    texture_full = np.zeros_like(original)
    texture_full[y1:y2, x1:x2] = texture_tile

    return _alpha_composite_material(original, texture_full, mask)


def _feather_mask(mask: np.ndarray, kernel_size: int = 7) -> np.ndarray:
    k = kernel_size if kernel_size % 2 == 1 else kernel_size + 1
    blurred = cv2.GaussianBlur(mask, (k, k), 0)
    return blurred


def _mask_bounding_box(mask: np.ndarray) -> tuple[int, int, int, int] | None:
    coords = cv2.findNonZero(mask)
    if coords is None:
        return None
    x, y, w, h = cv2.boundingRect(coords)
    return (x, y, x + w, y + h)


def _alpha_composite_material(
    original: np.ndarray,
    textured: np.ndarray,
    mask: np.ndarray,
) -> np.ndarray:
    """Blend material into masked area while preserving original shading."""
    alpha = (mask.astype(np.float32) / 255.0)[:, :, np.newaxis]
    strength = 0.86

    gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    luminance = cv2.merge([gray, gray, gray])

    orig_f = original.astype(np.float32)
    tex_f = textured.astype(np.float32)
    material = tex_f * 0.72 + luminance * tex_f * 0.28

    return np.clip(
        orig_f * (1.0 - alpha * strength) + material * (alpha * strength),
        0,
        255,
    ).astype(np.uint8)


def _load_texture_tile(texture_url: str, width: int, height: int) -> np.ndarray:
    tile_source = _load_texture_source(texture_url)
    tile_h, tile_w = tile_source.shape[:2]

    if tile_w >= width and tile_h >= height:
        start_x = max(0, (tile_w - width) // 2)
        start_y = max(0, (tile_h - height) // 2)
        return tile_source[start_y : start_y + height, start_x : start_x + width]

    reps_y = int(np.ceil(height / tile_h))
    reps_x = int(np.ceil(width / tile_w))
    tiled = np.tile(tile_source, (reps_y, reps_x, 1))
    return tiled[:height, :width]


def _load_texture_source(url: str) -> np.ndarray:
    if url.startswith("fallback/"):
        color = url.split("/")[-1].replace(".png", "")
        hex_color = color if color.startswith("#") else "#C2B280"
        return _procedural_texture(hex_color, 256, 256)

    response = httpx.get(url, timeout=30)
    response.raise_for_status()
    data = np.frombuffer(response.content, dtype=np.uint8)
    texture = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if texture is None:
        raise ValueError("Unable to decode texture")
    return texture


def _stub_preview_base64() -> str:
    image = np.full((480, 640, 3), (180, 170, 150), dtype=np.uint8)
    cv2.putText(
        image,
        "Material Preview",
        (140, 240),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (40, 40, 40),
        2,
    )
    _, buffer = cv2.imencode(".png", image)
    return base64.b64encode(buffer).decode("utf-8")


def _load_image(url: str) -> np.ndarray:
    response = httpx.get(url, timeout=30)
    response.raise_for_status()
    data = np.frombuffer(response.content, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode image")
    return image


def _load_mask(url: str, shape: tuple[int, int]) -> np.ndarray:
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
        mask = cv2.resize(mask, (shape[1], shape[0]))
    return mask


def _procedural_texture(hex_color: str, width: int, height: int) -> np.ndarray:
    bgr = _hex_to_bgr(hex_color)
    base = np.full((height, width, 3), bgr, dtype=np.uint8)

    noise = np.random.default_rng(42).integers(0, 32, (height, width), dtype=np.uint8)
    noise_bgr = cv2.merge([noise, noise, noise])
    textured = cv2.add(base, noise_bgr)

    tile_size = max(24, min(width, height) // 20)
    for y in range(0, height, tile_size):
        for x in range(0, width, tile_size):
            shade = 8 if ((x // tile_size) + (y // tile_size)) % 2 == 0 else -8
            y2 = min(y + tile_size, height)
            x2 = min(x + tile_size, width)
            patch = textured[y:y2, x:x2].astype(np.int16) + shade
            textured[y:y2, x:x2] = np.clip(patch, 0, 255).astype(np.uint8)

    return textured


def _hex_to_bgr(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (b, g, r)
