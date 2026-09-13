import { useEffect, useMemo, useState } from 'react'
import { Group, Image as KonvaImage, Line } from 'react-konva'
import type { BuildingRegion } from '@/types/api'
import type { MaterialVariant } from '@/types/api'

interface MaterialLayerProps {
  regions: BuildingRegion[]
  previewVariant: MaterialVariant | null
  selectedSurfaceId: string | null
  showOverlay: boolean
}

function regionBounds(region: BuildingRegion) {
  if (region.bboxJson && region.bboxJson.length === 4) {
    const [x1, y1, x2, y2] = region.bboxJson
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
  }

  if (!region.polygonJson?.length) {
    return null
  }

  const xs = region.polygonJson.map(([x]) => x)
  const ys = region.polygonJson.map(([, y]) => y)
  const x1 = Math.min(...xs)
  const y1 = Math.min(...ys)
  const x2 = Math.max(...xs)
  const y2 = Math.max(...ys)
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

function TexturePreview({
  region,
  previewVariant,
}: {
  region: BuildingRegion
  previewVariant: MaterialVariant
}) {
  const [texture, setTexture] = useState<HTMLImageElement | null>(null)
  const bounds = useMemo(() => regionBounds(region), [region])

  useEffect(() => {
    if (!previewVariant.textureUrl) {
      setTexture(null)
      return
    }

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = previewVariant.textureUrl
    img.onload = () => setTexture(img)
    img.onerror = () => setTexture(null)

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [previewVariant.textureUrl])

  if (!region.polygonJson?.length || !bounds) return null

  const flat = region.polygonJson.flat()

  if (texture) {
    return (
      <Group
        clipFunc={(ctx) => {
          ctx.beginPath()
          ctx.moveTo(flat[0], flat[1])
          for (let i = 2; i < flat.length; i += 2) {
            ctx.lineTo(flat[i], flat[i + 1])
          }
          ctx.closePath()
        }}
      >
        <KonvaImage
          image={texture}
          x={bounds.x}
          y={bounds.y}
          width={Math.max(bounds.width, 1)}
          height={Math.max(bounds.height, 1)}
          opacity={0.82}
          listening={false}
        />
      </Group>
    )
  }

  return (
    <Line
      points={flat}
      closed
      fill={previewVariant.colorHex ?? 'rgba(250,250,250,0.35)'}
      opacity={0.5}
      listening={false}
    />
  )
}

export function MaterialLayer({
  regions,
  previewVariant,
  selectedSurfaceId,
  showOverlay,
}: MaterialLayerProps) {
  if (!showOverlay || !previewVariant) return null

  return (
    <>
      {regions.map((region) => {
        if (region.id !== selectedSurfaceId) return null

        return (
          <TexturePreview
            key={`material-${region.id}`}
            region={region}
            previewVariant={previewVariant}
          />
        )
      })}
    </>
  )
}
