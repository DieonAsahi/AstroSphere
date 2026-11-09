/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly DATA_SOURCE?: string;
  readonly VITE_DATA_SOURCE?: string;
  readonly SUPABASE_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly STORAGE_CDN_URL?: string;
  readonly VITE_STORAGE_CDN_URL?: string;
  readonly VERCEL_ANALYTICS_ENABLED?: string;
  readonly VITE_VERCEL_ANALYTICS_ENABLED?: string;
  readonly SENTRY_DSN?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly APP_URL?: string;
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
