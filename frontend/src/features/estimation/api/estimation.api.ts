import { apiClient } from '@/lib/api-client'
import type { CostEstimation, QuantityEstimation } from '@/types/api'

export function estimateQuantities(projectId: string) {
  return apiClient<QuantityEstimation[]>(
    `/projects/${projectId}/estimate-quantities`,
    { method: 'POST' },
  )
}

export function estimateCost(projectId: string) {
  return apiClient<CostEstimation>(
    `/projects/${projectId}/estimate-cost`,
    { method: 'POST' },
  )
}
