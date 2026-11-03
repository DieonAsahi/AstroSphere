import { z } from 'zod';
import { id } from '../../lib/i18n/id';
import type { AssetType } from './types';

const messages = id.cms.validation;

/**
 * Skema validasi Zod untuk Benda Langit (Celestial Body).
 * Menjamin integritas numerik dan mewajibkan minimal satu sumber data ilmiah.
 */
export const celestialBodySchema = z.object({
  id: z
    .string()
    .min(2, messages.slugRequired)
    .regex(/^[a-z0-9-]+$/, messages.slugRequired),
  slug: z
    .string()
    .min(2, messages.slugRequired)
    .regex(/^[a-z0-9-]+$/, messages.slugRequired),
  name: z.string().min(2, messages.nameRequired),
  type: z.enum(['star', 'planet', 'dwarf_planet', 'moon']),
  parentId: z.string().optional().nullable(),
  diameterKm: z.number().positive().nullable().optional(),
  massKg: z.number().positive().nullable().optional(),
  rotationPeriodH: z.number().nullable().optional(),
  axialTiltDeg: z.number().min(-360).max(360).nullable().optional(),
  semiMajorAxisAu: z.number().positive().nullable().optional(),
  eccentricity: z.number().min(0).max(1).nullable().optional(),
  inclinationDeg: z.number().nullable().optional(),
  orbitPeriodDays: z.number().positive().nullable().optional(),
  description: z.string().min(10, 'Deskripsi edukasi minimal 10 karakter.'),
  sources: z
    .array(z.string().trim())
    .refine(
      (arr) => arr.filter((s) => s.length > 0).length >= 1,
      messages.sourceRequired,
    ),
  isPublished: z.boolean().default(true),
});

export type CelestialBodyFormData = z.infer<typeof celestialBodySchema>;

/**
 * Skema validasi dimensi POI. Sumber data wajib diisi untuk tiap parameter.
 */
export const poiDimensionSchema = z.object({
  label: z.string().min(1, 'Label parameter dimensi wajib diisi.'),
  nilai: z.number(),
  satuan: z.string().min(1, 'Satuan dimensi wajib diisi (mis. km, m).'),
  sumber: z.string().min(3, messages.dimensionSourceRequired),
});

/**
 * Skema validasi Zod untuk Titik Minat (Point of Interest).
 * Mewajibkan teks sejarah, koordinat latitude & longitude yang valid, serta sumber terbuka.
 */
export const poiSchema = z.object({
  id: z
    .string()
    .min(2, messages.slugRequired)
    .regex(/^[a-z0-9-]+$/, messages.slugRequired),
  bodyId: z.string().min(1, 'Benda langit induk wajib dipilih.'),
  slug: z
    .string()
    .min(2, messages.slugRequired)
    .regex(/^[a-z0-9-]+$/, messages.slugRequired),
  name: z.string().min(2, messages.nameRequired),
  type: z.enum(['gunung', 'badai', 'kawah', 'lembah', 'lainnya']),
  lat: z.number().min(-90, messages.latRange).max(90, messages.latRange),
  lon: z.number().min(0, messages.lonRange).max(360, messages.lonRange),
  historyText: z.string().min(20, messages.historyRequired),
  dimensions: z.array(poiDimensionSchema).default([]),
  sources: z
    .array(z.string().trim())
    .refine(
      (arr) => arr.filter((s) => s.length > 0).length >= 1,
      messages.sourceRequired,
    ),
  isPublished: z.boolean().default(true),
});

export type PoiFormData = z.infer<typeof poiSchema>;

/**
 * Skema validasi metadata aset 3D & media.
 * Mewajibkan lisensi dan atribusi hak cipta untuk mematuhi lisensi terbuka/domain publik.
 */
export const assetUploadSchema = z.object({
  targetType: z.enum(['body', 'poi']),
  targetId: z.string().min(1, 'Target asosiasi wajib dipilih.'),
  assetType: z.enum(['tekstur', 'model', 'terrain', 'partikel']),
  qualityTier: z.enum(['rendah', 'sedang', 'tinggi']),
  license: z.string().min(3, messages.licenseRequired),
  attribution: z.string().min(3, messages.attributionRequired),
});

export type AssetUploadFormData = z.infer<typeof assetUploadSchema>;

// Batasan ukuran berkas (dalam bytes)
export const FILE_SIZE_LIMITS: Record<AssetType, number> = {
  tekstur: 10 * 1024 * 1024, // 10MB
  model: 20 * 1024 * 1024, // 20MB
  terrain: 10 * 1024 * 1024, // 10MB
  partikel: 5 * 1024 * 1024, // 5MB
};

// Format MIME / ekstensi yang diizinkan per tipe aset
export const ALLOWED_FORMATS: Record<
  AssetType,
  { mimes: string[]; extensions: string[] }
> = {
  tekstur: {
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  terrain: {
    mimes: ['image/png', 'image/jpeg'],
    extensions: ['.png', '.jpg', '.jpeg'],
  },
  model: {
    mimes: ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'],
    extensions: ['.glb', '.gltf'],
  },
  partikel: {
    mimes: ['application/json', 'text/json', 'text/plain'],
    extensions: ['.json'],
  },
};

/**
 * Fungsi pembantu validasi berkas fisik saat diunggah admin ke Supabase Storage.
 */
export function validateAssetFile(
  file: File | { name: string; size: number; type: string },
  assetType: AssetType,
): { valid: boolean; error?: string } {
  // 1. Cek ukuran berkas
  const maxBytes = FILE_SIZE_LIMITS[assetType];
  if (file.size > maxBytes) {
    const maxMb = maxBytes / (1024 * 1024);
    return { valid: false, error: messages.fileTooLarge(maxMb) };
  }

  // 2. Cek tipe MIME atau ekstensi nama berkas
  const allowed = ALLOWED_FORMATS[assetType];
  const fileName = file.name.toLowerCase();
  const hasValidExt = allowed.extensions.some((ext) => fileName.endsWith(ext));
  const hasValidMime = file.type ? allowed.mimes.includes(file.type) : false;

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: messages.invalidFileType(allowed.extensions.join(', ')),
    };
  }

  return { valid: true };
}
