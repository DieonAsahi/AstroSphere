/**
 * Utilitas Keamanan Media & Anti-XSS AstroSphere
 * Memastikan URL media (gambar, audio, aset 3D) aman dari skema berbahaya seperti
 * javascript:, vbscript:, data:text/html, dsb.
 */

const DANGEROUS_PROTOCOL_REGEX = /^(?:javascript|vbscript|data|file|blob):/i;
const CONTROL_CHARS_REGEX = /[\u0000-\u001f\u007f<>"]/;

/**
 * Memeriksa apakah sebuah string URL media aman untuk disimpan atau dirender
 * @param {string} rawUrl
 * @returns {boolean}
 */
export function isSafeMediaUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  // Tolak karakter backslash (mencegah bypass WHATWG URL parser seperti /\evil.com)
  if (trimmed.includes('\\')) return false;

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

const URL_REGEX = /(https?:\/\/[^\s|]+)/gi;

/**
 * Memecah string sumber_referensi menjadi array item (dipisahkan oleh '|')
 * dan memecah setiap item menjadi segmen teks biasa atau link URL yang aman.
 * @param {string} rawText
 * @returns {Array<{ raw: string, hasLink: boolean, segments: Array<{ type: 'text'|'link', text: string, url?: string }> }>}
 */
export function parseReferenceItems(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const items = rawText.split('|').map((s) => s.trim()).filter(Boolean);
  return items.map((item) => {
    const segments = [];
    let lastIndex = 0;
    let match;
    const regex = new RegExp(URL_REGEX.source, 'gi');
    while ((match = regex.exec(item)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        segments.push({ type: 'text', text: item.slice(lastIndex, matchIndex) });
      }
      let rawUrl = match[0];
      let trailing = '';
      while (rawUrl.length > 0 && /[.,;!?:)\]"']/.test(rawUrl[rawUrl.length - 1])) {
        trailing = rawUrl[rawUrl.length - 1] + trailing;
        rawUrl = rawUrl.slice(0, -1);
      }
      if (isSafeMediaUrl(rawUrl)) {
        segments.push({ type: 'link', text: rawUrl, url: rawUrl });
      } else {
        segments.push({ type: 'text', text: rawUrl });
      }
      if (trailing) {
        segments.push({ type: 'text', text: trailing });
      }
      lastIndex = matchIndex + match[0].length;
    }
    if (lastIndex < item.length) {
      segments.push({ type: 'text', text: item.slice(lastIndex) });
    }
    return {
      raw: item,
      hasLink: segments.some((s) => s.type === 'link'),
      segments,
    };
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Merender representasi HTML aman untuk dokumen cetak PDF atau konteks statis
 * @param {string} rawText
 * @param {{ linkColor?: string }} options
 * @returns {string}
 */
export function renderReferenceHtml(rawText, { linkColor = '#2563eb' } = {}) {
  const items = parseReferenceItems(rawText);
  if (!items.length) return '';
  return items.map((item) => {
    return item.segments.map((seg) => {
      if (seg.type === 'link') {
        const safeUrl = sanitizeMediaUrl(seg.url);
        const safeText = escapeHtml(seg.text);
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:${linkColor};text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere;word-break:break-word;">${safeText}</a>`;
      }
      return escapeHtml(seg.text);
    }).join('');
  }).join('<div style="height:4px;"></div>');
}
