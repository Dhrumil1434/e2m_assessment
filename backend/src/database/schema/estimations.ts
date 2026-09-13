import { doublePrecision, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { buildingRegions } from './building-regions';
import { materials } from './materials';
import { projects } from './projects';

export const quantityEstimations = pgTable('quantity_estimations', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  materialId: uuid('material_id')
    .notNull()
    .references(() => materials.id),
  regionId: uuid('region_id')
    .notNull()
    .references(() => buildingRegions.id, { onDelete: 'cascade' }),
  areaSqFt: doublePrecision('area_sq_ft').notNull(),
  baseQuantity: doublePrecision('base_quantity').notNull(),
  wastageQuantity: doublePrecision('wastage_quantity').notNull(),
  finalQuantity: doublePrecision('final_quantity').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export interface CostLineItem {
  materialName: string;
  regionLabel: string;
  quantity: number;
  unit: string;
  materialCost: number;
  laborCost: number;
  total: number;
}

export const costEstimations = pgTable('cost_estimations', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  lineItems: jsonb('line_items').$type<CostLineItem[]>().notNull(),
  materialTotal: doublePrecision('material_total').notNull(),
  laborTotal: doublePrecision('labor_total').notNull(),
  contingency: doublePrecision('contingency').notNull(),
  grandTotal: doublePrecision('grand_total').notNull(),
  rangeLow: doublePrecision('range_low').notNull(),
  rangeHigh: doublePrecision('range_high').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
