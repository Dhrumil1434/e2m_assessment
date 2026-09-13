import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
} from '../hooks/use-projects'

export function ProjectsPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const [name, setName] = useState('')
  const [open, setOpen] = useState(false)

  const handleCreate = async () => {
    const project = await createProject.mutateAsync(name || undefined)
    setOpen(false)
    setName('')
    navigate(`/projects/${project.id}/upload`)
  }

  if (isLoading) return <LoadingState label="Loading projects..." />
  if (error) {
    return (
      <ErrorState
        message={error.message}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage your house renovation projects"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-surface">
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Project name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={() => void handleCreate()}
                  disabled={createProject.isPending}
                >
                  Create & Upload
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {!data?.length ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Create your first project to upload a house image and start the renovation workflow."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 size-4" />
              New Project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className="group relative overflow-hidden rounded border border-border bg-surface"
            >
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => navigate(`/projects/${project.id}/upload`)}
              >
                <div className="aspect-video bg-surface-elevated">
                  {project.thumbnailUrl ? (
                    <img
                      src={project.thumbnailUrl}
                      alt={project.name ?? 'Project'}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-subtle">
                      <FolderOpen className="size-8" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium">
                    {project.name ?? 'Untitled Project'}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {formatDistanceToNow(new Date(project.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => deleteProject.mutate(project.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
