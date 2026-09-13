import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { useProject } from '@/features/projects/hooks/use-projects'
import { listRegions } from '@/features/regions/api/regions.api'
import {
  autoMeasure,
  createMeasurement,
  estimateAreas,
} from '../api/measurements.api'

export function MeasurementPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: regions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ['regions', projectId],
    queryFn: () => listRegions(projectId!),
    enabled: Boolean(projectId),
  })

  const [regionId, setRegionId] = useState('')
  const [referenceWidthFt, setReferenceWidthFt] = useState('3')
  const [referenceWidthPx, setReferenceWidthPx] = useState('')
  const [areas, setAreas] = useState<
    { id: string; label: string; areaSqFt: number | null }[] | null
  >(null)
  const [scaleFtPerPx, setScaleFtPerPx] = useState<number | null>(null)
  const [calibrationNote, setCalibrationNote] = useState<string | null>(null)

  const measurableRegions = useMemo(
    () => regions.filter((region) => region.polygonJson?.length || region.bboxJson),
    [regions],
  )

  useEffect(() => {
    if (!regionId && measurableRegions[0]) {
      setRegionId(measurableRegions[0].id)
    }
  }, [measurableRegions, regionId])

  useEffect(() => {
    const selected = measurableRegions.find((region) => region.id === regionId)
    if (!selected?.bboxJson || selected.bboxJson.length < 4) return
    const [x1, , x2] = selected.bboxJson
    const widthPx = Math.abs(Number(x2) - Number(x1))
    if (widthPx > 0) {
      setReferenceWidthPx(String(Math.round(widthPx)))
    }
  }, [measurableRegions, regionId])

  const refreshProject = async () => {
    await queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    await queryClient.invalidateQueries({ queryKey: ['regions', projectId] })
  }

  const autoMutation = useMutation({
    mutationFn: () => autoMeasure(projectId!),
    onSuccess: async (data) => {
      setAreas(data.regions)
      setScaleFtPerPx(data.scaleFtPerPx)
      setCalibrationNote(
        data.calibrationMethod === 'standard_door'
          ? `Calibrated from ${data.referenceLabel ?? 'door'} (standard 3 ft width)`
          : `Calibrated from ${data.referenceLabel ?? 'facade'} (assumed 32 ft width)`,
      )
      toast.success('Surface areas estimated')
      await refreshProject()
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Auto measurement failed',
      ),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      await createMeasurement(projectId!, {
        regionId,
        referenceWidthFt: Number(referenceWidthFt),
        referenceWidthPx: Number(referenceWidthPx),
      })
      return estimateAreas(projectId!)
    },
    onSuccess: async (data) => {
      setAreas(data.regions)
      setScaleFtPerPx(data.scaleFtPerPx)
      setCalibrationNote('Calibrated from your manual reference')
      toast.success('Reference saved and areas updated')
      await refreshProject()
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Failed to save measurement',
      ),
  })

  useEffect(() => {
    if (!projectId || areas || autoMutation.isPending) return
    if (!measurableRegions.length) return
    // Auto-run once when landing on the page for a fast path
    autoMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, measurableRegions.length])

  if (projectLoading || regionsLoading) return <LoadingState />
  if (!project) return <ErrorState message="Project not found" />

  if (!measurableRegions.length) {
    return (
      <ErrorState
        message="No surfaces detected yet. Analyze the house image in Studio first."
        onRetry={() => navigate(`/projects/${projectId}/studio`)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Surface Measurement"
        description="Estimate renovation areas for costing — auto-calibrated from your house photo"
        action={
          <Button
            onClick={() => navigate(`/projects/${projectId}/estimate`)}
            disabled={!areas?.length}
          >
            Continue to Estimate
            <ArrowRight className="ml-2 size-4" />
          </Button>
        }
      />

      <div className="mb-6 rounded border border-border bg-surface p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Automatic area estimation</p>
            <p className="mt-1 text-sm text-muted">
              Uses a standard door (3 ft) or facade (32 ft) as scale reference —
              no tape measure required.
            </p>
            {calibrationNote ? (
              <p className="mt-2 text-xs text-subtle">{calibrationNote}</p>
            ) : null}
          </div>
          <Button
            onClick={() => autoMutation.mutate()}
            disabled={autoMutation.isPending}
          >
            <Ruler className="mr-2 size-4" />
            {autoMutation.isPending ? 'Estimating…' : 'Re-run Auto Estimate'}
          </Button>
        </div>
      </div>

      <details className="mb-8 rounded border border-border bg-surface p-6">
        <summary className="cursor-pointer text-sm font-medium">
          Advanced: manual reference (optional)
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted">
              Reference Surface
            </label>
            <Select value={regionId} onValueChange={setRegionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select surface" />
              </SelectTrigger>
              <SelectContent>
                {measurableRegions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted">
              Known Width (ft)
            </label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={referenceWidthFt}
              onChange={(e) => setReferenceWidthFt(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted">
              Width in Pixels
            </label>
            <Input
              type="number"
              min="1"
              value={referenceWidthPx}
              onChange={(e) => setReferenceWidthPx(e.target.value)}
            />
          </div>
        </div>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => saveMutation.mutate()}
          disabled={!regionId || !referenceWidthPx || saveMutation.isPending}
        >
          Save Manual Reference
        </Button>
      </details>

      {areas ? (
        <div>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
            Estimated Areas
          </h3>
          {scaleFtPerPx ? (
            <p className="mb-4 text-xs text-subtle">
              Scale: {scaleFtPerPx.toFixed(6)} ft/px · {areas.length} surfaces
            </p>
          ) : null}
          <div className="overflow-hidden rounded border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-elevated">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Surface</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Area (sq ft)
                  </th>
                </tr>
              </thead>
              <tbody>
                {areas.map((region) => (
                  <tr key={region.id} className="border-b border-border">
                    <td className="px-4 py-3">{region.label}</td>
                    <td className="px-4 py-3 text-right">
                      {region.areaSqFt?.toFixed(1) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : autoMutation.isPending ? (
        <LoadingState label="Estimating surface areas…" />
      ) : null}
    </div>
  )
}
