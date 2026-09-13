export const WORKFLOW_STEPS = [
  { key: 'upload', label: 'Upload', path: 'upload' },
  { key: 'analyze', label: 'Analyze', path: 'analyze' },
  { key: 'studio', label: 'Design', path: 'studio' },
  { key: 'measurement', label: 'Measure', path: 'measurement' },
  { key: 'estimate', label: 'Estimate', path: 'estimate' },
  { key: 'report', label: 'Report', path: 'report' },
] as const

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export const MAX_IMAGE_SIZE_MB = 15
