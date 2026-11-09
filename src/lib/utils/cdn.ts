/**
 * Helper resolusi URL aset untuk CDN / Supabase Storage.
 * Membaca STORAGE_CDN_URL (dengan fallback VITE_STORAGE_CDN_URL).
 */
export function getStorageCdnUrl(): string {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  return env?.STORAGE_CDN_URL || env?.VITE_STORAGE_CDN_URL || '';
}

/**
 * Menyelesaikan path aset lokal ke CDN jika STORAGE_CDN_URL dikonfigurasi.
 */
export function resolveAssetUrl(assetPath: string): string {
  const cdn = getStorageCdnUrl();
  if (!cdn || !assetPath) return assetPath;
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }
  const cleanBase = cdn.replace(/\/+$/, '');
  const cleanPath = assetPath.replace(/^\/+/, '');
  return `${cleanBase}/${cleanPath}`;
}

