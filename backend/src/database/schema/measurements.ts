import { doublePrecision, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { buildingRegions } from './building-regions';
import { projects } from './projects';

export const measurementReferences = pgTable('measurement_references', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  regionId: uuid('region_id')
    .notNull()
    .references(() => buildingRegions.id, { onDelete: 'cascade' }),
  referenceWidthFt: doublePrecision('reference_width_ft').notNull(),
  referenceWidthPx: doublePrecision('reference_width_px').notNull(),
  scaleFtPerPx: doublePrecision('scale_ft_per_px').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
