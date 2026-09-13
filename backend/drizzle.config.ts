import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://e2m:e2m@localhost:5432/e2m',
  },
});
