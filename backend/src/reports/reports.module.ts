import { Module, forwardRef } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { ProjectsModule } from '../projects/projects.module';
import { PdfGenerator } from './pdf.generator';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [ProjectsModule, forwardRef(() => JobsModule)],
  controllers: [ReportsController],
  providers: [ReportsService, PdfGenerator],
  exports: [ReportsService, PdfGenerator],
})
export class ReportsModule {}
