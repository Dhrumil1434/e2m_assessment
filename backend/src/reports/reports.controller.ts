import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('api/v1/projects/:projectId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Generate PDF report' })
  create(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.reportsService.create(projectId);
  }

  @Get(':reportId')
  @ApiOperation({ summary: 'Get report download URL' })
  getDownloadUrl(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ) {
    return this.reportsService.getDownloadUrl(projectId, reportId);
  }
}
