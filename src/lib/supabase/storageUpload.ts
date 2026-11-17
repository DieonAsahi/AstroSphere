import { supabase } from './client';

export interface UploadAssetOptions {
  file: File;
  folder: 'planets' | 'history';
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxSizeMB: number;
  invalidTypeMessage: string;
}

/**
 * Mengunggah file aset media (foto sejarah, tekstur planet, atau model 3D)
 * ke bucket Supabase Storage `astrosphere-assets` dengan validasi ekstensi, MIME, dan ukuran.
 */
export async function uploadAdminAsset({
  file,
  folder,
  allowedMimeTypes,
  allowedExtensions,
  maxSizeMB,
  invalidTypeMessage,
}: UploadAssetOptions): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = file.type.toLowerCase();

  const validMime = mime ? allowedMimeTypes.includes(mime) : false;
  const validExt = allowedExtensions.includes(ext);

  if (!validExt || (mime && mime !== 'application/octet-stream' && !validMime)) {
    throw new Error(invalidTypeMessage);
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    const currentMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Ukuran file (${currentMb} MB) melebihi batas maksimal ${maxSizeMB} MB.`);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const filePath = `${folder}/${Date.now()}-${randomSuffix}-${cleanFileName}`;

  const { error: uploadError } = await supabase.storage
    .from('astrosphere-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || (ext === 'glb' ? 'model/gltf-binary' : undefined),
    });

  if (uploadError) {
    const msg = uploadError.message.toLowerCase();
    if (msg.includes('row-level security') || msg.includes('policy')) {
      throw new Error('Izin unggah ditolak oleh keamanan Storage (RLS). Pastikan Anda login sebagai Admin.');
    }
    if (msg.includes('bucket') && msg.includes('not found')) {
      throw new Error('Bucket storage "astrosphere-assets" belum dibuat di Supabase.');
    }
    throw new Error(`Gagal mengunggah aset: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('astrosphere-assets')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

