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
    return { ok: false, error: 'Layanan unggah berkas belum tersedia saat ini.' };
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
          error: 'Penyimpanan media belum tersedia saat ini. Hubungi pengelola sistem.',
        };
      }
      if (lower.includes('maximum allowed size') || lower.includes('payload too large') || lower.includes('size')) {
        return { ok: false, error: 'Ukuran berkas melebihi batas maksimal 5 MB.' };
      }
      if (lower.includes('mime') || lower.includes('invalid type')) {
        return { ok: false, error: 'Format berkas tidak didukung. Harap unggah gambar JPG, PNG, atau WebP.' };
      }
      return { ok: false, error: 'Tidak bisa mengunggah berkas saat ini. Silakan coba lagi.' };
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

/**
 * Mengekstrak path relatif berkas di dalam bucket 'astrosphere-assets'.
 * Mengembalikan null jika URL tidak berasal dari bucket 'astrosphere-assets'.
 */
export function extractStoragePathFromUrl(publicUrl, bucket = ASSET_BUCKET) {
  if (!publicUrl || typeof publicUrl !== 'string') return null;
  const trimmed = publicUrl.trim();
  const pattern = new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/([^?#]+)`);
  const match = trimmed.match(pattern);
  if (!match || !match[1]) return null;

  try {
    const decoded = decodeURIComponent(match[1]);
    // Cegah path traversal
    if (decoded.includes('..') || decoded.startsWith('/') || decoded.startsWith('\\')) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Menghapus berkas dari Supabase Storage berdasarkan URL publiknya.
 * Hanya mengeksekusi penghapusan jika berkas benar-benar berasal dari bucket 'astrosphere-assets'.
 */
export async function deleteStorageFileByUrl(publicUrl) {
  const filePath = extractStoragePathFromUrl(publicUrl, ASSET_BUCKET);
  if (!filePath) {
    return { ok: false, skipped: true, message: 'Bukan berkas dari bucket astrosphere-assets.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, error: 'Layanan penyimpanan belum tersedia.' };
  }
  if (isBrowserOffline()) {
    return { ok: false, error: OFFLINE_ACTION_NOTICE };
  }

  try {
    const { data, error } = await client.storage
      .from(ASSET_BUCKET)
      .remove([filePath]);

    if (error) {
      if (isOfflineOrNetworkError(error) || isBrowserOffline()) {
        return { ok: false, error: OFFLINE_ACTION_NOTICE };
      }
      return { ok: false, error: 'Tidak bisa menghapus berkas lawas dari penyimpanan.' };
    }

    return { ok: true, path: filePath, data };
  } catch (err) {
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { ok: false, error: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, error: 'Terjadi kendala saat menghapus berkas penyimpanan.' };
  }
}

