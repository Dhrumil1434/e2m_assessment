from fastapi import APIRouter
from pydantic import BaseModel

from app.services.quality import analyze_image_quality

router = APIRouter(prefix="/internal", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    imageUrl: str


@router.post("/analyze")
def analyze(request: AnalyzeRequest):
    return analyze_image_quality(request.imageUrl)
