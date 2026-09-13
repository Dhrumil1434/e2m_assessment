import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Material, MaterialVariant } from '@/types/api'
import { cn } from '@/lib/utils'
import { useStudioStore } from '../store/studio.store'

interface MaterialSidebarProps {
  materials: Material[]
  isRendering?: boolean
  isEnhancing?: boolean
  generationMode?: 'ai' | 'opencv' | null
  onApply: (variantId: string) => void
}

function groupByCategory(materials: Material[]) {
  return materials.reduce<Record<string, Material[]>>((acc, material) => {
    acc[material.category] ??= []
    acc[material.category].push(material)
    return acc
  }, {})
}

function VariantSwatch({
  variant,
  selected,
  onSelect,
}: {
  variant: MaterialVariant
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded border px-3 py-2 text-left text-sm transition-colors',
        selected
          ? 'border-foreground bg-surface-elevated'
          : 'border-border hover:bg-surface-elevated',
      )}
    >
      {variant.textureUrl ? (
        <img
          src={variant.textureUrl}
          alt=""
          className="size-8 shrink-0 rounded border border-border object-cover"
        />
      ) : (
        <span
          className="size-8 shrink-0 rounded border border-border"
          style={{ backgroundColor: variant.colorHex ?? '#737373' }}
        />
      )}
      <span>{variant.name}</span>
    </button>
  )
}

export function MaterialSidebar({
  materials,
  isRendering = false,
  isEnhancing = false,
  generationMode = null,
  onApply,
}: MaterialSidebarProps) {
  const {
    previewMaterialId,
    selectedMaterialId,
    setPreviewMaterial,
    rightPanelOpen,
    toggleRightPanel,
    selectedSurfaceId,
  } = useStudioStore()

  const grouped = groupByCategory(materials)
  const categories = Object.keys(grouped)

  if (!rightPanelOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="absolute right-2 top-2 z-10"
        onClick={toggleRightPanel}
      >
        <PanelRightOpen className="size-4" />
      </Button>
    )
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
          Materials
        </h3>
        <Button variant="ghost" size="icon" onClick={toggleRightPanel}>
          <PanelRightClose className="size-4" />
        </Button>
      </div>

      <Tabs defaultValue={categories[0]} className="flex flex-1 flex-col">
        <TabsList className="mx-2 mt-2 grid w-auto grid-cols-2">
          {categories.slice(0, 4).map((cat) => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
        {categories.map((cat) => (
          <TabsContent
            key={cat}
            value={cat}
            className="flex-1 overflow-y-auto p-2"
          >
            {grouped[cat].flatMap((material) =>
              material.variants.map((variant) => (
                <div key={variant.id} className="mb-2">
                  <VariantSwatch
                    variant={variant}
                    selected={
                      previewMaterialId === variant.id ||
                      selectedMaterialId === variant.id
                    }
                    onSelect={() => setPreviewMaterial(variant.id)}
                  />
                </div>
              )),
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="space-y-2 border-t border-border p-3">
        {isEnhancing ? (
          <p className="text-center text-xs text-muted">
            AI is regenerating the selected surface…
          </p>
        ) : isRendering ? (
          <p className="text-center text-xs text-muted">
            {generationMode === 'ai'
              ? 'Building preview, then AI generation…'
              : 'Generating design image…'}
          </p>
        ) : (
          <p className="text-center text-xs text-muted">
            Photorealistic AI requires ComfyUI + SD 1.5 inpainting.
          </p>
        )}
        <Button
          className="w-full"
          variant="outline"
          size="sm"
          disabled={!previewMaterialId || !selectedSurfaceId || isRendering}
          onClick={() => previewMaterialId && onApply(previewMaterialId)}
        >
          {isRendering ? 'Rendering…' : 'Apply Material'}
        </Button>
      </div>
    </aside>
  )
}
