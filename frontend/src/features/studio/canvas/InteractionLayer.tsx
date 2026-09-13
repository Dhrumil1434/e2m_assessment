import { Line } from 'react-konva'
import type { BuildingRegion } from '@/types/api'

interface InteractionLayerProps {
  regions: BuildingRegion[]
  onSelect: (regionId: string) => void
}

export function InteractionLayer({ regions, onSelect }: InteractionLayerProps) {
  return (
    <>
      {regions.map((region) => {
        if (!region.polygonJson?.length) return null

        return (
          <Line
            key={`interaction-${region.id}`}
            points={region.polygonJson.flat()}
            closed
            fill="rgba(0,0,0,0.001)"
            onClick={() => onSelect(region.id)}
            onTap={() => onSelect(region.id)}
          />
        )
      })}
    </>
  )
}
