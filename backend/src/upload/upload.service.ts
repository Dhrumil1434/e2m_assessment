import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { DRIZZLE } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.module';
import { projectImages } from '../database/schema';
import { ProjectsService } from '../projects/projects.service';
import { StorageService } from '../storage/storage.service';

const MIN_LONGEST_SIDE = 1024;
const BLUR_THRESHOLD = 100;

@Injectable()
export class UploadService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly storageService: StorageService,
    private readonly projectsService: ProjectsService,
  ) {}

  async uploadImage(projectId: string, file: Express.Multer.File) {
    await this.projectsService.assertExists(projectId);

    if (!file?.buffer) {
      throw new BadRequestException('Image file is required');
    }

    const metadata = await sharp(file.buffer).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const longestSide = Math.max(width, height);

    const gray = await sharp(file.buffer).grayscale().raw().toBuffer({
      resolveWithObject: true,
    });
    const blurScore = this.calculateBlurScore(gray.data, width, height);
    const minResolution = longestSide >= MIN_LONGEST_SIDE;
    const passed = blurScore >= BLUR_THRESHOLD && minResolution;

    const storageKey = this.storageService.buildKey(
      `projects/${projectId}`,
      file.originalname,
    );

    await this.storageService.upload(
      'originals',
      storageKey,
      file.buffer,
      file.mimetype,
    );

    const [image] = await this.db
      .insert(projectImages)
      .values({
        projectId,
        storageKey,
        width,
        height,
        blurScore,
        qualityStatus: passed ? 'pass' : 'fail',
      })
      .returning();

    return {
      imageId: image.id,
      quality: {
        passed,
        blurScore,
        minResolution,
      },
    };
  }

  private calculateBlurScore(
    pixels: Buffer,
    width: number,
    height: number,
  ): number {
    if (width < 3 || height < 3) {
      return 0;
    }

    let sum = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const laplacian =
          -4 * pixels[idx] +
          pixels[idx - 1] +
          pixels[idx + 1] +
          pixels[idx - width] +
          pixels[idx + width];
        sum += laplacian * laplacian;
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  async getImage(imageId: string) {
    const image = await this.db.query.projectImages.findFirst({
      where: eq(projectImages.id, imageId),
    });

    if (!image) {
      throw new BadRequestException(`Image ${imageId} not found`);
    }

    return image;
  }
}
