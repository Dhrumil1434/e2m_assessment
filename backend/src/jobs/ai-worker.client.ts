import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface AnalyzeResponse {
  blurScore: number;
  width: number;
  height: number;
  passed: boolean;
}

export interface SegmentRegion {
  type: string;
  label: string;
  maskStorageKey?: string;
  maskBase64?: string;
  polygon: number[][];
  bbox: number[];
  pixelArea: number;
  confidence: number;
}

export interface SegmentResponse {
  regions: SegmentRegion[];
}

export interface RenderResponse {
  previewStorageKey?: string;
  previewBase64?: string;
}

export interface DesignCompositeRegion {
  maskUrl: string;
  textureUrl: string;
  regionId?: string;
  label?: string;
  materialName?: string;
  colorHex?: string;
}

export interface CompositeDesignOptions {
  baseImageUrl?: string;
  targetRegionId?: string;
  fullRebuild?: boolean;
}

export interface CompositeDesignResponse {
  previewBase64?: string;
}

export interface InpaintRequestPayload {
  maskUrl: string;
  textureUrl: string;
  baseImageUrl?: string;
  regions?: DesignCompositeRegion[];
  regionLabel?: string;
  materialName?: string;
  colorHex?: string;
  finish?: string;
  style?: string;
  prompt?: string;
  negativePrompt?: string;
}

export interface InpaintResponse {
  previewBase64?: string;
  generationMode?: 'ai' | 'opencv';
}

export interface AiWorkerCapabilities {
  status: string;
  stubMode: boolean;
  comfyEnabled: boolean;
  comfyReachable: boolean;
  sam2Enabled: boolean;
  lmPromptsEnabled: boolean;
}

@Injectable()
export class AiWorkerClient {
  private readonly logger = new Logger(AiWorkerClient.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.configService.getOrThrow<string>('AI_WORKER_URL'),
      timeout: 120_000,
    });
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    attempts = 3,
    label = 'request',
  ): Promise<T> {
    let lastError: unknown;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const message =
          axios.isAxiosError(error)
            ? `${error.code ?? 'ERR'}: ${error.message}`
            : error instanceof Error
              ? error.message
              : String(error);
        this.logger.warn(`AI worker ${label} attempt ${i + 1} failed: ${message}`);
        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2 ** i * 1000));
        }
      }
    }

    throw lastError;
  }

  getCapabilities() {
    return this.withRetry(
      async () => {
        const { data } = await this.client.get<AiWorkerCapabilities>('/health', {
          timeout: 3_000,
        });
        return data;
      },
      1,
      'health',
    );
  }

  analyze(imageUrl: string) {
    return this.withRetry(
      async () => {
        const { data } = await this.client.post<AnalyzeResponse>(
          '/internal/analyze',
          { imageUrl },
          { timeout: 60_000 },
        );
        return data;
      },
      2,
      'analyze',
    );
  }

  segment(imageUrl: string, labels: string[]) {
    return this.withRetry(
      async () => {
        const { data } = await this.client.post<SegmentResponse>(
          '/internal/segment',
          { imageUrl, labels },
          { timeout: 60_000 },
        );
        return data;
      },
      2,
      'segment',
    );
  }

  render(imageUrl: string, maskUrl: string, textureUrl: string) {
    return this.withRetry(async () => {
      const { data } = await this.client.post<RenderResponse>(
        '/internal/render',
        { imageUrl, maskUrl, textureUrl },
      );
      return data;
    });
  }

  compositeDesign(
    imageUrl: string,
    regions: DesignCompositeRegion[],
    options?: CompositeDesignOptions,
  ) {
    return this.withRetry(async () => {
      const { data } = await this.client.post<CompositeDesignResponse>(
        '/internal/composite-design',
        {
          imageUrl,
          regions,
          baseImageUrl: options?.baseImageUrl,
          targetRegionId: options?.targetRegionId,
          fullRebuild: options?.fullRebuild ?? false,
        },
      );
      return data;
    });
  }

  inpaint(imageUrl: string, payload: InpaintRequestPayload) {
    return this.withRetry(
      async () => {
        const { data } = await this.client.post<InpaintResponse>(
          '/internal/inpaint',
          { imageUrl, ...payload },
          { timeout: 420_000 },
        );
        return data;
      },
      2,
    );
  }

  refine(
    imageUrl: string,
    payload: { point?: [number, number]; bbox?: number[] },
  ) {
    return this.withRetry(async () => {
      const { data } = await this.client.post<SegmentResponse>(
        '/internal/refine',
        { imageUrl, ...payload },
      );
      return data;
    });
  }
}
