import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../types/database';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== 'undefined' && (window as unknown as { __ENV__?: { NEXT_PUBLIC_SUPABASE_URL?: string } }).__ENV__?.NEXT_PUBLIC_SUPABASE_URL) ||
    'https://placeholder-url.supabase.co';

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined' && (window as unknown as { __ENV__?: { NEXT_PUBLIC_SUPABASE_ANON_KEY?: string } }).__ENV__?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    'placeholder-anon-key';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Browser singleton client instance
export const supabase = createClient();

