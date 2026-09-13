import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { getJob } from '@/features/analyze/api/analyze.api'
import { useProject } from '@/features/projects/hooks/use-projects'
import { listRegions, updateRegion } from '@/features/regions/api/regions.api'
import {
  assignMaterial,
  clearMaterial,
  listMaterials,
  rebuildDesign,
  requestPreview,
} from '@/features/materials/api/materials.api'
import type { GenerationMode } from '@/types/api'
import { waitForRenderJob } from '../hooks/useRenderJob'
import { useStudioStore } from '../store/studio.store'
import { RenovationCanvas } from './RenovationCanvas'
import { SurfaceSidebar } from './SurfaceSidebar'
import { MaterialSidebar } from './MaterialSidebar'
import { StudioToolbar } from './StudioToolbar'

export function StudioPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as {
    imageId?: string
    reanalyzed?: boolean
  } | null
  const queryClient = useQueryClient()
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: allRegions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ['regions', projectId],
    queryFn: () => listRegions(projectId!),
    enabled: Boolean(projectId),
  })

  const activeImageId = useMemo(() => {
    const images = project?.images ?? []
    if (!images.length) return undefined

    if (
      locationState?.imageId &&
      images.some((image) => image.id === locationState.imageId)
    ) {
      return locationState.imageId
    }

    const latestImage = [...images].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0]

    const latestWithRegions = [...images]
      .filter((image) =>
        allRegions.some((region) => region.projectImageId === image.id),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0]

    return latestWithRegions?.id ?? latestImage.id
  }, [allRegions, locationState?.imageId, project?.images])

  const regions = useMemo(
    () =>
      activeImageId
        ? allRegions.filter((region) => region.projectImageId === activeImageId)
        : allRegions,
    [activeImageId, allRegions],
  )
  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: listMaterials,
  })
  const [isRendering, setIsRendering] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isHistoryBusy, setIsHistoryBusy] = useState(false)
  const [designVersion, setDesignVersion] = useState(0)
  const [generationMode, setGenerationMode] = useState<GenerationMode | null>(
    null,
  )

  const {
    selectedSurfaceId,
    previewMaterialId,
    recordApply,
    setPreviewMode,
    selectSurface,
    resetHistory,
    undo,
    redo,
  } = useStudioStore()

  useEffect(() => {
    if (!locationState?.reanalyzed) return

    selectSurface(null)
    setPreviewMode('renovated')
    resetHistory()
    setDesignVersion((version) => version + 1)
    navigate(location.pathname, { replace: true, state: { imageId: activeImageId } })
  }, [
    activeImageId,
    location.pathname,
    locationState?.reanalyzed,
    navigate,
    resetHistory,
    selectSurface,
    setPreviewMode,
  ])

  useEffect(() => {
    if (!selectedSurfaceId) return
    if (regions.some((region) => region.id === selectedSurfaceId)) return
    selectSurface(null)
  }, [regions, selectSurface, selectedSurfaceId])

  const image = useMemo(() => {
    if (!project?.images?.length) return undefined
    if (activeImageId) {
      return project.images.find((img) => img.id === activeImageId)
    }
    return project.images[project.images.length - 1]
  }, [activeImageId, project?.images])

  const previewVariant = useMemo(() => {
    if (!previewMaterialId) return null
    for (const material of materials) {
      const variant = material.variants.find((v) => v.id === previewMaterialId)
      if (variant) return variant
    }
    return null
  }, [materials, previewMaterialId])

  const refreshDesign = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['regions', projectId] })
    await queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    setDesignVersion((version) => version + 1)
  }, [projectId, queryClient])

  const runRebuild = useCallback(
    async (imageId: string) => {
      const result = await rebuildDesign(imageId)
      if (result.jobId) {
        await waitForRenderJob(result.jobId, getJob)
      }
      await refreshDesign()
      setPreviewMode('renovated')
    },
    [refreshDesign, setPreviewMode],
  )

  const applyAssignment = useCallback(
    async (regionId: string, variantId: string | null) => {
      if (!activeImageId) return

      if (variantId) {
        await assignMaterial(regionId, variantId)
      } else {
        await clearMaterial(regionId)
      }

      await runRebuild(activeImageId)
    },
    [activeImageId, runRebuild],
  )

  const confirmMutation = useMutation({
    mutationFn: (regionId: string) =>
      updateRegion(regionId, { status: 'confirmed' }),
    onSuccess: () => {
      toast.success('Surface confirmed')
      void queryClient.invalidateQueries({ queryKey: ['regions', projectId] })
    },
  })

  const assignMutation = useMutation({
    mutationFn: async (variantId: string) => {
      if (!selectedSurfaceId || !activeImageId) return

      const region = regions.find((entry) => entry.id === selectedSurfaceId)
      const previousVariantId =
        region?.assignment?.materialVariantId ?? null

      setIsRendering(true)
      setIsEnhancing(false)
      setGenerationMode(null)
      recordApply(selectedSurfaceId, variantId, previousVariantId)
      await assignMaterial(selectedSurfaceId, variantId)

      const preview = await requestPreview(selectedSurfaceId)
      const mode = preview.generationMode ?? 'opencv'
      setGenerationMode(mode)

      if (preview.finalJobId) {
        await waitForRenderJob(preview.jobId, getJob)
        await refreshDesign()
        setPreviewMode('renovated')
        setIsRendering(false)

        setIsEnhancing(true)
        try {
          await waitForRenderJob(preview.finalJobId, getJob, 3000, 420_000)
          await refreshDesign()
          toast.success('AI renovation generated')
        } catch {
          toast.message('Fast preview applied; AI generation unavailable')
        } finally {
          setIsEnhancing(false)
        }
        return
      }

      await waitForRenderJob(preview.jobId, getJob, 2000, 120_000)
      await refreshDesign()
      setPreviewMode('renovated')
      setIsRendering(false)
      toast.success('Design updated — enable ComfyUI for photorealistic AI')
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to apply material',
      )
    },
    onSettled: () => {
      setIsRendering(false)
    },
  })

  const handleUndo = useCallback(async () => {
    const entry = undo()
    if (!entry || !activeImageId) return

    setIsHistoryBusy(true)
    try {
      await applyAssignment(entry.regionId, entry.previousVariantId)
      toast.success('Undo applied')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Undo failed')
    } finally {
      setIsHistoryBusy(false)
    }
  }, [activeImageId, applyAssignment, undo])

  const handleRedo = useCallback(async () => {
    const entry = redo()
    if (!entry || !activeImageId) return

    setIsHistoryBusy(true)
    try {
      await applyAssignment(entry.regionId, entry.nextVariantId)
      toast.success('Redo applied')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Redo failed')
    } finally {
      setIsHistoryBusy(false)
    }
  }, [activeImageId, applyAssignment, redo])

  if (projectLoading || regionsLoading) return <LoadingState />
  if (!project || !image?.originalUrl) {
    return <ErrorState message="Upload and analyze an image before opening the studio." />
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="Renovation Studio"
        description={`${project.name ?? 'Untitled Project'} · ${regions.length} detected surfaces`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (image?.id) {
                  navigate(`/projects/${projectId}/analyze`, {
                    state: {
                      imageId: image.id,
                      reanalyze: true,
                      runId: crypto.randomUUID(),
                    },
                  })
                }
              }}
            >
              <RefreshCw className="mr-2 size-4" />
              Re-analyze
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/projects/${projectId}/measurement`)}
            >
              Continue to Measure
            </Button>
          </div>
        }
      />
      <div className="relative flex flex-1 overflow-hidden rounded border border-border">
        <SurfaceSidebar
          regions={regions}
          onConfirm={(id) => confirmMutation.mutate(id)}
        />
        <div className="flex flex-1 flex-col">
          <div className="flex-1 p-4">
            <RenovationCanvas
              imageUrl={image.originalUrl}
              designUrl={
                image.designUrl
                  ? `${image.designUrl}?v=${designVersion}`
                  : null
              }
              finalDesignUrl={
                image.finalDesignUrl
                  ? `${image.finalDesignUrl}?v=${designVersion}`
                  : null
              }
              width={image.width}
              height={image.height}
              regions={regions}
              previewVariant={previewVariant}
              isRendering={isRendering || isHistoryBusy}
              isEnhancing={isEnhancing}
              generationMode={generationMode}
            />
          </div>
          <StudioToolbar
            onUndo={() => void handleUndo()}
            onRedo={() => void handleRedo()}
            isHistoryBusy={isHistoryBusy}
          />
        </div>
        <MaterialSidebar
          materials={materials}
          isRendering={isRendering}
          isEnhancing={isEnhancing}
          generationMode={generationMode}
          onApply={(variantId) => assignMutation.mutate(variantId)}
        />
      </div>
    </div>
  )
}
