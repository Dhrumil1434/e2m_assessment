import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed border-border bg-surface px-8 py-16 text-center">
      <Icon className="mb-4 size-10 text-subtle" strokeWidth={1.5} />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
