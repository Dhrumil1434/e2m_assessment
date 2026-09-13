import { Check, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { BuildingRegion } from '@/types/api'
import { cn } from '@/lib/utils'
import { useStudioStore } from '../store/studio.store'

interface SurfaceSidebarProps {
  regions: BuildingRegion[]
  onConfirm: (regionId: string) => void
}

export function SurfaceSidebar({ regions, onConfirm }: SurfaceSidebarProps) {
  const {
    selectedSurfaceId,
    selectSurface,
    leftPanelOpen,
    toggleLeftPanel,
  } = useStudioStore()

  if (!leftPanelOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="absolute left-2 top-2 z-10"
        onClick={toggleLeftPanel}
      >
        <PanelLeftOpen className="size-4" />
      </Button>
    )
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
          Surfaces
        </h3>
        <Button variant="ghost" size="icon" onClick={toggleLeftPanel}>
          <PanelLeftClose className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {regions.map((region) => (
          <button
            key={region.id}
            type="button"
            onClick={() => selectSurface(region.id)}
            className={cn(
              'mb-1 flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm transition-colors',
              selectedSurfaceId === region.id
                ? 'border-foreground bg-surface-elevated text-foreground'
                : 'border-transparent text-muted hover:border-border hover:bg-surface-elevated',
            )}
          >
            <span>{region.label}</span>
            <div className="flex items-center gap-1">
              {region.status === 'confirmed' ? (
                <Check className="size-3.5" />
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  AI
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>
      {selectedSurfaceId ? (
        <div className="border-t border-border p-3">
          <Button
            className="w-full"
            variant="outline"
            size="sm"
            onClick={() => onConfirm(selectedSurfaceId)}
          >
            Confirm Surface
          </Button>
        </div>
      ) : null}
    </aside>
  )
}
