from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.grounded_sam import refine_region, segment_image

router = APIRouter(prefix="/internal", tags=["segment"])


class SegmentRequest(BaseModel):
    imageUrl: str
    labels: List[str]


class RefineRequest(BaseModel):
    imageUrl: str
    point: Optional[List[float]] = None
    bbox: Optional[List[float]] = None


@router.post("/segment")
def segment(request: SegmentRequest):
    return segment_image(request.imageUrl, request.labels)


@router.post("/refine")
def refine(request: RefineRequest):
    return refine_region(request.imageUrl, request.point, request.bbox)
