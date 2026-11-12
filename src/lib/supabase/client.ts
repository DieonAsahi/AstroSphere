import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../types/database';

interface ResolvedSupabaseEnv {
  url: string;
  anonKey: string;
  configured: boolean;
}

function resolveSupabaseEnv(): ResolvedSupabaseEnv {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;
  const winEnv =
    typeof window !== 'undefined'
      ? (window as unknown as {
          __ENV__?: Record<string, string | undefined>;
        }).__ENV__
      : undefined;

  const rawUrl = (
    env?.SUPABASE_URL ||
    env?.VITE_SUPABASE_URL ||
    procEnv?.SUPABASE_URL ||
    procEnv?.VITE_SUPABASE_URL ||
    procEnv?.NEXT_PUBLIC_SUPABASE_URL ||
    winEnv?.SUPABASE_URL ||
    winEnv?.VITE_SUPABASE_URL ||
    winEnv?.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();

  const rawAnonKey = (
    env?.SUPABASE_ANON_KEY ||
    env?.VITE_SUPABASE_ANON_KEY ||
    procEnv?.SUPABASE_ANON_KEY ||
    procEnv?.VITE_SUPABASE_ANON_KEY ||
    procEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    winEnv?.SUPABASE_ANON_KEY ||
    winEnv?.VITE_SUPABASE_ANON_KEY ||
    winEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  const isPlaceholderUrl =
    !rawUrl ||
    rawUrl.includes('placeholder-url') ||
    rawUrl.includes('your-project') ||
    !/^https?:\/\//i.test(rawUrl);

  const isPlaceholderKey =
    !rawAnonKey ||
    rawAnonKey === 'placeholder-anon-key' ||
    rawAnonKey.includes('your-anon-key');

  return {
    url: rawUrl || 'https://placeholder-url.supabase.co',
    anonKey: rawAnonKey || 'placeholder-anon-key',
    configured: !isPlaceholderUrl && !isPlaceholderKey,
  };
}

export function getSupabaseConfigStatus(): { configured: boolean; url: string } {
  const { configured, url } = resolveSupabaseEnv();
  return { configured, url };
}

export function createClient() {
  const { url, anonKey } = resolveSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}

// Browser singleton client instance
export const supabase = createClient();
