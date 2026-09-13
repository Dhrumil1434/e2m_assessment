import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { jobStatusEnum, jobTypeEnum } from './enums';
import { projects } from './projects';

export const jobRecords = pgTable('job_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, {
    onDelete: 'set null',
  }),
  type: jobTypeEnum('type').notNull(),
  status: jobStatusEnum('status').notNull().default('pending'),
  bullJobId: varchar('bull_job_id', { length: 255 }),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  result: jsonb('result').$type<Record<string, unknown>>(),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
