import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { buildingRegions } from './building-regions';
import { materialVariants } from './materials';

export const regionMaterialAssignments = pgTable('region_material_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  regionId: uuid('region_id')
    .notNull()
    .references(() => buildingRegions.id, { onDelete: 'cascade' })
    .unique(),
  materialVariantId: uuid('material_variant_id')
    .notNull()
    .references(() => materialVariants.id),
  previewStorageKey: varchar('preview_storage_key', { length: 512 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
