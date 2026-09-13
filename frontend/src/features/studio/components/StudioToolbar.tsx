import {
  Minus,
  Plus,
  Redo2,
  Undo2,
  MousePointer2,
  Ruler,
  Columns2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStudioStore, type StudioMode } from '../store/studio.store'

const MODES: { mode: StudioMode; icon: typeof MousePointer2; label: string }[] =
  [
    { mode: 'select', icon: MousePointer2, label: 'Select' },
    { mode: 'measure', icon: Ruler, label: 'Measure' },
    { mode: 'compare', icon: Columns2, label: 'Compare' },
  ]

interface StudioToolbarProps {
  onUndo?: () => void
  onRedo?: () => void
  isHistoryBusy?: boolean
}

export function StudioToolbar({
  onUndo,
  onRedo,
  isHistoryBusy = false,
}: StudioToolbarProps) {
  const {
    mode,
    zoom,
    previewMode,
    setMode,
    setZoom,
    setPreviewMode,
    canUndo,
    canRedo,
  } = useStudioStore()

  return (
    <footer className="flex items-center justify-between border-t border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-1">
        {MODES.map(({ mode: m, icon: Icon, label }) => (
          <Button
            key={m}
            variant="ghost"
            size="sm"
            className={cn(mode === m && 'bg-surface-elevated')}
            onClick={() => setMode(m)}
          >
            <Icon className="mr-1.5 size-4" />
            {label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={!canUndo() || isHistoryBusy}
          onClick={onUndo}
          title="Undo material change"
        >
          <Undo2 className="mr-1.5 size-4" />
          Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canRedo() || isHistoryBusy}
          onClick={onRedo}
          title="Redo material change"
        >
          <Redo2 className="mr-1.5 size-4" />
          Redo
        </Button>
        <div className="mx-2 h-4 w-px bg-border" />
        <Button variant="ghost" size="icon" onClick={() => setZoom(zoom - 0.1)}>
          <Minus className="size-4" />
        </Button>
        <span className="w-12 text-center text-xs text-muted">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" onClick={() => setZoom(zoom + 0.1)}>
          <Plus className="size-4" />
        </Button>
        <div className="mx-2 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          className={cn(previewMode === 'original' && 'bg-surface-elevated')}
          onClick={() => setPreviewMode('original')}
        >
          Original
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(previewMode === 'renovated' && 'bg-surface-elevated')}
          onClick={() => setPreviewMode('renovated')}
        >
          Design
        </Button>
      </div>
    </footer>
  )
}
