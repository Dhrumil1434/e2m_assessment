import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { jobRecords } from '../database/schema';
import {
  DESIGN_COMPOSITE_QUEUE,
  INPAINT_RENDER_QUEUE,
  RENDERING_QUEUE,
  REPORTS_QUEUE,
  SEGMENTATION_QUEUE,
} from './jobs.constants';
import type { DesignCompositeRegion } from './ai-worker.client';

@Injectable()
export class JobsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @InjectQueue(SEGMENTATION_QUEUE) private readonly segmentationQueue: Queue,
    @InjectQueue(RENDERING_QUEUE) private readonly renderingQueue: Queue,
    @InjectQueue(DESIGN_COMPOSITE_QUEUE)
    private readonly designCompositeQueue: Queue,
    @InjectQueue(INPAINT_RENDER_QUEUE)
    private readonly inpaintRenderQueue: Queue,
    @InjectQueue(REPORTS_QUEUE) private readonly reportsQueue: Queue,
  ) {}

  async createJobRecord(
    type: 'segmentation' | 'rendering' | 'refine' | 'report',
    projectId: string | null,
    payload: Record<string, unknown>,
  ) {
    const [record] = await this.db
      .insert(jobRecords)
      .values({
        type,
        projectId: projectId ?? undefined,
        payload,
        status: 'pending',
      })
      .returning();

    return record;
  }

  async updateJobRecord(
    id: string,
    data: Partial<{
      status: 'pending' | 'processing' | 'completed' | 'failed';
      bullJobId: string;
      result: Record<string, unknown>;
      error: string;
    }>,
  ) {
    const [updated] = await this.db
      .update(jobRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobRecords.id, id))
      .returning();

    return updated;
  }

  async findOne(id: string) {
    const job = await this.db.query.jobRecords.findFirst({
      where: eq(jobRecords.id, id),
    });

    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return job;
  }

  async enqueueSegmentation(
    projectId: string,
    imageId: string,
    imageUrl: string,
  ) {
    const record = await this.createJobRecord('segmentation', projectId, {
      imageId,
      imageUrl,
    });

    const bullJob = await this.segmentationQueue.add('segment', {
      jobRecordId: record.id,
      projectId,
      imageId,
      imageUrl,
    });

    await this.updateJobRecord(record.id, { bullJobId: bullJob.id });

    return record;
  }

  async enqueueRendering(
    projectId: string,
    assignmentId: string,
    imageUrl: string,
    maskUrl: string,
    textureUrl: string,
  ) {
    const record = await this.createJobRecord('rendering', projectId, {
      assignmentId,
      imageUrl,
      maskUrl,
      textureUrl,
    });

    const bullJob = await this.renderingQueue.add('render', {
      jobRecordId: record.id,
      assignmentId,
      imageUrl,
      maskUrl,
      textureUrl,
    });

    await this.updateJobRecord(record.id, { bullJobId: bullJob.id });

    return record;
  }

  async enqueueDesignComposite(
    projectId: string,
    imageId: string,
    imageUrl: string,
    regions: DesignCompositeRegion[],
    options?: {
      baseImageUrl?: string;
      targetRegionId?: string;
      fullRebuild?: boolean;
    },
  ) {
    const record = await this.createJobRecord('rendering', projectId, {
      kind: 'design-composite',
      imageId,
      imageUrl,
      regionCount: regions.length,
      targetRegionId: options?.targetRegionId,
      fullRebuild: options?.fullRebuild ?? false,
    });

    const bullJob = await this.designCompositeQueue.add('composite-design', {
      jobRecordId: record.id,
      imageId,
      imageUrl,
      regions,
      baseImageUrl: options?.baseImageUrl,
      targetRegionId: options?.targetRegionId,
      fullRebuild: options?.fullRebuild ?? false,
    });

    await this.updateJobRecord(record.id, { bullJobId: bullJob.id });

    return record;
  }

  async enqueueInpaintRender(
    projectId: string,
    imageId: string,
    imageUrl: string,
    payload: {
      maskUrl: string;
      textureUrl: string;
      regionLabel: string;
      materialName: string;
      colorHex: string | null;
      baseImageUrl?: string;
      regions?: DesignCompositeRegion[];
    },
  ) {
    const record = await this.createJobRecord('rendering', projectId, {
      kind: 'inpaint-render',
      imageId,
      imageUrl,
      regionLabel: payload.regionLabel,
    });

    const bullJob = await this.inpaintRenderQueue.add('inpaint-render', {
      jobRecordId: record.id,
      imageId,
      imageUrl,
      ...payload,
    });

    await this.updateJobRecord(record.id, { bullJobId: bullJob.id });

    return record;
  }

  async enqueueReport(projectId: string) {
    const record = await this.createJobRecord('report', projectId, { projectId });

    const bullJob = await this.reportsQueue.add('report', {
      jobRecordId: record.id,
      projectId,
    });

    await this.updateJobRecord(record.id, { bullJobId: bullJob.id });

    return record;
  }
}
