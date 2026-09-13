import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
} from '../api/projects.api'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name?: string) => createProject(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
