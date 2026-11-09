/**
 * Helper URL Dinamis untuk Deployment Vercel & Pengembangan Lokal
 * Membaca variabel lingkungan untuk mendukung localhost, Vercel Preview URL,
 * dan Vercel Production Custom Domain tanpa modifikasi kode.
 */
export function getBaseUrl(): string {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;

  const appUrl =
    env?.APP_URL ||
    env?.VITE_APP_URL ||
    procEnv?.NEXT_PUBLIC_SITE_URL;

  if (appUrl) {
    return appUrl;
  }
  if (procEnv?.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${procEnv.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}
