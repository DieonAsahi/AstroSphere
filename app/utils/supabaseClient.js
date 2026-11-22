import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabaseClient() {
  if (client) return client;

  let url = '';
  let anonKey = '';

  try {
    const config = useRuntimeConfig();
    url = config.public?.supabaseUrl || '';
    anonKey = config.public?.supabaseAnonKey || '';
  } catch {
    // Di luar konteks Nuxt setup
  }

  if (!url && typeof process !== 'undefined') {
    url = process.env?.NUXT_PUBLIC_SUPABASE_URL || process.env?.SUPABASE_URL || '';
    anonKey = process.env?.NUXT_PUBLIC_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY || '';
  }

  if (url && anonKey) {
    try {
      client = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.warn('[AstroSphere] Gagal menginisialisasi Supabase client:', err);
      client = null;
    }
  }

  return client;
}

export const isSupabaseConfigured = () => {
  return getSupabaseClient() !== null;
};

export const supabase = getSupabaseClient();
