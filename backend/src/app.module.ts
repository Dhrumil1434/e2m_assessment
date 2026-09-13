import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { DrizzleModule } from './database/drizzle.module';
import { EstimationModule } from './estimation/estimation.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { MaterialsModule } from './materials/materials.module';
import { MeasurementModule } from './measurement/measurement.module';
import { ProjectsModule } from './projects/projects.module';
import { RegionsModule } from './regions/regions.module';
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1000,
          limit: Number(process.env.THROTTLE_LIMIT ?? 60),
        },
      ],
    }),
    DrizzleModule,
    StorageModule,
    HealthModule,
    ProjectsModule,
    UploadModule,
    JobsModule,
    RegionsModule,
    MaterialsModule,
    MeasurementModule,
    EstimationModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
