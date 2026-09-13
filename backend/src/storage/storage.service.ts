import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export type StorageBucket =
  | 'originals'
  | 'masks'
  | 'textures'
  | 'previews'
  | 'reports';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly client: S3Client;
  private readonly buckets: Record<StorageBucket, string>;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.getOrThrow<string>('MINIO_ENDPOINT');
    const port = this.configService.getOrThrow<number>('MINIO_PORT');

    this.client = new S3Client({
      region: 'us-east-1',
      endpoint: `http://${endpoint}:${port}`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'MINIO_SECRET_KEY',
        ),
      },
    });

    this.buckets = {
      originals: this.configService.getOrThrow('MINIO_BUCKET_ORIGINALS'),
      masks: this.configService.getOrThrow('MINIO_BUCKET_MASKS'),
      textures: this.configService.getOrThrow('MINIO_BUCKET_TEXTURES'),
      previews: this.configService.getOrThrow('MINIO_BUCKET_PREVIEWS'),
      reports: this.configService.getOrThrow('MINIO_BUCKET_REPORTS'),
    };
  }

  async onModuleInit() {
    for (const bucket of Object.values(this.buckets)) {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch {
        await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
      }
    }
  }

  getBucketName(type: StorageBucket): string {
    return this.buckets[type];
  }

  buildKey(prefix: string, filename?: string): string {
    const safeName = filename?.replace(/[^a-zA-Z0-9._-]/g, '_') ?? 'file';
    return `${prefix}/${randomUUID()}-${safeName}`;
  }

  async upload(
    bucketType: StorageBucket,
    key: string,
    body: Buffer,
    contentType: string,
  ) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.buckets[bucketType],
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async getObject(bucketType: StorageBucket, key: string) {
    return this.client.send(
      new GetObjectCommand({
        Bucket: this.buckets[bucketType],
        Key: key,
      }),
    );
  }

  async getSignedDownloadUrl(
    bucketType: StorageBucket,
    key: string,
    expiresIn = 3600,
  ) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.buckets[bucketType],
        Key: key,
      }),
      { expiresIn },
    );
  }

  /** Internal URL for ai-worker / backend services (MinIO direct). */
  getPublicUrl(bucketType: StorageBucket, key: string): string {
    const endpoint = this.configService.getOrThrow<string>('MINIO_ENDPOINT');
    const port = this.configService.getOrThrow<number>('MINIO_PORT');
    return `http://${endpoint}:${port}/${this.buckets[bucketType]}/${key}`;
  }

  /** Browser-safe URL proxied through NestJS (avoids private MinIO 403). */
  getAssetUrl(bucketType: StorageBucket, key: string): string {
    const base =
      this.configService.get<string>('API_PUBLIC_URL') ??
      `http://localhost:${this.configService.get<number>('PORT') ?? 3000}`;
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `${base}/api/v1/assets/${bucketType}/${encodedKey}`;
  }
}
