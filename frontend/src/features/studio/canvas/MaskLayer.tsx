import { Line } from 'react-konva'
import type { BuildingRegion } from '@/types/api'

interface MaskLayerProps {
  regions: BuildingRegion[]
  selectedSurfaceId: string | null
  showDesign?: boolean
}

export function MaskLayer({
  regions,
  selectedSurfaceId,
  showDesign = false,
}: MaskLayerProps) {
  return (
    <>
      {regions.map((region) => {
        if (!region.polygonJson?.length) return null
        const flat = region.polygonJson.flat()
        const isSelected = region.id === selectedSurfaceId

        return (
          <Line
            key={region.id}
            points={flat}
            closed
            fill={
              showDesign
                ? undefined
                : isSelected
                  ? 'rgba(250, 250, 250, 0.12)'
                  : 'rgba(163, 163, 163, 0.06)'
            }
            stroke={isSelected ? '#fafafa' : '#737373'}
            strokeWidth={isSelected ? 2 : 1}
            listening={false}
          />
        )
      })}
    </>
  )
}
