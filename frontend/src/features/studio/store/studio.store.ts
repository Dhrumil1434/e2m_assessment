import { create } from 'zustand'

export type StudioMode = 'select' | 'edit-mask' | 'measure' | 'compare'

export type PreviewMode = 'original' | 'renovated'

export interface StudioHistoryEntry {
  regionId: string
  previousVariantId: string | null
  nextVariantId: string
}

interface StudioState {
  mode: StudioMode
  selectedSurfaceId: string | null
  zoom: number
  position: { x: number; y: number }
  selectedMaterialId: string | null
  previewMaterialId: string | null
  previewMode: PreviewMode
  history: StudioHistoryEntry[]
  historyIndex: number
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  setMode: (mode: StudioMode) => void
  selectSurface: (id: string | null) => void
  setZoom: (zoom: number) => void
  setPosition: (position: { x: number; y: number }) => void
  setPreviewMaterial: (id: string | null) => void
  setSelectedMaterial: (id: string | null) => void
  setPreviewMode: (mode: PreviewMode) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  recordApply: (
    surfaceId: string,
    nextVariantId: string,
    previousVariantId: string | null,
  ) => void
  undo: () => StudioHistoryEntry | null
  redo: () => StudioHistoryEntry | null
  canUndo: () => boolean
  canRedo: () => boolean
  resetHistory: () => void
}

export const useStudioStore = create<StudioState>((set, get) => ({
  mode: 'select',
  selectedSurfaceId: null,
  zoom: 1,
  position: { x: 0, y: 0 },
  selectedMaterialId: null,
  previewMaterialId: null,
  previewMode: 'renovated',
  history: [],
  historyIndex: -1,
  leftPanelOpen: true,
  rightPanelOpen: true,
  setMode: (mode) => set({ mode }),
  selectSurface: (id) => set({ selectedSurfaceId: id }),
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.25), 4) }),
  setPosition: (position) => set({ position }),
  setPreviewMaterial: (id) => set({ previewMaterialId: id }),
  setSelectedMaterial: (id) => set({ selectedMaterialId: id }),
  setPreviewMode: (mode) => set({ previewMode: mode }),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  recordApply: (surfaceId, nextVariantId, previousVariantId) => {
    const { history, historyIndex } = get()
    const next = history.slice(0, historyIndex + 1)
    next.push({ regionId: surfaceId, previousVariantId, nextVariantId })
    set({
      history: next,
      historyIndex: next.length - 1,
      selectedMaterialId: nextVariantId,
      previewMaterialId: null,
    })
  },
  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < 0) return null
    const entry = history[historyIndex]
    set({
      historyIndex: historyIndex - 1,
      selectedMaterialId: entry.previousVariantId,
    })
    return entry
  },
  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return null
    const entry = history[historyIndex + 1]
    set({
      historyIndex: historyIndex + 1,
      selectedMaterialId: entry.nextVariantId,
    })
    return entry
  },
  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
  resetHistory: () => set({ history: [], historyIndex: -1 }),
}))
