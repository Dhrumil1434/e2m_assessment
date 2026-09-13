import {
  doublePrecision,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { calculationTypeEnum } from './enums';

export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  calculationType: calculationTypeEnum('calculation_type').notNull(),
  coveragePerUnit: doublePrecision('coverage_per_unit'),
  tileWidthFt: doublePrecision('tile_width_ft'),
  tileHeightFt: doublePrecision('tile_height_ft'),
  wastagePercent: doublePrecision('wastage_percent').notNull().default(10),
  materialRate: doublePrecision('material_rate').notNull(),
  laborRate: doublePrecision('labor_rate').notNull(),
  laborUnit: varchar('labor_unit', { length: 50 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const materialVariants = pgTable('material_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  materialId: uuid('material_id')
    .notNull()
    .references(() => materials.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  textureStorageKey: varchar('texture_storage_key', { length: 512 }),
  colorHex: varchar('color_hex', { length: 7 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
