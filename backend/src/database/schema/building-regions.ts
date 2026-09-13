import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { regionStatusEnum, regionTypeEnum } from './enums';
import { projectImages } from './project-images';

export const buildingRegions = pgTable('building_regions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectImageId: uuid('project_image_id')
    .notNull()
    .references(() => projectImages.id, { onDelete: 'cascade' }),
  type: regionTypeEnum('type').notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  maskStorageKey: varchar('mask_storage_key', { length: 512 }),
  polygonJson: jsonb('polygon_json').$type<number[][]>(),
  bboxJson: jsonb('bbox_json').$type<number[]>(),
  pixelArea: integer('pixel_area'),
  areaSqFt: doublePrecision('area_sq_ft'),
  status: regionStatusEnum('status').notNull().default('proposed'),
  confidence: doublePrecision('confidence'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
