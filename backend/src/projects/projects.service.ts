import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { projects } from '../database/schema';
import { StorageService } from '../storage/storage.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { enrichProject, enrichProjectSummary } from './project.mapper';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly storageService: StorageService,
  ) {}

  async create(dto: CreateProjectDto) {
    const [project] = await this.db
      .insert(projects)
      .values({ name: dto.name ?? 'Untitled Project' })
      .returning();
    return project;
  }

  async findAll() {
    const rows = await this.db.query.projects.findMany({
      orderBy: desc(projects.createdAt),
      with: {
        images: {
          limit: 1,
        },
      },
    });

    return rows.map((project) =>
      enrichProjectSummary(project, this.storageService),
    );
  }

  async findOne(id: string) {
    const project = await this.db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        images: {
          with: {
            regions: {
              with: {
                assignment: {
                  with: {
                    variant: {
                      with: { material: true },
                    },
                  },
                },
              },
            },
          },
        },
        measurementReferences: true,
        quantityEstimations: true,
        costEstimations: true,
        reports: true,
        jobs: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return enrichProject(project, this.storageService);
  }

  async remove(id: string) {
    const [deleted] = await this.db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return { deleted: true };
  }

  async assertExists(id: string) {
    const project = await this.db.query.projects.findFirst({
      where: eq(projects.id, id),
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }
}
