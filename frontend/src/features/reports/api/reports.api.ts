import { apiClient } from '@/lib/api-client'
import type { JobEnqueueResponse } from '@/types/api'

export function generateReport(projectId: string) {
  return apiClient<JobEnqueueResponse>(`/projects/${projectId}/reports`, {
    method: 'POST',
  })
}

export function getReportDownload(projectId: string, reportId: string) {
  return apiClient<{ reportId: string; downloadUrl: string }>(
    `/projects/${projectId}/reports/${reportId}`,
  )
}
