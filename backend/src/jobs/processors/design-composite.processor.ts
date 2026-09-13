import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { projectImages } from '../../database/schema';
import { StorageService } from '../../storage/storage.service';
import { AiWorkerClient, DesignCompositeRegion } from '../ai-worker.client';
import { DESIGN_COMPOSITE_QUEUE } from '../jobs.constants';
import { JobsService } from '../jobs.service';

interface DesignCompositeJobData {
  jobRecordId: string;
  imageId: string;
  imageUrl: string;
  baseImageUrl?: string;
  targetRegionId?: string;
  fullRebuild?: boolean;
  regions: DesignCompositeRegion[];
}

@Processor(DESIGN_COMPOSITE_QUEUE)
export class DesignCompositeProcessor extends WorkerHost {
  private readonly logger = new Logger(DesignCompositeProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly aiWorkerClient: AiWorkerClient,
    private readonly jobsService: JobsService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<DesignCompositeJobData>) {
    const {
      jobRecordId,
      imageId,
      imageUrl,
      regions,
      baseImageUrl,
      targetRegionId,
      fullRebuild,
    } = job.data;

    await this.jobsService.updateJobRecord(jobRecordId, {
      status: 'processing',
    });

    try {
      const result = await this.aiWorkerClient.compositeDesign(
        imageUrl,
        regions,
        { baseImageUrl, targetRegionId, fullRebuild },
      );

      if (!result.previewBase64) {
        throw new Error('Design composite returned no preview');
      }

      const designStorageKey = this.storageService.buildKey(
        `projects/${imageId}`,
        'design.png',
      );

      await this.storageService.upload(
        'previews',
        designStorageKey,
        Buffer.from(result.previewBase64, 'base64'),
        'image/png',
      );

      await this.db
        .update(projectImages)
        .set({ designStorageKey })
        .where(eq(projectImages.id, imageId));

      await this.jobsService.updateJobRecord(jobRecordId, {
        status: 'completed',
        result: { designStorageKey },
      });

      return { designStorageKey };
    } catch (error) {
      this.logger.error('Design composite failed', error as Error);
      await this.jobsService.updateJobRecord(jobRecordId, {
        status: 'failed',
        error:
          error instanceof Error ? error.message : 'Design composite failed',
      });
      throw error;
    }
  }
}
