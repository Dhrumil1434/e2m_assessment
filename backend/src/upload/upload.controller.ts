import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UploadService } from './upload.service';

@ApiTags('upload')
@Controller('api/v1/projects/:projectId/images')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @ApiOperation({ summary: 'Upload house image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  upload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadService.uploadImage(projectId, file);
  }
}
