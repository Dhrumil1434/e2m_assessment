import { apiClient } from '@/lib/api-client'
import type { BuildingRegion, RegionStatus } from '@/types/api'

export function listRegions(projectId: string) {
  return apiClient<BuildingRegion[]>(`/projects/${projectId}/regions`)
}

export function updateRegion(
  regionId: string,
  data: {
    status?: RegionStatus
    label?: string
    polygonJson?: number[][]
    pixelArea?: number
  },
) {
  return apiClient<BuildingRegion>(`/regions/${regionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
