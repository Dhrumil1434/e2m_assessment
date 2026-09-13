import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('api/v1/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':id')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get job status' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.findOne(id);
  }
}
