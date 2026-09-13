import { StorageService } from '../storage/storage.service';

type MaterialVariantLike = {
  textureStorageKey?: string | null;
  colorHex?: string | null;
};

type AssignmentLike = {
  previewStorageKey?: string | null;
  variant?: MaterialVariantLike | null;
};

type RegionLike = {
  maskStorageKey?: string | null;
  assignment?: AssignmentLike | null;
};

type ImageLike = {
  storageKey: string;
  designStorageKey?: string | null;
  finalDesignStorageKey?: string | null;
  regions?: RegionLike[];
};

type ReportLike = {
  storageKey: string;
};

export type ProjectLike = {
  images?: ImageLike[];
  reports?: ReportLike[];
};

export function enrichProject<T extends ProjectLike>(
  project: T,
  storageService: StorageService,
): T {
  return {
    ...project,
    images: project.images?.map((image) => ({
      ...image,
      originalUrl: storageService.getAssetUrl('originals', image.storageKey),
      designUrl: image.designStorageKey
        ? storageService.getAssetUrl('previews', image.designStorageKey)
        : null,
      finalDesignUrl: image.finalDesignStorageKey
        ? storageService.getAssetUrl('previews', image.finalDesignStorageKey)
        : null,
      regions: image.regions?.map((region) => enrichRegion(region, storageService)),
    })),
    reports: project.reports?.map((report) => ({
      ...report,
      downloadUrl: storageService.getAssetUrl('reports', report.storageKey),
    })),
  };
}

export function enrichRegion<T extends RegionLike>(
  region: T,
  storageService: StorageService,
) {
  const assignment = region.assignment
    ? {
        ...region.assignment,
        previewUrl: region.assignment.previewStorageKey
          ? storageService.getAssetUrl(
              'previews',
              region.assignment.previewStorageKey,
            )
          : null,
        variant: region.assignment.variant
          ? {
              ...region.assignment.variant,
              textureUrl: region.assignment.variant.textureStorageKey
                ? storageService.getAssetUrl(
                    'textures',
                    region.assignment.variant.textureStorageKey,
                  )
                : null,
            }
          : null,
      }
    : null;

  return {
    ...region,
    maskUrl: region.maskStorageKey
      ? storageService.getAssetUrl('masks', region.maskStorageKey)
      : null,
    assignment,
  };
}

export function enrichProjectSummary(
  project: {
    id: string;
    name: string | null;
    createdAt: Date;
    updatedAt: Date;
    images?: { storageKey: string }[];
  },
  storageService: StorageService,
) {
  const firstImage = project.images?.[0];
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    thumbnailUrl: firstImage
      ? storageService.getAssetUrl('originals', firstImage.storageKey)
      : null,
  };
}
