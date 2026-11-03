import { create } from 'zustand';
import initialBodies from '../../data/bodies.json';
import initialPois from '../../data/pois.json';
import type { CelestialBody, PointOfInterest } from '../../data/types';
import { id } from '../../lib/i18n/id';
import { useAuthStore } from '../classes/authStore';
import type { UserProfile } from '../classes/types';
import type {
  ChangeLogEntry,
  CmsAsset,
  CmsCelestialBody,
  CmsPoi,
} from './types';
import {
  type AssetUploadFormData,
  type CelestialBodyFormData,
  type PoiFormData,
  validateAssetFile,
} from './validation';

const BODIES_KEY = 'astrosphere_cms_bodies';
const POIS_KEY = 'astrosphere_cms_pois';
const ASSETS_KEY = 'astrosphere_cms_assets';
const LOGS_KEY = 'astrosphere_cms_changelogs';

// Inisialisasi awal Benda Langit
export const INITIAL_CMS_BODIES: CmsCelestialBody[] = (
  initialBodies as unknown as CelestialBody[]
).map((b, index) => ({
  ...b,
  isPublished: true,
  sortOrder: index + 1,
  createdAt: '2026-10-30T00:00:00Z',
  updatedAt: '2026-10-30T00:00:00Z',
}));

// Inisialisasi awal POI
export const INITIAL_CMS_POIS: CmsPoi[] = (
  initialPois as unknown as PointOfInterest[]
).map((p) => ({
  ...p,
  isPublished: true,
  createdAt: '2026-10-30T00:00:00Z',
  updatedAt: '2026-10-30T00:00:00Z',
}));

// Inisialisasi awal Aset 3D
export const INITIAL_CMS_ASSETS: CmsAsset[] = [
  {
    id: 'ast-mars-tex-high',
    bodyId: 'mars',
    poiId: null,
    assetType: 'tekstur',
    qualityTier: 'tinggi',
    fileUrl: '/assets/textures/high/mars.jpg',
    fileSizeBytes: 2450000,
    mimeType: 'image/jpeg',
    license: 'Domain Publik NASA / USGS Astrogeology',
    attribution: 'NASA/JPL/USGS',
    version: 1,
    createdAt: '2026-10-30T00:00:00Z',
  },
  {
    id: 'ast-jupiter-tex-high',
    bodyId: 'jupiter',
    poiId: null,
    assetType: 'tekstur',
    qualityTier: 'tinggi',
    fileUrl: '/assets/textures/high/jupiter.jpg',
    fileSizeBytes: 3120000,
    mimeType: 'image/jpeg',
    license: 'Domain Publik NASA / Cassini Imaging Team',
    attribution: 'NASA/JPL/Space Science Institute',
    version: 1,
    createdAt: '2026-10-30T00:00:00Z',
  },
  {
    id: 'ast-olympus-terrain',
    bodyId: null,
    poiId: 'mars-olympus-mons',
    assetType: 'terrain',
    qualityTier: 'tinggi',
    fileUrl: '/assets/terrain/mars-olympus-mons.png',
    fileSizeBytes: 1840000,
    mimeType: 'image/png',
    license: 'Domain Publik NASA Mars Global Surveyor (MOLA)',
    attribution: 'NASA/GSFC/MOLA Science Team',
    version: 1,
    createdAt: '2026-10-30T00:00:00Z',
  },
];

// Inisialisasi awal Riwayat Perubahan (Audit History)
export const INITIAL_CMS_LOGS: ChangeLogEntry[] = [
  {
    id: 'log-seed-001',
    adminId: 'user-admin-demo-001',
    adminName: 'Dr. Hendra Wijaya',
    action: 'PUBLISH',
    entityType: 'Benda Langit',
    entityId: 'mars',
    entityName: 'Mars',
    details:
      'Mempublikasikan planet Mars dengan elemen orbit dan tekstur tinggi.',
    timestamp: '2026-10-30T08:00:00Z',
  },
  {
    id: 'log-seed-002',
    adminId: 'user-admin-demo-001',
    adminName: 'Dr. Hendra Wijaya',
    action: 'CREATE',
    entityType: 'POI',
    entityId: 'mars-olympus-mons',
    entityName: 'Olympus Mons',
    details:
      'Menambahkan titik geologi Olympus Mons dengan model topografi 3D.',
    timestamp: '2026-10-30T08:15:00Z',
  },
];

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function persist<T>(key: string, data: T): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

/**
 * Pengecekan otorisasi RLS: Hanya pengguna dengan peran 'admin' yang dapat menulis konten.
 */
export function checkAdminPermission(currentUser?: UserProfile | null): void {
  const user =
    currentUser !== undefined ? currentUser : useAuthStore.getState().user;
  if (!user || user.role !== 'admin') {
    throw new Error(id.cms.validation.unauthorizedWrite);
  }
}

