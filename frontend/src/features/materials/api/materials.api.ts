import { apiClient } from '@/lib/api-client'
import type { GenerationMode, JobEnqueueResponse, Material } from '@/types/api'

export function listMaterials() {
  return apiClient<Material[]>('/materials')
}

export function assignMaterial(regionId: string, materialVariantId: string) {
  return apiClient(`/regions/${regionId}/materials`, {
    method: 'POST',
    body: JSON.stringify({ materialVariantId }),
  })
}

export function clearMaterial(regionId: string) {
  return apiClient(`/regions/${regionId}/materials`, {
    method: 'DELETE',
  })
}

export function requestPreview(regionId: string) {
  return apiClient<
    JobEnqueueResponse & { finalJobId?: string | null; generationMode?: GenerationMode }
  >(
    `/regions/${regionId}/preview`,
    {
      method: 'POST',
    },
  )
}

export function rebuildDesign(imageId: string) {
  return apiClient<JobEnqueueResponse>(`/images/${imageId}/rebuild-design`, {
    method: 'POST',
  })
}
