import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { reports } from '../database/schema';
import { JobsService } from '../jobs/jobs.service';
import { ProjectsService } from '../projects/projects.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly projectsService: ProjectsService,
    private readonly jobsService: JobsService,
    private readonly storageService: StorageService,
  ) {}

  async create(projectId: string) {
    await this.projectsService.assertExists(projectId);
    const job = await this.jobsService.enqueueReport(projectId);
    return { jobId: job.id, status: job.status };
  }

  async getDownloadUrl(projectId: string, reportId: string) {
    await this.projectsService.assertExists(projectId);

    const report = await this.db.query.reports.findFirst({
      where: eq(reports.id, reportId),
    });

    if (!report || report.projectId !== projectId) {
      throw new NotFoundException('Report not found');
    }

    const downloadUrl = this.storageService.getAssetUrl(
      'reports',
      report.storageKey,
    );

    return { reportId, downloadUrl };
  }
}
