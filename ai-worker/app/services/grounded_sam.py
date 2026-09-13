import base64
import os
from typing import List, Optional, Tuple

import cv2
import httpx
import numpy as np

from app.services import sam_segmenter

LABEL_TO_TYPE = {
    "building wall": "wall",
    "window": "window",
    "door": "door",
    "balcony": "balcony",
    "pillar": "pillar",
    "gate": "gate",
    "railing": "railing",
    "roof": "roof",
}

# Region templates as fractions of the detected building bounding box
# (label_key, display_label, x, y, w, h)
BUILDING_REGIONS: List[Tuple[str, str, Tuple[float, float, float, float]]] = [
    ("roof", "Roof", (0.02, 0.05, 0.96, 0.19)),
    ("building wall", "Stone Wall", (0.00, 0.22, 0.21, 0.74)),
    ("building wall", "Main Facade", (0.19, 0.26, 0.50, 0.62)),
    ("building wall", "Wood Accent", (0.20, 0.30, 0.11, 0.22)),
    ("window", "Upper Window", (0.52, 0.32, 0.16, 0.18)),
    ("window", "Balcony Door", (0.52, 0.38, 0.14, 0.14)),
    ("door", "Front Door", (0.36, 0.54, 0.10, 0.24)),
    ("balcony", "Upper Balcony", (0.51, 0.28, 0.38, 0.18)),
    ("railing", "Glass Railing", (0.51, 0.44, 0.38, 0.05)),
    ("pillar", "Stone Pillar", (0.82, 0.42, 0.07, 0.42)),
    ("gate", "Carport", (0.52, 0.62, 0.35, 0.26)),
]


def segment_image(image_url: str, labels: List[str]) -> dict:
    image = _load_image(image_url)
    height, width = image.shape[:2]

    if os.getenv("AI_WORKER_USE_SAM", "false").lower() == "true":
        return {"regions": _grid_fallback(width, height, labels)}

    building_bbox = _detect_building_bbox(image)
    regions = _regions_from_building(image, building_bbox, labels)
    regions = _refine_with_edges(image, regions)

    return {"regions": regions}


def refine_region(
    image_url: str,
    point: Optional[List[float]] = None,
    bbox: Optional[List[float]] = None,
) -> dict:
    image = _load_image(image_url)
    height, width = image.shape[:2]

    if point and sam_segmenter.is_sam2_enabled():
        mask = sam_segmenter.refine_mask_from_point(image, point, bbox)
        if mask is not None:
            region = sam_segmenter.mask_to_region_fields(
                mask,
                "wall",
                "Refined Surface",
            )
            if region:
                return {"regions": [region]}

    if bbox and len(bbox) == 4 and sam_segmenter.is_sam2_enabled():
        box = (int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3]))
        mask = sam_segmenter.refine_mask_from_box(image, box)
        if mask is not None:
            region = sam_segmenter.mask_to_region_fields(
                mask,
                "wall",
                "Refined Surface",
            )
            if region:
                return {"regions": [region]}

    building_bbox = _detect_building_bbox(image)
    return {"regions": _regions_from_building(image, building_bbox, ["building wall"])}


def _detect_building_bbox(image: np.ndarray) -> Tuple[int, int, int, int]:
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 40, 120)

    roi_top = int(height * 0.06)
    roi_bottom = int(height * 0.90)
    roi_left = int(width * 0.01)
    roi_right = int(width * 0.99)

    roi = np.zeros_like(edges)
    roi[roi_top:roi_bottom, roi_left:roi_right] = edges[
        roi_top:roi_bottom, roi_left:roi_right
    ]

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    closed = cv2.morphologyEx(roi, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return (int(width * 0.02), int(height * 0.05), int(width * 0.98), int(height * 0.88))

    largest = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest)

    pad_x = int(w * 0.02)
    pad_y = int(h * 0.02)
    x1 = max(0, x - pad_x)
    y1 = max(roi_top, y - pad_y)
    x2 = min(width - 1, x + w + pad_x)
    y2 = min(roi_bottom, y + h + pad_y)

    if (x2 - x1) < width * 0.25 or (y2 - y1) < height * 0.25:
        return (int(width * 0.02), int(height * 0.05), int(width * 0.98), int(height * 0.88))

    roofline_y = _find_roofline(edges, roi_left, roi_right, max(y1 - 20, roi_top), y2)
    y1 = max(roi_top, min(y1, roofline_y))

    return (x1, y1, x2, y2)


def _find_roofline(
    edges: np.ndarray,
    left: int,
    right: int,
    top: int,
    bottom: int,
) -> int:
    """Find the first strong horizontal edge band below the sky (roof edge)."""
    scan_height = min(int((bottom - top) * 0.35), bottom - top)
    if scan_height <= 0:
        return top

    best_y = top
    best_score = 0.0
    span = max(right - left, 1)

    for offset in range(scan_height):
        y = top + offset
        row = edges[y, left:right]
        density = float(np.count_nonzero(row)) / span
        if density > best_score:
            best_score = density
            best_y = y

    if best_score < 0.04:
        return top

    return best_y


