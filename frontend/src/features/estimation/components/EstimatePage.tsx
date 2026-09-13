import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { ApiError } from '@/lib/api-client'
import { useProject } from '@/features/projects/hooks/use-projects'
import { estimateCost, estimateQuantities } from '../api/estimation.api'

export function EstimatePage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: project, isLoading } = useProject(projectId)

  const runEstimation = useMutation({
    mutationFn: async () => {
      await estimateQuantities(projectId!)
      return estimateCost(projectId!)
    },
    onSuccess: async () => {
      toast.success('Estimation complete')
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (error) => {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Estimation failed'
      toast.error(message)
    },
  })

  const cost = runEstimation.data ?? project?.costEstimations?.[0]

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Cost Estimation"
        description="Material quantities, labor, and project total"
        action={
          <div className="flex gap-2">
            <Button
              onClick={() => runEstimation.mutate()}
              disabled={runEstimation.isPending}
            >
              {runEstimation.isPending ? 'Calculating...' : 'Calculate Estimate'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}/report`)}
              disabled={!cost}
            >
              Continue to Report
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        }
      />

      {cost ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded border border-border bg-surface p-6">
              <p className="text-xs uppercase tracking-wider text-muted">
                Grand Total
              </p>
              <p className="mt-2 text-4xl font-semibold">
                ₹{cost.grandTotal.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-muted">
                Range: ₹{cost.rangeLow.toLocaleString()} – ₹
                {cost.rangeHigh.toLocaleString()}
              </p>
            </div>
            <div className="rounded border border-border bg-surface p-6">
              <p className="text-xs uppercase tracking-wider text-muted">
                Materials
              </p>
              <p className="mt-2 text-3xl font-semibold">
                ₹{cost.materialTotal.toLocaleString()}
              </p>
            </div>
            <div className="rounded border border-border bg-surface p-6">
              <p className="text-xs uppercase tracking-wider text-muted">
                Labor
              </p>
              <p className="mt-2 text-3xl font-semibold">
                ₹{cost.laborTotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-elevated">
                <tr>
                  <th className="px-4 py-3 text-left">Material</th>
                  <th className="px-4 py-3 text-left">Surface</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Material</th>
                  <th className="px-4 py-3 text-right">Labor</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {cost.lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3">{item.materialName}</td>
                    <td className="px-4 py-3 text-muted">{item.regionLabel}</td>
                    <td className="px-4 py-3 text-right">
                      {item.quantity.toFixed(1)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ₹{item.materialCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ₹{item.laborCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₹{item.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-muted">
            Contingency (5%): ₹{cost.contingency.toLocaleString()} · Advisory
            estimate only
          </p>
        </div>
      ) : (
        <div className="rounded border border-border bg-surface p-8 text-center">
          <p className="mb-4 text-muted">
            Assign materials in Studio, then calculate quantities and cost here.
            Areas are auto-estimated if needed.
          </p>
          <Button
            onClick={() => runEstimation.mutate()}
            disabled={runEstimation.isPending}
          >
            {runEstimation.isPending ? 'Calculating...' : 'Calculate Estimate'}
          </Button>
          {runEstimation.isError ? (
            <div className="mt-6">
              <ErrorState
                message={
                  runEstimation.error instanceof Error
                    ? runEstimation.error.message
                    : 'Estimation failed'
                }
                onRetry={() => runEstimation.mutate()}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
