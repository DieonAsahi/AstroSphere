// Utilitas Unggah & Pengelolaan Aset Pengelola (Admin Storage)
// Mengunggah gambar POI & foto sejarah ke bucket Supabase Storage 'astrosphere-assets'.
import { getSupabaseClient } from './supabaseClient.js';
import {
  isBrowserOffline,
  isOfflineOrNetworkError,
  OFFLINE_ACTION_NOTICE,
} from './networkError.js';

export const ASSET_BUCKET = 'astrosphere-assets';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadAdminAsset(file, folder = 'history') {
  if (!file) {
    return { ok: false, error: 'Tidak ada berkas yang dipilih.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: 'Ukuran berkas melebihi batas maksimal 5 MB.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { ok: false, error: 'Format berkas tidak didukung. Harap unggah gambar JPG, PNG, atau WebP.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, error: 'Klien Supabase tidak tersedia.' };
  }
  if (isBrowserOffline()) {
    return { ok: false, error: OFFLINE_ACTION_NOTICE };
  }

  try {
    const ext = file.name.split('.').pop() || 'webp';
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
    const filePath = `${folder}/${Date.now()}_${cleanName}`;

    const { data, error } = await client.storage
      .from(ASSET_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      if (isOfflineOrNetworkError(error) || isBrowserOffline()) {
        return { ok: false, error: OFFLINE_ACTION_NOTICE };
      }
      const lower = String(error.message || '').toLowerCase();
      if (lower.includes('bucket not found')) {
        return {
          ok: false,
          error: 'Penyimpanan aset belum tersedia di server. Hubungi administrator sistem.',
        };
      }
      if (lower.includes('maximum allowed size') || lower.includes('payload too large') || lower.includes('size')) {
        return { ok: false, error: 'Ukuran berkas melebihi batas maksimal 5 MB.' };
      }
      if (lower.includes('mime') || lower.includes('invalid type')) {
        return { ok: false, error: 'Format berkas tidak didukung. Harap unggah gambar JPG, PNG, atau WebP.' };
      }
      return { ok: false, error: 'Gagal mengunggah berkas ke Storage. Silakan coba lagi.' };
    }

    const { data: publicUrlData } = client.storage
      .from(ASSET_BUCKET)
      .getPublicUrl(filePath);

    return {
      ok: true,
      url: publicUrlData.publicUrl,
      path: filePath,
    };
  } catch (err) {
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { ok: false, error: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, error: 'Terjadi kendala saat mengunggah aset. Silakan coba lagi.' };
  }
}
