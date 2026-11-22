// Utilitas Unggah & Pengelolaan Aset Pengelola (Admin Storage)
// Mengunggah gambar POI & foto sejarah ke bucket Supabase Storage 'astrosphere-assets'.
import { getSupabaseClient } from './supabaseClient.js';

export const ASSET_BUCKET = 'astrosphere-assets';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

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
      // Jika bucket belum dibuat, berikan petunjuk yang jelas
      if (error.message?.includes('Bucket not found')) {
        return {
          ok: false,
          error: `Bucket '${ASSET_BUCKET}' belum dibuat di Supabase Storage. Harap buat bucket publik '${ASSET_BUCKET}'.`,
        };
      }
      return { ok: false, error: error.message || 'Gagal mengunggah berkas ke Storage.' };
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
    return { ok: false, error: err.message || 'Terjadi kesalahan saat mengunggah aset.' };
  }
}
