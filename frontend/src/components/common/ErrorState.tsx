import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded border border-border bg-surface px-8 py-16 text-center">
      <AlertCircle className="size-10 text-muted" strokeWidth={1.5} />
      <p className="max-w-md text-sm text-muted">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
