import os

import cv2
import httpx
import numpy as np


def analyze_image_quality(image_url: str) -> dict:
    if os.getenv("AI_WORKER_STUB_MODE", "true").lower() == "true":
        return {
            "blurScore": 150.0,
            "width": 1920,
            "height": 1080,
            "passed": True,
        }

    image = _load_image(image_url)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    height, width = gray.shape
    passed = blur_score >= 100 and max(width, height) >= 1024

    return {
        "blurScore": float(blur_score),
        "width": int(width),
        "height": int(height),
        "passed": passed,
    }


def _load_image(url: str) -> np.ndarray:
    response = httpx.get(url, timeout=30)
    response.raise_for_status()
    data = np.frombuffer(response.content, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode image")
    return image