interface CmsState {
  bodies: CmsCelestialBody[];
  pois: CmsPoi[];
  assets: CmsAsset[];
  changeLogs: ChangeLogEntry[];

  // CRUD Benda Langit
  createBody: (
    data: CelestialBodyFormData,
    currentUser?: UserProfile | null,
  ) => CmsCelestialBody;
  updateBody: (
    id: string,
    updates: Partial<CelestialBodyFormData>,
    currentUser?: UserProfile | null,
  ) => CmsCelestialBody;
  deleteBody: (id: string, currentUser?: UserProfile | null) => void;
  togglePublishBody: (
    id: string,
    currentUser?: UserProfile | null,
  ) => CmsCelestialBody;

  // CRUD Titik Minat (POI)
  createPoi: (data: PoiFormData, currentUser?: UserProfile | null) => CmsPoi;
  updatePoi: (
    id: string,
    updates: Partial<PoiFormData>,
    currentUser?: UserProfile | null,
  ) => CmsPoi;
  deletePoi: (id: string, currentUser?: UserProfile | null) => void;
  togglePublishPoi: (id: string, currentUser?: UserProfile | null) => CmsPoi;

  // Manajemen Aset & Supabase Storage
  uploadAsset: (
    metadata: AssetUploadFormData,
    file?: File | { name: string; size: number; type: string },
    currentUser?: UserProfile | null,
  ) => CmsAsset;
  deleteAsset: (id: string, currentUser?: UserProfile | null) => void;
  getNextAssetVersion: (
    targetType: 'body' | 'poi',
    targetId: string,
    assetType: string,
    qualityTier: string,
  ) => number;

  // Riwayat Perubahan
  addLog: (entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>) => ChangeLogEntry;
}

