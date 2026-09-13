import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  storageKey: varchar('storage_key', { length: 512 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
