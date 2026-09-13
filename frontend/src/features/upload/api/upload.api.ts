import { uploadFile } from '@/lib/api-client'
import type { UploadImageResponse } from '@/types/api'

export function uploadProjectImage(projectId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return uploadFile<UploadImageResponse>(
    `/projects/${projectId}/images`,
    formData,
  )
}
