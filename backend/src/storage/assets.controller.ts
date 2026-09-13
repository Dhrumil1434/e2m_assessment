import {
  Controller,
  Get,
  NotFoundException,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import { StorageService, type StorageBucket } from './storage.service';

const BUCKET_TYPES = new Set<StorageBucket>([
  'originals',
  'masks',
  'textures',
  'previews',
  'reports',
]);

function parseAssetPath(path: string): { bucketType: StorageBucket; key: string } {
  const prefix = '/api/v1/assets/';
  const index = path.indexOf(prefix);
  const assetPath = index >= 0 ? path.slice(index + prefix.length) : path;
  const slashIndex = assetPath.indexOf('/');

  if (slashIndex <= 0) {
    throw new NotFoundException('Asset path is invalid');
  }

  const bucketType = assetPath.slice(0, slashIndex) as StorageBucket;
  const key = decodeURIComponent(assetPath.slice(slashIndex + 1));

  if (!BUCKET_TYPES.has(bucketType) || !key) {
    throw new NotFoundException('Asset path is invalid');
  }

  return { bucketType, key };
}

@ApiTags('assets')
@Controller('api/v1/assets')
export class AssetsController {
  constructor(private readonly storageService: StorageService) {}

  @Get('*path')
  @ApiOperation({ summary: 'Stream a stored asset through the API' })
  async streamAsset(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { bucketType, key } = parseAssetPath(req.path);

    try {
      const object = await this.storageService.getObject(bucketType, key);

      if (!object.Body) {
        throw new NotFoundException('Asset not found');
      }

      res.set({
        'Content-Type': object.ContentType ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      });

      const stream = object.Body as Readable;
      stream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Asset not found');
    }
  }
}
