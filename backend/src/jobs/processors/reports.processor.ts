import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DRIZZLE } from '../../database/drizzle.module';
import type { DrizzleDB } from '../../database/drizzle.module';
import { reports } from '../../database/schema';
import { PdfGenerator } from '../../reports/pdf.generator';
import { ProjectsService } from '../../projects/projects.service';
import { StorageService } from '../../storage/storage.service';
import { REPORTS_QUEUE } from '../jobs.constants';
import { JobsService } from '../jobs.service';

interface ReportJobData {
  jobRecordId: string;
  projectId: string;
}

@Processor(REPORTS_QUEUE)
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jobsService: JobsService,
    private readonly projectsService: ProjectsService,
    private readonly pdfGenerator: PdfGenerator,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<ReportJobData>) {
    const { jobRecordId, projectId } = job.data;

    await this.jobsService.updateJobRecord(jobRecordId, {
      status: 'processing',
    });

    try {
      const project = await this.projectsService.findOne(projectId);
      const pdfBuffer = await this.pdfGenerator.generate(project);

      const storageKey = this.storageService.buildKey(
        `projects/${projectId}`,
        'report.pdf',
      );

      await this.storageService.upload(
        'reports',
        storageKey,
        pdfBuffer,
        'application/pdf',
      );

      const [report] = await this.db
        .insert(reports)
        .values({ projectId, storageKey })
        .returning();

    const downloadUrl = await this.storageService.getSignedDownloadUrl(
      'reports',
      storageKey,
    );

    // Prefer browser-safe asset proxy URL for downloads from localhost:5173
    const assetUrl = this.storageService.getAssetUrl('reports', storageKey);

    await this.jobsService.updateJobRecord(jobRecordId, {
      status: 'completed',
      result: { reportId: report.id, downloadUrl: assetUrl, signedUrl: downloadUrl },
    });

    return { reportId: report.id, downloadUrl: assetUrl };
    } catch (error) {
      this.logger.error('Report generation failed', error as Error);
      await this.jobsService.updateJobRecord(jobRecordId, {
        status: 'failed',
        error:
          error instanceof Error ? error.message : 'Report generation failed',
      });
      throw error;
    }
  }
}
