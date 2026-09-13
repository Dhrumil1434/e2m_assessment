import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Rect, Stage } from 'react-konva'
import type { BuildingRegion, MaterialVariant } from '@/types/api'
import { useStudioStore } from '../store/studio.store'
import { ImageLayer } from '../canvas/ImageLayer'
import { MaskLayer } from '../canvas/MaskLayer'
import { MaterialLayer } from '../canvas/MaterialLayer'
import { MeasurementLayer } from '../canvas/MeasurementLayer'
import { InteractionLayer } from '../canvas/InteractionLayer'
import { CompareSlider } from './CompareSlider'
import { GeneratingOverlay } from './GeneratingOverlay'

interface RenovationCanvasProps {
  imageUrl: string
  designUrl?: string | null
  finalDesignUrl?: string | null
  width: number
  height: number
  regions: BuildingRegion[]
  previewVariant: MaterialVariant | null
  isRendering?: boolean
  isEnhancing?: boolean
  generationMode?: 'ai' | 'opencv' | null
}

export function RenovationCanvas({
  imageUrl,
  designUrl,
  finalDesignUrl,
  width,
  height,
  regions,
  previewVariant,
  isRendering = false,
  isEnhancing = false,
  generationMode = null,
}: RenovationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 900, height: 600 })
  const [compareValue, setCompareValue] = useState(50)
  const {
    zoom,
    position,
    selectedSurfaceId,
    previewMode,
    mode,
    setPosition,
    selectSurface,
  } = useStudioStore()

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const fitScale = useMemo(
    () =>
      Math.min(containerSize.width / width, containerSize.height / height, 1),
    [containerSize.height, containerSize.width, height, width],
  )

  const displayScale = fitScale * zoom
  const scaledWidth = width * displayScale
  const scaledHeight = height * displayScale
  const offsetX = (containerSize.width - scaledWidth) / 2 + position.x
  const offsetY = (containerSize.height - scaledHeight) / 2 + position.y

  const useComfy = import.meta.env.VITE_AI_USE_COMFY === 'true'
  const activeDesignUrl = useComfy
    ? isRendering || isEnhancing
      ? designUrl ?? finalDesignUrl
      : finalDesignUrl ?? designUrl
    : designUrl ?? finalDesignUrl
  const hasDesign = Boolean(activeDesignUrl)
  const showDesignImage =
    previewMode === 'renovated' && hasDesign && mode !== 'compare'
  const displayUrl = showDesignImage ? activeDesignUrl! : imageUrl
  const showMaterialOverlay =
    previewMode === 'renovated' &&
    !isRendering &&
    !isEnhancing &&
    !hasDesign &&
    previewVariant !== null

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-[480px] w-full items-center justify-center overflow-hidden rounded border border-border bg-surface"
    >
      <Stage width={containerSize.width} height={containerSize.height}>
        <Layer>
          <Group
            x={offsetX}
            y={offsetY}
            scaleX={displayScale}
            scaleY={displayScale}
            draggable
            onDragEnd={(e) => {
              setPosition({
                x: e.target.x() - (containerSize.width - scaledWidth) / 2,
                y: e.target.y() - (containerSize.height - scaledHeight) / 2,
              })
            }}
          >
            {mode === 'compare' && hasDesign ? (
              <>
                <ImageLayer url={imageUrl} width={width} height={height} />
                <Group clipX={0} clipY={0} clipWidth={(width * compareValue) / 100} clipHeight={height}>
                  <ImageLayer url={activeDesignUrl!} width={width} height={height} />
                </Group>
                <Rect
                  x={(width * compareValue) / 100 - 1}
                  y={0}
                  width={2}
                  height={height}
                  fill="#ffffff"
                  opacity={0.8}
                  listening={false}
                />
              </>
            ) : (
              <ImageLayer url={displayUrl} width={width} height={height} />
            )}
            <MaskLayer
              regions={regions}
              selectedSurfaceId={selectedSurfaceId}
              showDesign={showDesignImage}
            />
            <MaterialLayer
              regions={regions}
              previewVariant={previewVariant}
              selectedSurfaceId={selectedSurfaceId}
              showOverlay={showMaterialOverlay}
            />
            <MeasurementLayer
              regions={regions}
              selectedSurfaceId={selectedSurfaceId}
              showMeasurements={mode === 'measure'}
            />
            <InteractionLayer regions={regions} onSelect={selectSurface} />
          </Group>
        </Layer>
      </Stage>

      {mode === 'compare' && hasDesign ? (
        <CompareSlider value={compareValue} onChange={setCompareValue} />
      ) : null}

      {isRendering ? (
        <GeneratingOverlay
          message={
            generationMode === 'ai'
              ? 'Generating renovation preview…'
              : 'Applying material to design…'
          }
          detail={
            generationMode === 'ai'
              ? 'OpenCV preview first, then AI inpainting when ComfyUI is ready.'
              : 'ComfyUI is off — using fast composite. Enable ComfyUI for photorealistic AI generation.'
          }
        />
      ) : null}

      {isEnhancing ? (
        <GeneratingOverlay
          message="AI regenerating surface…"
          detail="Stable Diffusion is reimagining the selected area while preserving the rest of the house."
        />
      ) : null}
    </div>
  )
}
