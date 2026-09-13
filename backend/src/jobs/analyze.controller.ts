import {
  BadRequestException,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ProjectsService } from '../projects/projects.service';
import { StorageService } from '../storage/storage.service';
import { UploadService } from '../upload/upload.service';
import { JobsService } from './jobs.service';

@ApiTags('analysis')
@Controller('api/v1/projects/:projectId/images/:imageId')
export class AnalyzeController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly uploadService: UploadService,
    private readonly storageService: StorageService,
    private readonly jobsService: JobsService,
  ) {}

  @Post('analyze')
  @SkipThrottle()
  @ApiOperation({ summary: 'Enqueue segmentation job' })
  async analyze(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    await this.projectsService.assertExists(projectId);
    const image = await this.uploadService.getImage(imageId);

    if (image.projectId !== projectId) {
      throw new BadRequestException('Image does not belong to project');
    }

    const imageUrl = this.storageService.getAssetUrl(
      'originals',
      image.storageKey,
    );

    const job = await this.jobsService.enqueueSegmentation(
      projectId,
      imageId,
      imageUrl,
    );

    return {
      imageId,
      jobId: job.id,
      status: job.status,
    };
  }
}
