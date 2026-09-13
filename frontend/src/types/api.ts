export type RegionType =
  | 'wall'
  | 'window'
  | 'door'
  | 'balcony'
  | 'pillar'
  | 'gate'
  | 'railing'
  | 'roof'

export type RegionStatus = 'proposed' | 'confirmed'

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type JobType = 'segmentation' | 'rendering' | 'refine' | 'report'

export interface ProjectSummary {
  id: string
  name: string | null
  createdAt: string
  updatedAt: string
  thumbnailUrl: string | null
}

export interface MaterialVariant {
  id: string
  materialId: string
  name: string
  textureStorageKey: string | null
  colorHex: string | null
  textureUrl?: string | null
  createdAt: string
}

export interface Material {
  id: string
  name: string
  category: string
  calculationType: 'paint' | 'tile' | 'stone' | 'linear' | 'railing'
  coveragePerUnit: number | null
  tileWidthFt: number | null
  tileHeightFt: number | null
  wastagePercent: number
  materialRate: number
  laborRate: number
  laborUnit: string
  unit: string
  createdAt: string
  variants: MaterialVariant[]
}

export interface RegionAssignment {
  id: string
  regionId: string
  materialVariantId: string
  previewStorageKey: string | null
  previewUrl?: string | null
  createdAt: string
  updatedAt: string
  variant?: MaterialVariant & { material?: Material }
}

export interface BuildingRegion {
  id: string
  projectImageId: string
  type: RegionType
  label: string
  maskStorageKey: string | null
  maskUrl?: string | null
  polygonJson: number[][] | null
  bboxJson: number[] | null
  pixelArea: number | null
  areaSqFt: number | null
  status: RegionStatus
  confidence: number | null
  createdAt: string
  updatedAt: string
  assignment?: RegionAssignment | null
}

export interface ProjectImage {
  id: string
  projectId: string
  storageKey: string
  originalUrl?: string
  designUrl?: string | null
  finalDesignUrl?: string | null
  width: number
  height: number
  blurScore: number | null
  qualityStatus: 'pass' | 'fail'
  createdAt: string
  regions?: BuildingRegion[]
}

export interface MeasurementReference {
  id: string
  projectId: string
  regionId: string
  referenceWidthFt: number
  referenceWidthPx: number
  scaleFtPerPx: number
  createdAt: string
}

export interface QuantityEstimation {
  id: string
  projectId: string
  materialId: string
  regionId: string
  areaSqFt: number
  baseQuantity: number
  wastageQuantity: number
  finalQuantity: number
  unit: string
  createdAt: string
}

export interface CostLineItem {
  materialName: string
  regionLabel: string
  quantity: number
  unit: string
  materialCost: number
  laborCost: number
  total: number
}

export interface CostEstimation {
  id: string
  projectId: string
  lineItems: CostLineItem[]
  materialTotal: number
  laborTotal: number
  contingency: number
  grandTotal: number
  rangeLow: number
  rangeHigh: number
  createdAt: string
}

export interface Report {
  id: string
  projectId: string
  storageKey: string
  downloadUrl?: string
  createdAt: string
}

export interface Job {
  id: string
  projectId: string | null
  type: JobType
  status: JobStatus
  bullJobId: string | null
  payload: Record<string, unknown> | null
  result: Record<string, unknown> | null
  error: string | null
  createdAt: string
  updatedAt: string
}

export interface Project extends ProjectSummary {
  images: ProjectImage[]
  measurementReferences: MeasurementReference[]
  quantityEstimations: QuantityEstimation[]
  costEstimations: CostEstimation[]
  reports: Report[]
  jobs: Job[]
}

export interface UploadImageResponse {
  imageId: string
  quality: {
    passed: boolean
    blurScore: number
    minResolution: boolean
  }
}

export interface AnalyzeResponse {
  imageId: string
  jobId: string
  status: JobStatus
}

export type GenerationMode = 'ai' | 'opencv'

export interface JobEnqueueResponse {
  jobId: string
  finalJobId?: string | null
  generationMode?: GenerationMode
  status: string
}

export interface EstimateAreasResponse {
  scaleFtPerPx: number
  regions: BuildingRegion[]
}
