from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.comfy_client import inpaint_region
from app.services.prompt_builder import PromptInput, build_inpaint_prompt
from app.services.texture_mapper import (
    DesignRegionInput,
    composite_design_image,
    render_material_preview,
)

router = APIRouter(prefix="/internal", tags=["render"])


class RenderRequest(BaseModel):
    imageUrl: str
    maskUrl: str
    textureUrl: str


class DesignRegionRequest(BaseModel):
    maskUrl: str
    textureUrl: str
    regionId: Optional[str] = None
    label: Optional[str] = None
    materialName: Optional[str] = None
    colorHex: Optional[str] = None


class CompositeDesignRequest(BaseModel):
    imageUrl: str
    regions: List[DesignRegionRequest]
    baseImageUrl: Optional[str] = None
    targetRegionId: Optional[str] = None
    fullRebuild: Optional[bool] = False


class InpaintRequest(BaseModel):
    imageUrl: str
    maskUrl: str
    textureUrl: Optional[str] = None
    baseImageUrl: Optional[str] = None
    regions: Optional[List[DesignRegionRequest]] = None
    regionLabel: Optional[str] = None
    materialName: Optional[str] = None
    colorHex: Optional[str] = None
    finish: Optional[str] = None
    style: Optional[str] = None
    prompt: Optional[str] = None
    negativePrompt: Optional[str] = None


@router.post("/render")
def render(request: RenderRequest):
    return render_material_preview(
        request.imageUrl, request.maskUrl, request.textureUrl
    )


@router.post("/composite-design")
def composite_design(request: CompositeDesignRequest):
    regions: List[DesignRegionInput] = [
        {
            "maskUrl": region.maskUrl,
            "textureUrl": region.textureUrl,
            **({"regionId": region.regionId} if region.regionId else {}),
            **({"label": region.label} if region.label else {}),
            **({"materialName": region.materialName} if region.materialName else {}),
            **({"colorHex": region.colorHex} if region.colorHex else {}),
        }
        for region in request.regions
    ]
    return composite_design_image(
        request.imageUrl,
        regions,
        base_image_url=request.baseImageUrl,
        target_region_id=request.targetRegionId,
        full_rebuild=bool(request.fullRebuild),
    )


@router.post("/inpaint")
def inpaint(request: InpaintRequest):
    if request.prompt and request.negativePrompt:
        prompts = {
            "prompt": request.prompt,
            "negative_prompt": request.negativePrompt,
        }
    else:
        payload: PromptInput = {
            "surfaceLabel": request.regionLabel or "selected surface",
            "materialName": request.materialName or "renovation material",
            "colorHex": request.colorHex or "",
            "finish": request.finish or "matte",
            "style": request.style or "modern luxury residential",
        }
        prompts = build_inpaint_prompt(payload)

    regions: List[DesignRegionInput] | None = None
    if request.regions:
        regions = [
            {
                "maskUrl": region.maskUrl,
                "textureUrl": region.textureUrl,
                **({"regionId": region.regionId} if region.regionId else {}),
                **({"label": region.label} if region.label else {}),
                **({"materialName": region.materialName} if region.materialName else {}),
                **({"colorHex": region.colorHex} if region.colorHex else {}),
            }
            for region in request.regions
        ]

    return inpaint_region(
        request.imageUrl,
        request.maskUrl,
        request.textureUrl,
        prompts,
        base_image_url=request.baseImageUrl,
        regions=regions,
    )
