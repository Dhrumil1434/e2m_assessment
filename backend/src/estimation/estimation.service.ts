import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { CostEngine } from '../costing/cost.engine';
import { DRIZZLE } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import {
  buildingRegions,
  costEstimations,
  measurementReferences,
  projectImages,
  quantityEstimations,
} from '../database/schema';
import { MeasurementService } from '../measurement/measurement.service';
import { ProjectsService } from '../projects/projects.service';
import { QuantityEngine } from './quantity.engine';

@Injectable()
export class EstimationService {
  private readonly quantityEngine = new QuantityEngine();
  private readonly costEngine = new CostEngine();

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly projectsService: ProjectsService,
    private readonly measurementService: MeasurementService,
  ) {}

  async estimateQuantities(projectId: string) {
    await this.projectsService.assertExists(projectId);

    let regions = await this.loadAssignedRegions(projectId);
    const missingAreas = regions.some((region) => !region.areaSqFt);

    if (missingAreas || regions.length === 0) {
      await this.measurementService.autoEstimate(projectId);
      regions = await this.loadAssignedRegions(projectId);
    }

    const scaleFtPerPx = await this.getScaleFtPerPx(projectId);

    await this.db
      .delete(quantityEstimations)
      .where(eq(quantityEstimations.projectId, projectId));

    const results = [];

    for (const region of regions) {
      if (!region.areaSqFt || !region.assignment?.variant?.material) {
        continue;
      }

      const material = region.assignment.variant.material;
      const lengthFt = this.estimateLengthFt(region.polygonJson, scaleFtPerPx);

      const quantity = this.quantityEngine.calculate({
        areaSqFt: region.areaSqFt,
        lengthFt,
        material,
      });

      const [saved] = await this.db
        .insert(quantityEstimations)
        .values({
          projectId,
          materialId: material.id,
          regionId: region.id,
          areaSqFt: region.areaSqFt,
          baseQuantity: quantity.baseQuantity,
          wastageQuantity: quantity.wastageQuantity,
          finalQuantity: quantity.finalQuantity,
          unit: quantity.unit,
        })
        .returning();

      results.push(saved);
    }

    if (results.length === 0) {
      throw new BadRequestException(
        'Assign materials to surfaces in Studio, then calculate estimate again.',
      );
    }

    return results;
  }

  async estimateCost(projectId: string) {
    await this.projectsService.assertExists(projectId);

    let quantities = await this.db.query.quantityEstimations.findMany({
      where: eq(quantityEstimations.projectId, projectId),
      with: {
        material: true,
        region: true,
      },
    });

    if (quantities.length === 0) {
      await this.estimateQuantities(projectId);
      quantities = await this.db.query.quantityEstimations.findMany({
        where: eq(quantityEstimations.projectId, projectId),
        with: {
          material: true,
          region: true,
        },
      });
    }

    if (quantities.length === 0) {
      throw new BadRequestException('Run quantity estimation first');
    }

    const scaleFtPerPx = await this.getScaleFtPerPx(projectId);

    const lineItems = quantities.map((entry) => {
      const lengthFt = this.estimateLengthFt(
        entry.region.polygonJson,
        scaleFtPerPx,
      );

      return this.costEngine.calculateLine({
        materialName: entry.material.name,
        regionLabel: entry.region.label,
        calculationType: entry.material.calculationType,
        finalQuantity: entry.finalQuantity,
        areaSqFt: entry.areaSqFt,
        lengthFt,
        unit: entry.unit,
        materialRate: entry.material.materialRate,
        laborRate: entry.material.laborRate,
        laborUnit: entry.material.laborUnit,
      });
    });

    const summary = this.costEngine.summarize(lineItems);

    await this.db
      .delete(costEstimations)
      .where(eq(costEstimations.projectId, projectId));

    const [saved] = await this.db
      .insert(costEstimations)
      .values({
        projectId,
        lineItems: summary.lineItems,
        materialTotal: summary.materialTotal,
        laborTotal: summary.laborTotal,
        contingency: summary.contingency,
        grandTotal: summary.grandTotal,
        rangeLow: summary.rangeLow,
        rangeHigh: summary.rangeHigh,
      })
      .returning();

    return saved;
  }

  private async loadAssignedRegions(projectId: string) {
    const images = await this.db.query.projectImages.findMany({
      where: eq(projectImages.projectId, projectId),
    });
    const imageIds = images.map((image) => image.id);
    if (imageIds.length === 0) return [];

    return this.db.query.buildingRegions.findMany({
      where: inArray(buildingRegions.projectImageId, imageIds),
      with: {
        assignment: {
          with: {
            variant: {
              with: { material: true },
            },
          },
        },
      },
    });
  }

  private async getScaleFtPerPx(projectId: string): Promise<number> {
    const [reference] = await this.db
      .select()
      .from(measurementReferences)
      .where(eq(measurementReferences.projectId, projectId))
      .orderBy(desc(measurementReferences.createdAt))
      .limit(1);

    return reference?.scaleFtPerPx ?? 0.01;
  }

  private estimateLengthFt(
    polygon: number[][] | null | undefined,
    scaleFtPerPx: number,
  ) {
    if (!polygon || polygon.length < 2) {
      return 0;
    }

    let perimeterPx = 0;
    for (let i = 0; i < polygon.length; i++) {
      const [x1, y1] = polygon[i];
      const [x2, y2] = polygon[(i + 1) % polygon.length];
      perimeterPx += Math.hypot(x2 - x1, y2 - y1);
    }

    // For railings/linear items use the longer edge approximation (half perimeter)
    const lengthPx = perimeterPx / 2;
    return lengthPx * scaleFtPerPx;
  }
}
