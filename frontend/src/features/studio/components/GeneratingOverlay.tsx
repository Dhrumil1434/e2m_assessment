import { Loader2 } from 'lucide-react'

interface GeneratingOverlayProps {
  message: string
  detail?: string
}

export function GeneratingOverlay({ message, detail }: GeneratingOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded border border-border bg-surface px-6 py-5 text-center">
        <Loader2 className="size-6 animate-spin text-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">{message}</p>
          {detail ? (
            <p className="mt-1 text-xs text-muted">{detail}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