def _regions_from_building(
    image: np.ndarray,
    building_bbox: Tuple[int, int, int, int],
    labels: Optional[List[str]] = None,
) -> List[dict]:
    height, width = image.shape[:2]
    bx1, by1, bx2, by2 = building_bbox
    bw = max(bx2 - bx1, 1)
    bh = max(by2 - by1, 1)
    label_set = set(labels or [])
    regions = []

    for label_key, display_label, (rx, ry, rw, rh) in BUILDING_REGIONS:
        if labels and label_key not in label_set:
            continue

        x1 = int(bx1 + rx * bw)
        y1 = int(by1 + ry * bh)
        x2 = int(min(bx1 + (rx + rw) * bw, width - 1))
        y2 = int(min(by1 + (ry + rh) * bh, height - 1))

        if x2 <= x1 or y2 <= y1:
            continue

        region_type = LABEL_TO_TYPE.get(label_key, "wall")
        bbox = (x1, y1, x2, y2)

        sam_mask = sam_segmenter.refine_mask_from_box(image, bbox)
        if sam_mask is not None:
            region = sam_segmenter.mask_to_region_fields(
                sam_mask,
                region_type,
                display_label,
            )
            if region:
                regions.append(region)
                continue

        mask = np.zeros((height, width), dtype=np.uint8)
        mask[y1:y2, x1:x2] = 255
        _, buffer = cv2.imencode(".png", mask)

        regions.append(
            _build_region(region_type, display_label, x1, y1, x2, y2, buffer)
        )

    return regions


def _refine_with_edges(image: np.ndarray, regions: List[dict]) -> List[dict]:
    """Snap window/door boxes toward dark rectangular features in the facade."""
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    refined = []
    for region in regions:
        label = region["label"]
        x1, y1, x2, y2 = region["bbox"]

        if label not in {"Upper Window", "Balcony Door", "Front Door"}:
            refined.append(region)
            continue

        pad_x = int((x2 - x1) * 0.15)
        pad_y = int((y2 - y1) * 0.15)
        rx1 = max(0, x1 - pad_x)
        ry1 = max(0, y1 - pad_y)
        rx2 = min(width, x2 + pad_x)
        ry2 = min(height, y2 + pad_y)

        roi = gray[ry1:ry2, rx1:rx2]
        if roi.size == 0:
            refined.append(region)
            continue

        _, dark = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, kernel, iterations=1)

        contours, _ = cv2.findContours(dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            refined.append(region)
            continue

        best = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(best)
        roi_area = roi.shape[0] * roi.shape[1]
        if area < roi_area * 0.05:
            refined.append(region)
            continue

        cx, cy, cw, ch = cv2.boundingRect(best)
        nx1 = rx1 + cx
        ny1 = ry1 + cy
        nx2 = rx1 + cx + cw
        ny2 = ry1 + cy + ch

        mask = np.zeros((height, width), dtype=np.uint8)
        mask[ny1:ny2, nx1:nx2] = 255
        _, buffer = cv2.imencode(".png", mask)

        refined.append(
            _build_region(
                region["type"],
                label,
                nx1,
                ny1,
                nx2,
                ny2,
                buffer,
            )
        )

    return refined


def _grid_fallback(width: int, height: int, labels: List[str]) -> List[dict]:
    """Legacy grid used only when AI_WORKER_USE_SAM is enabled without a real model."""
    regions = []
    for index, label in enumerate(labels):
        region_type = LABEL_TO_TYPE.get(label, "wall")
        x1 = int(width * 0.1 + (index % 3) * 0.25 * width)
        y1 = int(height * 0.15 + (index // 3) * 0.2 * height)
        x2 = min(x1 + int(width * 0.2), width - 1)
        y2 = min(y1 + int(height * 0.18), height - 1)

        mask = np.zeros((height, width), dtype=np.uint8)
        mask[y1:y2, x1:x2] = 255
        _, buffer = cv2.imencode(".png", mask)

        regions.append(_build_region(region_type, label, x1, y1, x2, y2, buffer))

    return regions


def _build_region(
    region_type: str,
    label: str,
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    mask_buffer,
) -> dict:
    return {
        "type": region_type,
        "label": label,
        "maskBase64": base64.b64encode(mask_buffer).decode("utf-8"),
        "polygon": [
            [x1, y1],
            [x2, y1],
            [x2, y2],
            [x1, y2],
        ],
        "bbox": [x1, y1, x2, y2],
        "pixelArea": int(max(x2 - x1, 0) * max(y2 - y1, 0)),
        "confidence": 0.82,
    }


def _load_image(url: str) -> np.ndarray:
    response = httpx.get(url, timeout=30)
    response.raise_for_status()
    data = np.frombuffer(response.content, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode image")
    return image
