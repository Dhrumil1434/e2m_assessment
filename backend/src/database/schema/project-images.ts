import {
  doublePrecision,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { qualityStatusEnum } from './enums';
import { projects } from './projects';

export const projectImages = pgTable('project_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  storageKey: varchar('storage_key', { length: 512 }).notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  blurScore: doublePrecision('blur_score'),
  qualityStatus: qualityStatusEnum('quality_status').notNull().default('pass'),
  designStorageKey: varchar('design_storage_key', { length: 512 }),
  finalDesignStorageKey: varchar('final_design_storage_key', { length: 512 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
