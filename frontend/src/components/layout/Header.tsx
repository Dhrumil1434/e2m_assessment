import { Link } from 'react-router-dom'
import { WorkflowStepper } from './WorkflowStepper'

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="flex h-14 items-center justify-between px-6">
        <Link
          to="/projects"
          className="text-sm font-semibold uppercase tracking-[0.2em]"
        >
          Renovate AI
        </Link>
        <WorkflowStepper />
      </div>
    </header>
  )
}
