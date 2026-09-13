import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from '@/lib/constants'
import { useProject } from '@/features/projects/hooks/use-projects'
import { uploadProjectImage } from '../api/upload.api'

export function UploadPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: project, isLoading } = useProject(projectId)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = (selected: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(selected.type)) {
      return 'Please upload JPG, JPEG, PNG, or WEBP images only.'
    }
    if (selected.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return `Image must be under ${MAX_IMAGE_SIZE_MB}MB.`
    }
    return null
  }

  const handleFile = useCallback((selected: File) => {
    const validationError = validateFile(selected)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setFile(selected)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(selected)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  const handleUpload = async () => {
    if (!file || !projectId) return
    setUploading(true)
    setError(null)
    try {
      const result = await uploadProjectImage(projectId, file)
      if (!result.quality.passed) {
        toast.warning('Image quality is low. Analysis may be less accurate.')
      }
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      navigate(`/projects/${projectId}/analyze`, {
        state: { imageId: result.imageId, runId: crypto.randomUUID() },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (isLoading) return <LoadingState />
  if (!project) return <ErrorState message="Project not found" />

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Upload House Image"
        description={`Project: ${project.name ?? 'Untitled Project'}`}
      />

      {!preview ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded border border-dashed border-border bg-surface px-8 py-16 text-center transition-colors hover:border-muted"
        >
          <ImagePlus className="mb-4 size-12 text-subtle" strokeWidth={1.5} />
          <p className="text-lg font-medium">Drop your house image here</p>
          <p className="mt-2 text-sm text-muted">
            JPG, JPEG, PNG, WEBP — max {MAX_IMAGE_SIZE_MB}MB
          </p>
          <label className="mt-6">
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0]
                if (selected) handleFile(selected)
              }}
            />
            <Button asChild variant="outline">
              <span>Select Image</span>
            </Button>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded border border-border">
            <img src={preview} alt="Preview" className="max-h-[480px] w-full object-contain" />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={() => {
                setFile(null)
                setPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev)
                  return null
                })
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null)
                setPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev)
                  return null
                })
              }}
            >
              Replace
            </Button>
            <Button onClick={() => void handleUpload()} disabled={uploading}>
              <Upload className="mr-2 size-4" />
              {uploading ? 'Uploading...' : 'Continue to Analysis'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
