import { apiClient } from '@/lib/api-client'
import type { Project, ProjectSummary } from '@/types/api'

export function listProjects() {
  return apiClient<ProjectSummary[]>('/projects')
}

export function getProject(id: string) {
  return apiClient<Project>(`/projects/${id}`)
}

export function createProject(name?: string) {
  return apiClient<ProjectSummary>('/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function deleteProject(id: string) {
  return apiClient<{ deleted: boolean }>(`/projects/${id}`, {
    method: 'DELETE',
  })
}
