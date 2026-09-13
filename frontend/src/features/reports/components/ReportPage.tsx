import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { useProject } from '@/features/projects/hooks/use-projects'
import { getJob } from '@/features/analyze/api/analyze.api'
import { generateReport, getReportDownload } from '../api/reports.api'

export function ReportPage() {
  const { projectId } = useParams()
  const { data: project, isLoading, refetch } = useProject(projectId)
  const [jobId, setJobId] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const generateMutation = useMutation({
    mutationFn: () => generateReport(projectId!),
    onSuccess: (data) => setJobId(data.jobId),
    onError: () => toast.error('Failed to generate report'),
  })

  const jobQuery = useQuery({
    queryKey: ['report-job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 2000
    },
  })

  useEffect(() => {
    async function fetchDownload() {
      const result = jobQuery.data?.result as
        | { reportId?: string; downloadUrl?: string }
        | undefined
      if (result?.downloadUrl) {
        setDownloadUrl(result.downloadUrl)
        return
      }
      if (result?.reportId && projectId) {
        const report = await getReportDownload(projectId, result.reportId)
        setDownloadUrl(report.downloadUrl)
      }
    }
    if (jobQuery.data?.status === 'completed') {
      void fetchDownload()
      void refetch()
    }
  }, [jobQuery.data, projectId, refetch])

  const existingReport = project?.reports?.[0]

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-2xl text-center">
      <PageHeader
        title="Project Report"
        description="Generate and download a PDF renovation report"
      />

      <div className="rounded border border-border bg-surface px-8 py-16">
        <FileText className="mx-auto mb-6 size-16 text-subtle" strokeWidth={1.5} />
        {downloadUrl || existingReport?.downloadUrl ? (
          <div className="space-y-4">
            <p className="text-muted">Your report is ready.</p>
            <Button asChild>
              <a
                href={downloadUrl ?? existingReport?.downloadUrl ?? '#'}
                target="_blank"
                rel="noreferrer"
              >
                <Download className="mr-2 size-4" />
                Download PDF
              </a>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted">
              {jobQuery.data?.status === 'processing' ||
              jobQuery.data?.status === 'pending'
                ? 'Generating report...'
                : 'Generate a comprehensive PDF report for this project.'}
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={
                generateMutation.isPending ||
                jobQuery.data?.status === 'processing' ||
                jobQuery.data?.status === 'pending'
              }
            >
              Generate Report
            </Button>
          </div>
        )}
        {jobQuery.data?.status === 'failed' ? (
          <ErrorState message={jobQuery.data.error ?? 'Report generation failed'} />
        ) : null}
      </div>
    </div>
  )
}
