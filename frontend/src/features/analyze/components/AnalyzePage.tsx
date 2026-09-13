import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { ApiError } from '@/lib/api-client'
import { useProject } from '@/features/projects/hooks/use-projects'
import { analyzeImage, getJob } from '../api/analyze.api'

type AnalyzeLocationState = {
  imageId?: string
  reanalyze?: boolean
  runId?: string
}

const JOB_TIMEOUT_MS = 90_000

export function AnalyzePage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const locationState = location.state as AnalyzeLocationState | null
  const imageIdFromState = locationState?.imageId
  const isReanalyze = locationState?.reanalyze ?? false
  const fallbackRunId = useRef(crypto.randomUUID())
  const runId = locationState?.runId ?? fallbackRunId.current
  const startedForRun = useRef<string | null>(null)
  const {
    data: project,
    isLoading,
    isFetching,
    refetch,
  } = useProject(projectId)
  const [jobId, setJobId] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const image =
    project?.images?.find((img) => img.id === imageIdFromState) ??
    project?.images?.[0]

  const sessionKey = `${projectId ?? ''}:${image?.id ?? ''}:${runId}`

  useEffect(() => {
    void refetch()
  }, [projectId, refetch])

  const startAnalysis = useMutation({
    mutationFn: () => analyzeImage(projectId!, image!.id),
    onSuccess: (data) => {
      setStartError(null)
      setTimedOut(false)
      setJobId(data.jobId)
    },
    onError: (error) => {
      startedForRun.current = null
      if (error instanceof ApiError && error.statusCode === 429) {
        setStartError(
          'Too many analysis requests. Please wait a minute and try again.',
        )
        toast.error('Rate limit reached')
      } else {
        setStartError(
          error instanceof Error ? error.message : 'Analysis failed to start',
        )
      }
    },
  })

  const jobQuery = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 1500
    },
  })

  useEffect(() => {
    if (!image || !projectId) return
    if (startedForRun.current === sessionKey) return

    startedForRun.current = sessionKey
    setJobId(null)
    setStartError(null)
    setTimedOut(false)
    startAnalysis.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per sessionKey only
  }, [sessionKey, image, projectId])

  useEffect(() => {
    if (!jobId) return
    if (
      jobQuery.data?.status === 'completed' ||
      jobQuery.data?.status === 'failed'
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      setTimedOut(true)
    }, JOB_TIMEOUT_MS)

    return () => window.clearTimeout(timer)
  }, [jobId, jobQuery.data?.status])

  useEffect(() => {
    if (jobQuery.data?.status === 'completed') {
      void refetch()
      void queryClient.invalidateQueries({ queryKey: ['regions', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      navigate(`/projects/${projectId}/studio`, {
        replace: true,
        state: {
          imageId: image?.id,
          reanalyzed: true,
        },
      })
    }
  }, [
    jobQuery.data?.status,
    navigate,
    projectId,
    queryClient,
    refetch,
    image?.id,
  ])

  const handleManualRetry = () => {
    startedForRun.current = null
    setJobId(null)
    setStartError(null)
    setTimedOut(false)
    startedForRun.current = sessionKey
    startAnalysis.mutate()
  }

  const goToStudio = () => {
    navigate(`/projects/${projectId}/studio`, { replace: true })
  }

  if (isLoading || (isFetching && !image)) {
    return <LoadingState label="Loading project..." />
  }

  if (!project || !image) {
    return (
      <ErrorState
        message="No image found. Upload an image first."
        onRetry={() => navigate(`/projects/${projectId}/upload`)}
      />
    )
  }

  if (startError) {
    return <ErrorState message={startError} onRetry={handleManualRetry} />
  }

  if (startAnalysis.isError && !jobId) {
    return (
      <ErrorState
        message={
          startAnalysis.error instanceof Error
            ? startAnalysis.error.message
            : 'Failed to start analysis'
        }
        onRetry={handleManualRetry}
      />
    )
  }

  if (jobQuery.data?.status === 'failed') {
    return (
      <ErrorState
        message={jobQuery.data.error ?? 'Analysis failed'}
        onRetry={handleManualRetry}
      />
    )
  }

  if (timedOut) {
    return (
      <ErrorState
        message="Analysis is taking too long. The AI worker may be busy or stuck — retry, or return to Studio."
        onRetry={handleManualRetry}
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl text-center">
      <PageHeader
        title={isReanalyze ? 'Re-analyzing Surfaces' : 'AI Analysis'}
        description="Detecting building surfaces in your image"
      />
      <div className="flex animate-pulse flex-col items-center gap-6 rounded border border-border bg-surface px-8 py-16 [animation-duration:2s]">
        <Sparkles className="size-12 text-foreground" strokeWidth={1.5} />
        <div>
          <p className="text-lg font-medium">Analyzing surfaces...</p>
          <p className="mt-2 text-sm text-muted">
            Status:{' '}
            {jobQuery.data?.status ??
              (startAnalysis.isPending ? 'starting' : 'queued')}
          </p>
        </div>
        {image.originalUrl ? (
          <img
            src={image.originalUrl}
            alt="Analyzing"
            className="max-h-48 rounded border border-border object-contain opacity-60"
          />
        ) : null}
      </div>
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="outline" onClick={goToStudio}>
          Back to Studio
        </Button>
        <Button variant="outline" onClick={handleManualRetry}>
          Retry
        </Button>
      </div>
    </div>
  )
}
