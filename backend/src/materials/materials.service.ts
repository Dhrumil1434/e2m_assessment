import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import {
  buildingRegions,
  materialVariants,
  projectImages,
  regionMaterialAssignments,
} from '../database/schema';
import { AiWorkerClient, type DesignCompositeRegion } from '../jobs/ai-worker.client';
import { JobsService } from '../jobs/jobs.service';
import { RegionsService } from '../regions/regions.service';
import { StorageService } from '../storage/storage.service';
import { AssignMaterialDto } from './dto/assign-material.dto';

@Injectable()
export class MaterialsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly regionsService: RegionsService,
    private readonly jobsService: JobsService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    private readonly aiWorkerClient: AiWorkerClient,
  ) {}

  private async canUseAiGeneration(): Promise<boolean> {
    if (this.configService.get<string>('AI_WORKER_USE_COMFY', 'false') !== 'true') {
      return false;
    }

    try {
      const capabilities = await this.aiWorkerClient.getCapabilities();
      return capabilities.comfyReachable;
    } catch {
      return false;
    }
  }

  async findAll() {
    const catalog = await this.db.query.materials.findMany({
      with: { variants: true },
    });

    return catalog.map((material) => ({
      ...material,
      variants: material.variants.map((variant) => ({
        ...variant,
        textureUrl: variant.textureStorageKey
          ? this.storageService.getAssetUrl('textures', variant.textureStorageKey)
          : null,
      })),
    }));
  }

  async assignToRegion(regionId: string, dto: AssignMaterialDto) {
    const region = await this.regionsService.assertRegion(regionId);

    const variant = await this.db.query.materialVariants.findFirst({
      where: eq(materialVariants.id, dto.materialVariantId),
      with: { material: true },
    });

    if (!variant) {
      throw new NotFoundException('Material variant not found');
    }

    const existing = await this.db.query.regionMaterialAssignments.findFirst({
      where: eq(regionMaterialAssignments.regionId, regionId),
    });

    if (existing) {
      const [updated] = await this.db
        .update(regionMaterialAssignments)
        .set({
          materialVariantId: dto.materialVariantId,
          updatedAt: new Date(),
        })
        .where(eq(regionMaterialAssignments.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(regionMaterialAssignments)
      .values({
        regionId,
        materialVariantId: dto.materialVariantId,
      })
      .returning();

    return created;
  }

  async clearAssignment(regionId: string) {
    await this.regionsService.assertRegion(regionId);

    await this.db
      .delete(regionMaterialAssignments)
      .where(eq(regionMaterialAssignments.regionId, regionId));
  }

  async rebuildDesign(imageId: string) {
    const image = await this.db.query.projectImages.findFirst({
      where: eq(projectImages.id, imageId),
      with: { project: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const compositeRegions = await this.buildCompositeRegions(imageId);

    if (compositeRegions.length === 0) {
      await this.clearDesignKeys(imageId);
      return { jobId: null, status: 'completed' as const };
    }

    await this.clearFinalDesignKey(imageId);

    const imageUrl = this.storageService.getAssetUrl(
      'originals',
      image.storageKey,
    );

    const job = await this.jobsService.enqueueDesignComposite(
      image.projectId,
      imageId,
      imageUrl,
      compositeRegions,
      { fullRebuild: true },
    );

    return { jobId: job.id, status: job.status };
  }

  async enqueuePreview(regionId: string) {
    const region = await this.regionsService.assertRegion(regionId);

    const assignment = await this.db.query.regionMaterialAssignments.findFirst({
      where: eq(regionMaterialAssignments.regionId, regionId),
      with: {
        variant: {
          with: { material: true },
        },
      },
    });

    if (!assignment) {
      throw new BadRequestException('Assign a material before preview');
    }

    const imageId = region.projectImageId;
    const projectId = region.image.projectId;

    await this.clearFinalDesignKey(imageId);

    const imageUrl = this.storageService.getAssetUrl(
      'originals',
      region.image.storageKey,
    );

    const compositeRegions = await this.buildCompositeRegions(imageId);

    if (compositeRegions.length === 0) {
      throw new BadRequestException('No assigned regions with masks for preview');
    }

    const targetRegion = compositeRegions.find(
      (entry) => entry.regionId === regionId,
    );

    if (!targetRegion?.maskUrl) {
      throw new BadRequestException('Selected region has no mask');
    }

    const useAiGeneration = await this.canUseAiGeneration();
    const generatePayload = {
      maskUrl: targetRegion.maskUrl,
      textureUrl: targetRegion.textureUrl,
      regions: compositeRegions,
      regionLabel: region.label,
      materialName: assignment.variant.name,
      colorHex: assignment.variant.colorHex,
    };

    if (useAiGeneration) {
      const fastJob = await this.jobsService.enqueueDesignComposite(
        projectId,
        imageId,
        imageUrl,
        compositeRegions,
        { fullRebuild: true },
      );

      const generateJob = await this.jobsService.enqueueInpaintRender(
        projectId,
        imageId,
        imageUrl,
        generatePayload,
      );

      return {
        jobId: fastJob.id,
        finalJobId: generateJob.id,
        generationMode: 'ai' as const,
        status: fastJob.status,
      };
    }

    const generateJob = await this.jobsService.enqueueInpaintRender(
      projectId,
      imageId,
      imageUrl,
      generatePayload,
    );

    return {
      jobId: generateJob.id,
      finalJobId: null,
      generationMode: 'opencv' as const,
      status: generateJob.status,
    };
  }

  private async clearFinalDesignKey(imageId: string) {
    await this.db
      .update(projectImages)
      .set({ finalDesignStorageKey: null })
      .where(eq(projectImages.id, imageId));
  }

  private async clearDesignKeys(imageId: string) {
    await this.db
      .update(projectImages)
      .set({ designStorageKey: null, finalDesignStorageKey: null })
      .where(eq(projectImages.id, imageId));
  }

  private async buildCompositeRegions(
    imageId: string,
  ): Promise<DesignCompositeRegion[]> {
    const assignedRegions = await this.db.query.buildingRegions.findMany({
      where: eq(buildingRegions.projectImageId, imageId),
      with: {
        assignment: {
          with: { variant: { with: { material: true } } },
        },
      },
    });

    const compositeRegions: DesignCompositeRegion[] = [];

    for (const assignedRegion of assignedRegions) {
      if (!assignedRegion.assignment || !assignedRegion.maskStorageKey) {
        continue;
      }

      const maskUrl = this.storageService.getAssetUrl(
        'masks',
        assignedRegion.maskStorageKey,
      );

      const textureKey =
        assignedRegion.assignment.variant.textureStorageKey ??
        `fallback/${assignedRegion.assignment.variant.colorHex ?? 'default'}.png`;
      const textureUrl = assignedRegion.assignment.variant.textureStorageKey
        ? this.storageService.getAssetUrl('textures', textureKey)
        : textureKey;

      compositeRegions.push({
        maskUrl,
        textureUrl,
        regionId: assignedRegion.id,
        label: assignedRegion.label,
        materialName: assignedRegion.assignment.variant.name,
        colorHex: assignedRegion.assignment.variant.colorHex ?? undefined,
      });
    }

    return compositeRegions;
  }
}
