import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { DRIZZLE } from './drizzle.constants';

export type DrizzleDB = NodePgDatabase<typeof schema>;
export { DRIZZLE };

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.getOrThrow<string>('DATABASE_URL'),
        });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
