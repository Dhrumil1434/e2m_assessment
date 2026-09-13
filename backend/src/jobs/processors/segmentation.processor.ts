import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DRIZZLE } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { eq } from 'drizzle-orm';
import { buildingRegions, projectImages } from '../../database/schema';
import { StorageService } from '../../storage/storage.service';
import { AiWorkerClient } from '../ai-worker.client';
import { DEFAULT_SEGMENT_LABELS, SEGMENTATION_QUEUE } from '../jobs.constants';
import { JobsService } from '../jobs.service';

interface SegmentationJobData {
  jobRecordId: string;
  projectId: string;
  imageId: string;
  imageUrl: string;
}

@Processor(SEGMENTATION_QUEUE, {
  concurrency: 2,
  lockDuration: 120_000,
})
export class SegmentationProcessor extends WorkerHost {
  private readonly logger = new Logger(SegmentationProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly aiWorkerClient: AiWorkerClient,
    private readonly jobsService: JobsService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<SegmentationJobData>) {
    const { jobRecordId, imageId, imageUrl } = job.data;

    await this.jobsService.updateJobRecord(jobRecordId, {
      status: 'processing',
    });

    try {
      await this.db
        .delete(buildingRegions)
        .where(eq(buildingRegions.projectImageId, imageId));

      // Stale renovation composites no longer match new surfaces.
      await this.db
        .update(projectImages)
        .set({
          designStorageKey: null,
          finalDesignStorageKey: null,
        })
        .where(eq(projectImages.id, imageId));

      const result = await this.aiWorkerClient.segment(
        imageUrl,
        DEFAULT_SEGMENT_LABELS,
      );

      const createdRegions = [];

      for (const region of result.regions) {
        let maskStorageKey = region.maskStorageKey;

        if (!maskStorageKey && region.maskBase64) {
          maskStorageKey = this.storageService.buildKey(
            `images/${imageId}/masks`,
            `${region.type}.png`,
          );
          await this.storageService.upload(
            'masks',
            maskStorageKey,
            Buffer.from(region.maskBase64, 'base64'),
            'image/png',
          );
        }

        const [inserted] = await this.db
          .insert(buildingRegions)
          .values({
            projectImageId: imageId,
            type: region.type as any,
            label: region.label,
            maskStorageKey,
            polygonJson: region.polygon,
            bboxJson: region.bbox,
            pixelArea: region.pixelArea,
            confidence: region.confidence,
            status: 'proposed',
          })
          .returning();

        createdRegions.push(inserted);
      }

      await this.jobsService.updateJobRecord(jobRecordId, {
        status: 'completed',
        result: { regions: createdRegions },
      });

      return { regions: createdRegions };
    } catch (error) {
      this.logger.error('Segmentation failed', error as Error);
      await this.jobsService.updateJobRecord(jobRecordId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Segmentation failed',
      });
      throw error;
    }
  }
}
