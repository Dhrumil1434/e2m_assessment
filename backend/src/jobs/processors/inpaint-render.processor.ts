import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { projectImages } from '../../database/schema';
import { StorageService } from '../../storage/storage.service';
import { AiWorkerClient, DesignCompositeRegion } from '../ai-worker.client';
import { INPAINT_RENDER_QUEUE } from '../jobs.constants';
import { JobsService } from '../jobs.service';

interface InpaintRenderJobData {
  jobRecordId: string;
  imageId: string;
  imageUrl: string;
  maskUrl: string;
  textureUrl: string;
  baseImageUrl?: string;
  regions?: DesignCompositeRegion[];
  regionLabel: string;
  materialName: string;
  colorHex: string | null;
}

@Processor(INPAINT_RENDER_QUEUE)
export class InpaintRenderProcessor extends WorkerHost {
  private readonly logger = new Logger(InpaintRenderProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly aiWorkerClient: AiWorkerClient,
    private readonly jobsService: JobsService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<InpaintRenderJobData>) {
    const {
      jobRecordId,
      imageId,
      imageUrl,
      maskUrl,
      textureUrl,
      baseImageUrl,
      regions,
      regionLabel,
      materialName,
      colorHex,
    } = job.data;

    await this.jobsService.updateJobRecord(jobRecordId, {
      status: 'processing',
    });

    try {
      const result = await this.aiWorkerClient.inpaint(imageUrl, {
        maskUrl,
        textureUrl,
        baseImageUrl,
        regions,
        regionLabel,
        materialName,
        colorHex: colorHex ?? undefined,
      });

      if (!result.previewBase64) {
        throw new Error('Inpaint render returned no preview');
      }

      const finalDesignStorageKey = this.storageService.buildKey(
        `projects/${imageId}`,
        'final-design.png',
      );

      await this.storageService.upload(
        'previews',
        finalDesignStorageKey,
        Buffer.from(result.previewBase64, 'base64'),
        'image/png',
      );

      await this.db
        .update(projectImages)
        .set({
          designStorageKey: finalDesignStorageKey,
          finalDesignStorageKey,
        })
        .where(eq(projectImages.id, imageId));

      await this.jobsService.updateJobRecord(jobRecordId, {
        status: 'completed',
        result: {
          designStorageKey: finalDesignStorageKey,
          finalDesignStorageKey,
          generationMode: result.generationMode ?? 'opencv',
        },
      });

      return {
        designStorageKey: finalDesignStorageKey,
        finalDesignStorageKey,
        generationMode: result.generationMode,
      };
    } catch (error) {
      this.logger.error('Inpaint render failed', error as Error);
      await this.jobsService.updateJobRecord(jobRecordId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Inpaint render failed',
      });
      throw error;
    }
  }
}
