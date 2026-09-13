import { Slider } from '@/components/ui/slider'

interface CompareSliderProps {
  value: number
  onChange: (value: number) => void
}

export function CompareSlider({ value, onChange }: CompareSliderProps) {
  return (
    <div className="absolute inset-x-4 bottom-4 rounded border border-border bg-surface/90 px-4 py-3 backdrop-blur-sm">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted">
        Compare Original / Design
      </p>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={([next]) => onChange(next)}
      />
    </div>
  )
}
