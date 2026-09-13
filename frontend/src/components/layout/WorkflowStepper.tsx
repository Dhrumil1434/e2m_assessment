import { Link, useLocation, useParams } from 'react-router-dom'
import { WORKFLOW_STEPS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function WorkflowStepper() {
  const { projectId } = useParams()
  const location = useLocation()

  if (!projectId) return null

  const currentIndex = WORKFLOW_STEPS.findIndex((step) =>
    location.pathname.includes(`/${step.path}`),
  )

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {WORKFLOW_STEPS.map((step, index) => {
        const isActive = index === currentIndex
        const isComplete = currentIndex > index
        const href = `/projects/${projectId}/${step.path}`

        return (
          <div key={step.key} className="flex items-center">
            <Link
              to={href}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 text-xs uppercase tracking-wider transition-colors',
                isActive && 'text-foreground',
                isComplete && 'text-muted hover:text-foreground',
                !isActive && !isComplete && 'text-subtle hover:text-muted',
              )}
            >
              {step.label}
            </Link>
            {index < WORKFLOW_STEPS.length - 1 ? (
              <span className="text-subtle">→</span>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
