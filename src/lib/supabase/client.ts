import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../types/database';

export function createClient() {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;

  const supabaseUrl =
    env?.SUPABASE_URL ||
    env?.VITE_SUPABASE_URL ||
    procEnv?.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== 'undefined' &&
      (window as unknown as { __ENV__?: { NEXT_PUBLIC_SUPABASE_URL?: string } })
        .__ENV__?.NEXT_PUBLIC_SUPABASE_URL) ||
    'https://placeholder-url.supabase.co';

  const supabaseAnonKey =
    env?.SUPABASE_ANON_KEY ||
    env?.VITE_SUPABASE_ANON_KEY ||
    procEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined' &&
      (window as unknown as { __ENV__?: { NEXT_PUBLIC_SUPABASE_ANON_KEY?: string } })
        .__ENV__?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    'placeholder-anon-key';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Browser singleton client instance
export const supabase = createClient();
