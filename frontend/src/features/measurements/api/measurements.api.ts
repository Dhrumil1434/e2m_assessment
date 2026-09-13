import { apiClient } from '@/lib/api-client'
import type {
  EstimateAreasResponse,
  MeasurementReference,
} from '@/types/api'

export function createMeasurement(
  projectId: string,
  data: {
    regionId: string
    referenceWidthFt: number
    referenceWidthPx: number
  },
) {
  return apiClient<MeasurementReference>(
    `/projects/${projectId}/measurements`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
}

export function estimateAreas(projectId: string) {
  return apiClient<EstimateAreasResponse>(
    `/projects/${projectId}/estimate-areas`,
    { method: 'POST' },
  )
}

export function autoMeasure(projectId: string) {
  return apiClient<
    EstimateAreasResponse & {
      calibrationMethod?: string
      referenceLabel?: string
      reference?: MeasurementReference
    }
  >(`/projects/${projectId}/auto-measure`, { method: 'POST' })
}