export const useCmsStore = create<CmsState>((set, get) => ({
  bodies: loadStored(BODIES_KEY, INITIAL_CMS_BODIES),
  pois: loadStored(POIS_KEY, INITIAL_CMS_POIS),
  assets: loadStored(ASSETS_KEY, INITIAL_CMS_ASSETS),
  changeLogs: loadStored(LOGS_KEY, INITIAL_CMS_LOGS),

  addLog: (entry) => {
    const newLog: ChangeLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const nextLogs = [newLog, ...get().changeLogs];
    persist(LOGS_KEY, nextLogs);
    set({ changeLogs: nextLogs });
    return newLog;
  },

  // --------------------------------------------------------------------------
  // CRUD Benda Langit
  // --------------------------------------------------------------------------
  createBody: (data, currentUser) => {
    checkAdminPermission(currentUser);
    const admin = currentUser ?? useAuthStore.getState().user!;

    const newBody: CmsCelestialBody = {
      id: data.id,
      slug: data.slug,
      name: data.name,
      type: data.type,
      parentId: data.parentId || undefined,
      diameterKm: data.diameterKm ?? null,
      massKg: data.massKg ?? null,
      rotationPeriodH: data.rotationPeriodH ?? null,
      axialTiltDeg: data.axialTiltDeg ?? null,
      semiMajorAxisAu: data.semiMajorAxisAu ?? null,
      eccentricity: data.eccentricity ?? null,
      inclinationDeg: data.inclinationDeg ?? null,
      orbitPeriodDays: data.orbitPeriodDays ?? null,
      description: data.description,
      sources: data.sources,
      textureUrls: { low: '', mid: '', high: '' },
      sortOrder: get().bodies.length + 1,
      isPublished: data.isPublished,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextBodies = [...get().bodies, newBody];
    persist(BODIES_KEY, nextBodies);
    set({ bodies: nextBodies });

    get().addLog({
      adminId: admin.id,
      adminName: admin.name,
      action: 'CREATE',
      entityType: 'Benda Langit',
      entityId: newBody.id,
      entityName: newBody.name,
      details: `Menambahkan benda langit baru tipe ${newBody.type} (Status: ${newBody.isPublished ? 'Terbit' : 'Draf'}).`,
    });

    return newBody;
  },

  updateBody: (id, updates, currentUser) => {
    checkAdminPermission(currentUser);
    const admin = currentUser ?? useAuthStore.getState().user!;

    let updatedBody: CmsCelestialBody | undefined;
    const nextBodies: CmsCelestialBody[] = get().bodies.map((b) => {
      if (b.id !== id) return b;
      const parentId =
        updates.parentId !== undefined
          ? updates.parentId || undefined
          : b.parentId;
      updatedBody = {
        ...b,
        ...updates,
        parentId,
        updatedAt: new Date().toISOString(),
      };
      return updatedBody;
    });

    if (!updatedBody) {
      throw new Error(`Benda langit dengan ID ${id} tidak ditemukan.`);
    }

    persist(BODIES_KEY, nextBodies);
    set({ bodies: nextBodies });

    const confirmedBody = updatedBody as CmsCelestialBody;
    get().addLog({
      adminId: admin.id,
      adminName: admin.name,
      action: 'UPDATE',
      entityType: 'Benda Langit',
      entityId: confirmedBody.id,
      entityName: confirmedBody.name,
      details: `Memperbarui parameter informasi benda langit ${confirmedBody.name}.`,
    });

    return confirmedBody;
  },

  deleteBody: (id, currentUser) => {
    checkAdminPermission(currentUser);
    const admin = currentUser ?? useAuthStore.getState().user!;
    const target = get().bodies.find((b) => b.id === id);

    const nextBodies = get().bodies.filter((b) => b.id !== id);
    persist(BODIES_KEY, nextBodies);
    set({ bodies: nextBodies });

    if (target) {
      get().addLog({
        adminId: admin.id,
        adminName: admin.name,
        action: 'DELETE',
        entityType: 'Benda Langit',
        entityId: target.id,
        entityName: target.name,
        details: `Menghapus benda langit ${target.name} (${target.slug}).`,
      });
    }
  },

  togglePublishBody: (id, currentUser) => {
    checkAdminPermission(currentUser);
    const admin = currentUser ?? useAuthStore.getState().user!;

    let updated: CmsCelestialBody | undefined;
    const nextBodies = get().bodies.map((b) => {
      if (b.id !== id) return b;
      updated = {
        ...b,
        isPublished: !b.isPublished,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });

    if (!updated) {
      throw new Error(`Benda langit dengan ID ${id} tidak ditemukan.`);
    }

    persist(BODIES_KEY, nextBodies);
    set({ bodies: nextBodies });

    get().addLog({
      adminId: admin.id,
      adminName: admin.name,
      action: updated.isPublished ? 'PUBLISH' : 'UNPUBLISH',
      entityType: 'Benda Langit',
      entityId: updated.id,
      entityName: updated.name,
      details: updated.isPublished
        ? `Menerbitkan benda langit ${updated.name} ke katalog publik.`
        : `Menjadikan benda langit ${updated.name} sebagai draf tertutup.`,
    });

    return updated;
  },

  // --------------------------------------------------------------------------
  // CRUD Titik Minat (POI)
  // --------------------------------------------------------------------------
  createPoi: (data, currentUser) => {
    checkAdminPermission(currentUser);
    const admin = currentUser ?? useAuthStore.getState().user!;

    const newPoi: CmsPoi = {
      id: data.id,
      bodyId: data.bodyId,
      slug: data.slug,
      name: data.name,
      type: data.type,
      lat: data.lat,
      lon: data.lon,
      historyText: data.historyText,
      dimensions: data.dimensions,
      sources: data.sources,
      isPublished: data.isPublished,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextPois = [...get().pois, newPoi];
    persist(POIS_KEY, nextPois);
    set({ pois: nextPois });

    get().addLog({
      adminId: admin.id,
      adminName: admin.name,
      action: 'CREATE',
      entityType: 'POI',
      entityId: newPoi.id,
      entityName: newPoi.name,
      details: `Menambahkan titik minat baru ${newPoi.name} pada ${newPoi.bodyId} (Lat: ${newPoi.lat}°, Lon: ${newPoi.lon}°).`,
    });

    return newPoi;
  },

  updatePoi: (id, updates, currentUser) => {
    checkAdminPermission(currentUser);
    const admin = currentUser ?? useAuthStore.getState().user!;

    let updatedPoi: CmsPoi | undefined;
    const nextPois = get().pois.map((p) => {
      if (p.id !== id) return p;
      updatedPoi = {
        ...p,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return updatedPoi;
    });

    if (!updatedPoi) {
      throw new Error(`Titik minat dengan ID ${id} tidak ditemukan.`);
    }

    persist(POIS_KEY, nextPois);
    set({ pois: nextPois });

    get().addLog({
      adminId: admin.id,
      adminName: admin.name,
      action: 'UPDATE',
      entityType: 'POI',
      entityId: updatedPoi.id,
      entityName: updatedPoi.name,
      details: `Memperbarui titik minat ${updatedPoi.name} (Koordinat: ${updatedPoi.lat}°, ${updatedPoi.lon}°).`,
    });

    return updatedPoi;
  },

  deletePoi: (id, currentUser) => {
    checkAdminPermission(currentUser);
    const admin = currentUser ?? useAuthStore.getState().user!;
    const target = get().pois.find((p) => p.id === id);

    const nextPois = get().pois.filter((p) => p.id !== id);
    persist(POIS_KEY, nextPois);
    set({ pois: nextPois });

    if (target) {
      get().addLog({
        adminId: admin.id,
        adminName: admin.name,
        action: 'DELETE',
        entityType: 'POI',
        entityId: target.id,
        entityName: target.name,
        details: `Menghapus titik minat ${target.name} (${target.slug}).`,
      });
    }
  },

  togglePublishPoi: (id, currentUser) => {
    checkAdminPermission(currentUser);
    const admin = currentUser ?? useAuthStore.getState().user!;

    let updated: CmsPoi | undefined;
    const nextPois = get().pois.map((p) => {
      if (p.id !== id) return p;
      updated = {
        ...p,
        isPublished: !p.isPublished,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });

    if (!updated) {
      throw new Error(`Titik minat dengan ID ${id} tidak ditemukan.`);
    }

    persist(POIS_KEY, nextPois);
    set({ pois: nextPois });

    get().addLog({
      adminId: admin.id,
      adminName: admin.name,
      action: updated.isPublished ? 'PUBLISH' : 'UNPUBLISH',
      entityType: 'POI',
      entityId: updated.id,
      entityName: updated.name,
      details: updated.isPublished
        ? `Menerbitkan titik minat ${updated.name} ke eksplorasi siswa.`
        : `Menjadikan titik minat ${updated.name} sebagai draf tertutup.`,
    });

    return updated;
  },

  // --------------------------------------------------------------------------
  // Manajemen Aset & Supabase Storage
  // --------------------------------------------------------------------------
  getNextAssetVersion: (targetType, targetId, assetType, qualityTier) => {
    const existing = get().assets.filter(
      (a) =>
        (targetType === 'body'
          ? a.bodyId === targetId
          : a.poiId === targetId) &&
        a.assetType === assetType &&
        a.qualityTier === qualityTier,
    );
    if (existing.length === 0) return 1;
    return Math.max(...existing.map((a) => a.version)) + 1;
  },

  uploadAsset: (metadata, file, currentUser) => {
    checkAdminPermission(currentUser);
    const admin = currentUser ?? useAuthStore.getState().user!;

    // Validasi berkas fisik jika ada
    if (file) {
      const fileValidation = validateAssetFile(file, metadata.assetType);
      if (!fileValidation.valid) {
        throw new Error(fileValidation.error);
      }
    }

    const version = get().getNextAssetVersion(
      metadata.targetType,
      metadata.targetId,
      metadata.assetType,
      metadata.qualityTier,
    );

    const bodyId = metadata.targetType === 'body' ? metadata.targetId : null;
    const poiId = metadata.targetType === 'poi' ? metadata.targetId : null;

    // Simulasi path URL Supabase Storage
    const fileName = file?.name ?? `asset-${Date.now()}`;
    const fileUrl =
      typeof file !== 'undefined' && 'type' in file && file instanceof File
        ? URL.createObjectURL(file)
        : `/storage/v1/object/public/assets/${metadata.targetId}/${metadata.assetType}-${metadata.qualityTier}-v${version}-${fileName}`;

    const newAsset: CmsAsset = {
      id: `ast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bodyId,
      poiId,
      assetType: metadata.assetType,
      qualityTier: metadata.qualityTier,
      fileUrl,
      fileSizeBytes: file?.size ?? 1024000,
      mimeType: file?.type || 'application/octet-stream',
      license: metadata.license.trim(),
      attribution: metadata.attribution.trim(),
      version,
      createdAt: new Date().toISOString(),
    };

    const nextAssets = [newAsset, ...get().assets];
    persist(ASSETS_KEY, nextAssets);
    set({ assets: nextAssets });

    get().addLog({
      adminId: admin.id,
      adminName: admin.name,
      action: 'UPLOAD_ASSET',
      entityType: 'Aset',
      entityId: newAsset.id,
      entityName: `${metadata.targetId} (${metadata.assetType})`,
      details: `Mengunggah aset ${metadata.assetType} kualitas ${metadata.qualityTier} versi v${version} (Lisensi: ${metadata.license}).`,
    });

    return newAsset;
  },

  deleteAsset: (id, currentUser) => {
    checkAdminPermission(currentUser);
    const admin = currentUser ?? useAuthStore.getState().user!;
    const target = get().assets.find((a) => a.id === id);

    const nextAssets = get().assets.filter((a) => a.id !== id);
    persist(ASSETS_KEY, nextAssets);
    set({ assets: nextAssets });

    if (target) {
      get().addLog({
        adminId: admin.id,
        adminName: admin.name,
        action: 'DELETE',
        entityType: 'Aset',
        entityId: target.id,
        entityName: `${target.assetType} (v${target.version})`,
        details: `Menghapus aset ${target.assetType} v${target.version} untuk ${target.bodyId || target.poiId}.`,
      });
    }
  },
}));
