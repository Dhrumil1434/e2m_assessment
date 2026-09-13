import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { regionMaterialAssignments } from '../../database/schema';
import { StorageService } from '../../storage/storage.service';
import { AiWorkerClient } from '../ai-worker.client';
import { RENDERING_QUEUE } from '../jobs.constants';
import { JobsService } from '../jobs.service';

interface RenderingJobData {
  jobRecordId: string;
  assignmentId: string;
  imageUrl: string;
  maskUrl: string;
  textureUrl: string;
}

@Processor(RENDERING_QUEUE)
export class RenderingProcessor extends WorkerHost {
  private readonly logger = new Logger(RenderingProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly aiWorkerClient: AiWorkerClient,
    private readonly jobsService: JobsService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<RenderingJobData>) {
    const { jobRecordId, assignmentId, imageUrl, maskUrl, textureUrl } =
      job.data;

    await this.jobsService.updateJobRecord(jobRecordId, {
      status: 'processing',
    });

    try {
      const result = await this.aiWorkerClient.render(
        imageUrl,
        maskUrl,
        textureUrl,
      );

      let previewStorageKey = result.previewStorageKey;

      if (!previewStorageKey && result.previewBase64) {
        previewStorageKey = this.storageService.buildKey(
          `assignments/${assignmentId}`,
          'preview.png',
        );
        await this.storageService.upload(
          'previews',
          previewStorageKey,
          Buffer.from(result.previewBase64, 'base64'),
          'image/png',
        );
      }

      if (previewStorageKey) {
        await this.db
          .update(regionMaterialAssignments)
          .set({ previewStorageKey, updatedAt: new Date() })
          .where(eq(regionMaterialAssignments.id, assignmentId));
      }

      await this.jobsService.updateJobRecord(jobRecordId, {
        status: 'completed',
        result: { previewStorageKey },
      });

      return { previewStorageKey };
    } catch (error) {
      this.logger.error('Rendering failed', error as Error);
      await this.jobsService.updateJobRecord(jobRecordId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Rendering failed',
      });
      throw error;
    }
  }
}
