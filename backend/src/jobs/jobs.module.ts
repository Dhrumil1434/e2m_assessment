import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProjectsModule } from '../projects/projects.module';
import { ReportsModule } from '../reports/reports.module';
import { UploadModule } from '../upload/upload.module';
import { AiWorkerClient } from './ai-worker.client';
import { AnalyzeController } from './analyze.controller';
import {
  DESIGN_COMPOSITE_QUEUE,
  INPAINT_RENDER_QUEUE,
  RENDERING_QUEUE,
  REPORTS_QUEUE,
  SEGMENTATION_QUEUE,
} from './jobs.constants';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { DesignCompositeProcessor } from './processors/design-composite.processor';
import { InpaintRenderProcessor } from './processors/inpaint-render.processor';
import { RenderingProcessor } from './processors/rendering.processor';
import { ReportsProcessor } from './processors/reports.processor';
import { SegmentationProcessor } from './processors/segmentation.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: SEGMENTATION_QUEUE },
      { name: RENDERING_QUEUE },
      { name: DESIGN_COMPOSITE_QUEUE },
      { name: INPAINT_RENDER_QUEUE },
      { name: REPORTS_QUEUE },
    ),
    ProjectsModule,
    UploadModule,
    forwardRef(() => ReportsModule),
  ],
  controllers: [JobsController, AnalyzeController],
  providers: [
    JobsService,
    AiWorkerClient,
    SegmentationProcessor,
    RenderingProcessor,
    DesignCompositeProcessor,
    InpaintRenderProcessor,
    ReportsProcessor,
  ],
  exports: [JobsService, AiWorkerClient],
})
export class JobsModule {}
