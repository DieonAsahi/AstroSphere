/**
 * Helper URL Dinamis untuk Deployment Vercel & Pengembangan Lokal
 * Membaca variabel lingkungan untuk mendukung localhost, Vercel Preview URL,
 * dan Vercel Production Custom Domain tanpa modifikasi kode.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

