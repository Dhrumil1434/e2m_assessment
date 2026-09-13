import { apiClient } from '@/lib/api-client'
import type { AnalyzeResponse, Job } from '@/types/api'

export function analyzeImage(projectId: string, imageId: string) {
  return apiClient<AnalyzeResponse>(
    `/projects/${projectId}/images/${imageId}/analyze`,
    { method: 'POST' },
  )
}

export function getJob(jobId: string) {
  return apiClient<Job>(`/jobs/${jobId}`)
}
