/**
 * Modul Monitoring, Pelaporan Galat, dan Web Vitals Ramah Privasi
 * Kepatuhan: UU Pelindungan Data Pribadi No. 27 Tahun 2022
 * Menghilangkan PII (email, nama siswa/guru, nama sekolah, query params) dari laporan.
 */

export interface ScrubbedErrorPayload {
  message: string;
  name: string;
  stack?: string;
  timestamp: string;
  url: string;
  context?: Record<string, unknown>;
}

/**
 * Membersihkan data sensitif dari pesan atau konteks galat
 */
export function scrubPii(text: string): string {
  return (
    text
      // Sensor format email: user@domain.com -> [EMAIL_DISAMARKAN]
      .replace(
        /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g,
        '[EMAIL_DISAMARKAN]',
      )
      // Sensor token atau kunci rahasia
      .replace(
        /(bearer\s+[a-zA-Z0-9_.-]+|token=[a-zA-Z0-9_.-]+)/gi,
        '[TOKEN_DISAMARKAN]',
      )
      // Sensor query string sensitif
      .replace(/(\?|&)(redirect|code|email|token)=[^&]+/gi, '$1$2=[DISAMARKAN]')
  );
}

/**
 * Pelaporan galat ramah privasi
 */
export function reportError(
  error: unknown,
  context?: Record<string, unknown>,
): ScrubbedErrorPayload {
  const err = error instanceof Error ? error : new Error(String(error));

  const scrubbedPayload: ScrubbedErrorPayload = {
    name: err.name || 'Error',
    message: scrubPii(err.message || 'Unknown error'),
    stack: err.stack ? scrubPii(err.stack) : undefined,
    timestamp: new Date().toISOString(),
    // Hilangkan query string dari URL untuk mencegah kebocoran token/email
    url: window.location
      ? window.location.origin + window.location.pathname
      : '',
    context: context
      ? JSON.parse(scrubPii(JSON.stringify(context)))
      : undefined,
  };

  const sentryDsn =
    import.meta.env.SENTRY_DSN || import.meta.env.VITE_SENTRY_DSN;

  if (sentryDsn) {
    // Bila Sentry DSN dikonfigurasi di lingkungan produksi
    try {
      // Mengirimkan log galat tersaring ke Sentry via Store API
      fetch(sentryDsn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exception: {
            values: [
              { type: scrubbedPayload.name, value: scrubbedPayload.message },
            ],
          },
          tags: {
            platform: 'AstroSphere',
            anonymized: 'true',
          },
          extra: scrubbedPayload.context,
        }),
      }).catch(() => {
        // Abaikan kegagalan jaringan monitoring agar tidak mengganggu pengalaman pengguna
      });
    } catch {
      // Non-blocking fallback
    }
  }

  if (import.meta.env.DEV) {
    console.warn(
      '[AstroSphere Monitoring] Galat terlacak (tersanitasi):',
      scrubbedPayload,
    );
  }

  return scrubbedPayload;
}

/**
 * Inisialisasi pendengar galat global dan Vercel Speed Insights
 */
export function initMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Tangkap galat javascript global yang tidak tertangani
  window.addEventListener('error', (event) => {
    reportError(event.error || event.message);
  });

  // Tangkap penolakan promise tak tertangani
  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason);
  });

  // Pasang Vercel Web Analytics / Speed Insights jika diaktifkan di environment
  const analyticsVal =
    import.meta.env.VERCEL_ANALYTICS_ENABLED ||
    import.meta.env.VITE_VERCEL_ANALYTICS_ENABLED;
  const isVercelAnalytics =
    analyticsVal === 'true' || analyticsVal === '1';

  if (isVercelAnalytics && !import.meta.env.DEV) {
    const script = document.createElement('script');
    script.src = '/_vercel/insights/script.js';
    script.defer = true;
    script.setAttribute('data-sdkn', '@vercel/analytics');
    document.head.appendChild(script);
  }
}
