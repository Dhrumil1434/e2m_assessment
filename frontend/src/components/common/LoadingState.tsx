import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
