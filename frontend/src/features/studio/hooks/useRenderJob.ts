import { useQuery } from '@tanstack/react-query'
import { getJob } from '@/features/analyze/api/analyze.api'

export function useRenderJob(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 2000
    },
  })
}

export function waitForRenderJob(
  jobId: string,
  getJobFn: (id: string) => Promise<{ status: string; error?: string | null }>,
  intervalMs = 2000,
  timeoutMs = 120_000,
): Promise<void> {
  const started = Date.now()

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const job = await getJobFn(jobId)

        if (job.status === 'completed') {
          resolve()
          return
        }

        if (job.status === 'failed') {
          reject(new Error(job.error ?? 'Render failed'))
          return
        }

        if (Date.now() - started > timeoutMs) {
          reject(new Error('Render timed out'))
          return
        }

        setTimeout(poll, intervalMs)
      } catch (error) {
        reject(error)
      }
    }

    void poll()
  })
}
