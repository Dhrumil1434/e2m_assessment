import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import {
  buildingRegions,
  measurementReferences,
  projectImages,
} from '../database/schema';
import { ProjectsService } from '../projects/projects.service';
import { RegionsService } from '../regions/regions.service';
import { CreateMeasurementDto } from './dto/create-measurement.dto';

/** Residential door leaf width (ft) used when a door region is available. */
const STANDARD_DOOR_WIDTH_FT = 3;
/** Typical bungalow facade width (ft) when no door reference exists. */
const STANDARD_FACADE_WIDTH_FT = 32;

@Injectable()
export class MeasurementService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly projectsService: ProjectsService,
    private readonly regionsService: RegionsService,
  ) {}

  async setReference(projectId: string, dto: CreateMeasurementDto) {
    await this.projectsService.assertExists(projectId);
    const region = await this.regionsService.assertRegion(dto.regionId);

    if (region.image.projectId !== projectId) {
      throw new BadRequestException('Region does not belong to project');
    }

    const scaleFtPerPx = dto.referenceWidthFt / dto.referenceWidthPx;

    const [reference] = await this.db
      .insert(measurementReferences)
      .values({
        projectId,
        regionId: dto.regionId,
        referenceWidthFt: dto.referenceWidthFt,
        referenceWidthPx: dto.referenceWidthPx,
        scaleFtPerPx,
      })
      .returning();

    return reference;
  }

  /**
   * One-click calibration: derive ft/px from a door or facade bbox using
   * residential reference sizes, then write areaSqFt for all measurable regions.
   */
  async autoEstimate(projectId: string) {
    await this.projectsService.assertExists(projectId);

    const { regions, primaryImageId } =
      await this.loadProjectRegions(projectId);

    if (regions.length === 0) {
      throw new BadRequestException(
        'No detected surfaces found. Run analysis in Studio first.',
      );
    }

    const calibration = this.buildAutoCalibration(regions);
    if (!calibration) {
      throw new BadRequestException(
        'Could not derive a scale from detected surfaces. Set a manual reference.',
      );
    }

    const [reference] = await this.db
      .insert(measurementReferences)
      .values({
        projectId,
        regionId: calibration.regionId,
        referenceWidthFt: calibration.referenceWidthFt,
        referenceWidthPx: calibration.referenceWidthPx,
        scaleFtPerPx: calibration.scaleFtPerPx,
      })
      .returning();

    const updated = await this.applyScaleToRegions(
      regions,
      calibration.scaleFtPerPx,
      { autoConfirm: true },
    );

    return {
      scaleFtPerPx: calibration.scaleFtPerPx,
      reference,
      calibrationMethod: calibration.method,
      referenceLabel: calibration.label,
      primaryImageId,
      regions: updated,
    };
  }

  async estimateAreas(projectId: string) {
    await this.projectsService.assertExists(projectId);

    const [reference] = await this.db
      .select()
      .from(measurementReferences)
      .where(eq(measurementReferences.projectId, projectId))
      .orderBy(desc(measurementReferences.createdAt))
      .limit(1);

    if (!reference) {
      return this.autoEstimate(projectId);
    }

    const { regions } = await this.loadProjectRegions(projectId);
    const updated = await this.applyScaleToRegions(
      regions,
      reference.scaleFtPerPx,
      { autoConfirm: true },
    );

    return {
      scaleFtPerPx: reference.scaleFtPerPx,
      regions: updated,
    };
  }

  private async loadProjectRegions(projectId: string) {
    const images = await this.db.query.projectImages.findMany({
      where: eq(projectImages.projectId, projectId),
    });
    const imageIds = images.map((image) => image.id);

    if (imageIds.length === 0) {
      return { regions: [], primaryImageId: null as string | null };
    }

    const regions = await this.db.query.buildingRegions.findMany({
      where: inArray(buildingRegions.projectImageId, imageIds),
      with: { assignment: true },
    });

    // Prefer the newest image that still has detected surfaces (studio active image).
    const sortedImages = [...images].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    let primaryImageId: string | null = null;
    for (const image of sortedImages) {
      if (regions.some((region) => region.projectImageId === image.id)) {
        primaryImageId = image.id;
        break;
      }
    }

    if (!primaryImageId) {
      primaryImageId = sortedImages[0]?.id ?? null;
    }

    const scoped = primaryImageId
      ? regions.filter((region) => region.projectImageId === primaryImageId)
      : regions;

    return { regions: scoped, primaryImageId };
  }

  private buildAutoCalibration(
    regions: Array<{
      id: string;
      type: string;
      label: string;
      bboxJson: number[] | null;
      polygonJson: number[][] | null;
      pixelArea: number | null;
    }>,
  ) {
    const withWidth = regions
      .map((region) => {
        const widthPx = this.regionWidthPx(region);
        return widthPx && widthPx > 8
          ? { region, widthPx }
          : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (withWidth.length === 0) {
      return null;
    }

    const door = withWidth.find(
      (entry) =>
        entry.region.type === 'door' ||
        entry.region.label.toLowerCase().includes('door'),
    );

    if (door) {
      const scaleFtPerPx = STANDARD_DOOR_WIDTH_FT / door.widthPx;
      return {
        regionId: door.region.id,
        label: door.region.label,
        method: 'standard_door' as const,
        referenceWidthFt: STANDARD_DOOR_WIDTH_FT,
        referenceWidthPx: door.widthPx,
        scaleFtPerPx,
      };
    }

    const facade = [...withWidth].sort((a, b) => b.widthPx - a.widthPx)[0];
    const scaleFtPerPx = STANDARD_FACADE_WIDTH_FT / facade.widthPx;

    return {
      regionId: facade.region.id,
      label: facade.region.label,
      method: 'standard_facade' as const,
      referenceWidthFt: STANDARD_FACADE_WIDTH_FT,
      referenceWidthPx: facade.widthPx,
      scaleFtPerPx,
    };
  }

  private regionWidthPx(region: {
    bboxJson: number[] | null;
    polygonJson: number[][] | null;
  }): number | null {
    const bbox = region.bboxJson;
    if (Array.isArray(bbox) && bbox.length >= 4) {
      const x1 = Number(bbox[0]);
      const x2 = Number(bbox[2]);
      if (Number.isFinite(x1) && Number.isFinite(x2)) {
        return Math.abs(x2 - x1);
      }
    }

    if (region.polygonJson?.length) {
      const xs = region.polygonJson.map(([x]) => x);
      return Math.max(...xs) - Math.min(...xs);
    }

    return null;
  }

  private async applyScaleToRegions(
    regions: Array<{
      id: string;
      label: string;
      pixelArea: number | null;
      status: string;
      polygonJson: number[][] | null;
      bboxJson: number[] | null;
    }>,
    scaleFtPerPx: number,
    options: { autoConfirm: boolean },
  ) {
    const updated = [];

    for (const region of regions) {
      const pixelArea =
        region.pixelArea && region.pixelArea > 0
          ? region.pixelArea
          : this.estimatePixelArea(region);

      if (!pixelArea || pixelArea <= 0) {
        continue;
      }

      const areaSqFt = pixelArea * scaleFtPerPx * scaleFtPerPx;
      const nextStatus =
        options.autoConfirm && region.status !== 'confirmed'
          ? 'confirmed'
          : region.status;

      const [saved] = await this.db
        .update(buildingRegions)
        .set({
          pixelArea,
          areaSqFt,
          status: nextStatus as 'proposed' | 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(buildingRegions.id, region.id))
        .returning();

      updated.push({
        ...saved,
        confidence: 'medium' as const,
      });
    }

    return updated;
  }

  private estimatePixelArea(region: {
    bboxJson: number[] | null;
    polygonJson: number[][] | null;
  }): number | null {
    const bbox = region.bboxJson;
    if (Array.isArray(bbox) && bbox.length >= 4) {
      const x1 = Number(bbox[0]);
      const y1 = Number(bbox[1]);
      const x2 = Number(bbox[2]);
      const y2 = Number(bbox[3]);
      if ([x1, y1, x2, y2].every((value) => Number.isFinite(value))) {
        return Math.abs(x2 - x1) * Math.abs(y2 - y1);
      }
    }

    if (region.polygonJson && region.polygonJson.length >= 3) {
      let area = 0;
      const pts = region.polygonJson;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        area += x1 * y2 - x2 * y1;
      }
      return Math.abs(area) / 2;
    }

    return null;
  }
}
