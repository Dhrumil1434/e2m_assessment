import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { buildingRegions, projectImages } from '../database/schema';
import { enrichRegion } from '../projects/project.mapper';
import { ProjectsService } from '../projects/projects.service';
import { StorageService } from '../storage/storage.service';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly projectsService: ProjectsService,
    private readonly storageService: StorageService,
  ) {}

  async findByProject(projectId: string) {
    await this.projectsService.assertExists(projectId);

    const images = await this.db.query.projectImages.findMany({
      where: eq(projectImages.projectId, projectId),
    });

    if (images.length === 0) {
      return [];
    }

    const imageIds = images.map((image) => image.id);

    const regions = await this.db.query.buildingRegions.findMany({
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

    return regions.map((region) => enrichRegion(region, this.storageService));
  }

  async update(id: string, dto: UpdateRegionDto) {
    const [updated] = await this.db
      .update(buildingRegions)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(buildingRegions.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Region ${id} not found`);
    }

    return updated;
  }

  async assertRegion(id: string) {
    const region = await this.db.query.buildingRegions.findFirst({
      where: eq(buildingRegions.id, id),
      with: {
        image: true,
      },
    });

    if (!region) {
      throw new NotFoundException(`Region ${id} not found`);
    }

    return region;
  }

  async refineSegment(
    projectId: string,
    regionId: string,
    payload: { point?: [number, number]; bbox?: number[] },
  ) {
    await this.projectsService.assertExists(projectId);
    const region = await this.assertRegion(regionId);

    if (region.image.projectId !== projectId) {
      throw new BadRequestException('Region does not belong to project');
    }

    return {
      message: 'Refine job can be enqueued via jobs module',
      regionId,
      payload,
    };
  }
}
