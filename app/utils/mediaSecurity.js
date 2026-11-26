/**
 * Utilitas Keamanan Media & Anti-XSS AstroSphere
 * Memastikan URL media (gambar, audio, aset 3D) aman dari skema berbahaya seperti
 * javascript:, vbscript:, data:text/html, dsb.
 */

const DANGEROUS_PROTOCOL_REGEX = /^(?:javascript|vbscript|data|file|blob):/i;
const CONTROL_CHARS_REGEX = /[\r\n\0<>"]/;

/**
 * Memeriksa apakah sebuah string URL media aman untuk disimpan atau dirender
 * @param {string} rawUrl
 * @returns {boolean}
 */
export function isSafeMediaUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  // Larang karakter kontrol atau tag HTML dalam URL
  if (CONTROL_CHARS_REGEX.test(trimmed)) return false;

  // Tolak skema berbahaya
  if (DANGEROUS_PROTOCOL_REGEX.test(trimmed)) return false;

  // Izinkan path relatif lokal yang diawali '/' (misal: /img/..., /models/..., /images/...)
  if (trimmed.startsWith('/')) {
    // Larang protocol-relative URL (//example.com) yang mengarah ke domain luar
    if (trimmed.startsWith('//')) return false;
    // Larang traversal direktori
    if (trimmed.includes('..')) return false;
    return true;
  }

  // Periksa URL absolut
  try {
    const parsed = new URL(trimmed);
    // Wajibkan HTTPS untuk URL jarak jauh
    if (parsed.protocol === 'https:') {
      return true;
    }
    // Izinkan HTTP hanya untuk pengembangan lokal (localhost / 127.0.0.1)
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Sanitasi URL media: mengembalikan URL aman atau fallback jika terbukti berbahaya
 * @param {string} rawUrl
 * @param {string} fallback
 * @returns {string}
 */
export function sanitizeMediaUrl(rawUrl, fallback = '') {
  return isSafeMediaUrl(rawUrl) ? rawUrl.trim() : fallback;
}
