import type {
  AssetType,
  CelestialBodyType,
  PoiType,
  QualityTier,
} from '../../data/database.types';
import type { CelestialBody, PointOfInterest } from '../../data/types';

export type { AssetType, CelestialBodyType, PoiType, QualityTier };

export interface CmsCelestialBody extends CelestialBody {
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CmsPoi extends PointOfInterest {
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CmsAsset {
  id: string;
  bodyId: string | null;
  poiId: string | null;
  assetType: AssetType;
  qualityTier: QualityTier;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  license: string;
  attribution: string;
  version: number;
  createdAt: string;
}

export type AuditAction =
  'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'UNPUBLISH' | 'UPLOAD_ASSET';

export type AuditEntity = 'Benda Langit' | 'POI' | 'Aset';

export interface ChangeLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: AuditAction;
  entityType: AuditEntity;
  entityId: string;
  entityName: string;
  details: string;
  timestamp: string;
}

export interface AssetUploadInput {
  targetType: 'body' | 'poi';
  targetId: string;
  assetType: AssetType;
  qualityTier: QualityTier;
  license: string;
  attribution: string;
  file?: File;
  mockUrl?: string;
}
