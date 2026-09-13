import { Line } from 'react-konva'
import type { BuildingRegion } from '@/types/api'

interface MeasurementLayerProps {
  regions: BuildingRegion[]
  selectedSurfaceId: string | null
  showMeasurements: boolean
}

export function MeasurementLayer({
  regions,
  selectedSurfaceId,
  showMeasurements,
}: MeasurementLayerProps) {
  if (!showMeasurements) return null

  return (
    <>
      {regions.map((region) => {
        if (!region.bboxJson || region.bboxJson.length < 4) return null
        const [x1, y1, x2, y2] = region.bboxJson
        const isSelected = region.id === selectedSurfaceId

        return (
          <Line
            key={`measure-${region.id}`}
            points={[x1, y1, x2, y1, x2, y2, x1, y2]}
            closed
            stroke={isSelected ? '#fafafa' : '#525252'}
            strokeWidth={1}
            dash={[6, 4]}
            listening={false}
          />
        )
      })}
    </>
  )
}
