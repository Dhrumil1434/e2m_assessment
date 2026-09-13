import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsInt()
  @Min(1)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  REDIS_PORT: number = 6379;

  @IsString()
  @IsNotEmpty()
  MINIO_ENDPOINT: string = 'localhost';

  @IsInt()
  @Min(1)
  MINIO_PORT: number = 9000;

  @IsString()
  @IsNotEmpty()
  MINIO_ACCESS_KEY: string;

  @IsString()
  @IsNotEmpty()
  MINIO_SECRET_KEY: string;

  @IsString()
  @IsNotEmpty()
  MINIO_BUCKET_ORIGINALS: string = 'originals';

  @IsString()
  @IsNotEmpty()
  MINIO_BUCKET_MASKS: string = 'masks';

  @IsString()
  @IsNotEmpty()
  MINIO_BUCKET_TEXTURES: string = 'textures';

  @IsString()
  @IsNotEmpty()
  MINIO_BUCKET_PREVIEWS: string = 'previews';

  @IsString()
  @IsNotEmpty()
  MINIO_BUCKET_REPORTS: string = 'reports';

  @IsUrl({ require_tld: false })
  AI_WORKER_URL: string = 'http://localhost:8000';

  @IsInt()
  @Min(1)
  THROTTLE_TTL: number = 60;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 60;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string = 'http://localhost:5173';

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string = 'http://localhost:5173';

  @IsOptional()
  @IsString()
  API_PUBLIC_URL?: string = 'http://localhost:3000';
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validated;
}
