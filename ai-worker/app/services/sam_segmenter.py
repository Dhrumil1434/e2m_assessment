import base64
import os
from typing import List, Optional, Tuple

import cv2
import numpy as np

_predictor = None
_device = None


def is_sam2_enabled() -> bool:
    return os.getenv("AI_WORKER_USE_SAM2", "false").lower() == "true"


def refine_mask_from_box(
    image: np.ndarray,
    bbox: Tuple[int, int, int, int],
) -> Optional[np.ndarray]:
    if not is_sam2_enabled():
        return None

    try:
        predictor = _get_predictor()
        if predictor is None:
            return None

        x1, y1, x2, y2 = bbox
        box = np.array([x1, y1, x2, y2], dtype=np.float32)
        predictor.set_image(image)

        masks, scores, _ = predictor.predict(
            box=box[None, :],
            multimask_output=True,
        )

        if masks is None or len(masks) == 0:
            return None

        best_idx = int(np.argmax(scores))
        mask = (masks[best_idx].astype(np.uint8)) * 255
        return mask
    except Exception:
        return None


def refine_mask_from_point(
    image: np.ndarray,
    point: List[float],
    bbox: Optional[List[float]] = None,
) -> Optional[np.ndarray]:
    if not is_sam2_enabled():
        return None

    try:
        predictor = _get_predictor()
        if predictor is None:
            return None

        predictor.set_image(image)
        point_coords = np.array([[point[0], point[1]]], dtype=np.float32)
        point_labels = np.array([1], dtype=np.int32)
        box = None
        if bbox and len(bbox) == 4:
            box = np.array(bbox, dtype=np.float32)[None, :]

        masks, scores, _ = predictor.predict(
            point_coords=point_coords,
            point_labels=point_labels,
            box=box,
            multimask_output=True,
        )

        if masks is None or len(masks) == 0:
            return None

        best_idx = int(np.argmax(scores))
        return (masks[best_idx].astype(np.uint8)) * 255
    except Exception:
        return None


def mask_to_region_fields(
    mask: np.ndarray,
    region_type: str,
    label: str,
    confidence: float = 0.88,
) -> dict:
    height, width = mask.shape[:2]
    coords = cv2.findNonZero(mask)
    if coords is None:
        return {}

    x, y, w, h = cv2.boundingRect(coords)
    x1, y1, x2, y2 = x, y, x + w, y + h
    _, buffer = cv2.imencode(".png", mask)

    return {
        "type": region_type,
        "label": label,
        "maskBase64": base64.b64encode(buffer).decode("utf-8"),
        "polygon": [[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
        "bbox": [x1, y1, x2, y2],
        "pixelArea": int(np.count_nonzero(mask)),
        "confidence": confidence,
    }


def _get_predictor():
    global _predictor, _device

    if _predictor is not None:
        return _predictor

    try:
        import torch
        from sam2.build_sam import build_sam2
        from sam2.sam2_image_predictor import SAM2ImagePredictor
    except ImportError:
        return None

    checkpoint = os.getenv(
        "SAM2_CHECKPOINT",
        "checkpoints/sam2_hiera_tiny.pt",
    )
    config = os.getenv(
        "SAM2_CONFIG",
        "configs/sam2/sam2_hiera_t.yaml",
    )

    if not os.path.exists(checkpoint):
        return None

    _device = "cuda" if torch.cuda.is_available() else "cpu"
    sam2_model = build_sam2(config, checkpoint, device=_device)
    _predictor = SAM2ImagePredictor(sam2_model)
    return _predictor
