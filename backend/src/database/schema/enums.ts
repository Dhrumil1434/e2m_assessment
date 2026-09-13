import { pgEnum } from 'drizzle-orm/pg-core';

export const qualityStatusEnum = pgEnum('quality_status', ['pass', 'fail']);
export const regionTypeEnum = pgEnum('region_type', [
  'wall',
  'window',
  'door',
  'balcony',
  'pillar',
  'gate',
  'railing',
  'roof',
]);
export const regionStatusEnum = pgEnum('region_status', [
  'proposed',
  'confirmed',
]);
export const calculationTypeEnum = pgEnum('calculation_type', [
  'paint',
  'tile',
  'stone',
  'linear',
  'railing',
]);
export const jobTypeEnum = pgEnum('job_type', [
  'segmentation',
  'rendering',
  'refine',
  'report',
]);
export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);
