import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabaseClient() {
  if (client) return client;

  let url = '';
  let anonKey = '';
  let dataSource = 'auto';

  // 1. Coba baca dari Nuxt runtimeConfig (tersedia di browser setelah Nuxt runtime siap)
  try {
    const config = useRuntimeConfig();
    url = config.public?.supabaseUrl || config.public?.VITE_SUPABASE_URL || '';
    anonKey = config.public?.supabaseAnonKey || config.public?.supabaseKey || config.public?.VITE_SUPABASE_ANON_KEY || '';
    dataSource = config.public?.dataSource || 'auto';
  } catch {
    // Di luar konteks Nuxt setup / sebelum runtime siap
  }

  // 2. Coba baca dari import.meta.env (Vite client bundler)
  if ((!url || !anonKey) && typeof import.meta !== 'undefined' && import.meta.env) {
    url = url || import.meta.env.VITE_SUPABASE_URL || import.meta.env.NUXT_PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
    anonKey = anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY || import.meta.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';
    dataSource = dataSource || import.meta.env.DATA_SOURCE || import.meta.env.NUXT_PUBLIC_DATA_SOURCE || 'auto';
  }

  // 3. Coba baca dari process.env (Node.js / Nuxt server / SSR)
  if ((!url || !anonKey) && typeof process !== 'undefined' && process.env) {
    url = url || process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    anonKey = anonKey || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    dataSource = dataSource || process.env.DATA_SOURCE || process.env.NUXT_PUBLIC_DATA_SOURCE || 'auto';
  }

  // Bersihkan spasi atau tanda kutip string yang mungkin terbawa
  url = (url || '').trim().replace(/^["']|["']$/g, '');
  anonKey = (anonKey || '').trim().replace(/^["']|["']$/g, '');
  dataSource = (dataSource || 'auto').trim().toLowerCase();

  // Jika dipaksa mode 'local', jangan inisialisasi koneksi Supabase
  if (dataSource === 'local') {
    return null;
  }

  if (url && anonKey) {
    try {
      client = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('[AstroSphere] Gagal menginisialisasi Supabase client:', err);
      client = null;
    }
  } else if (dataSource === 'supabase') {
    console.warn('[AstroSphere Supabase] dataSource disetel ke "supabase", namun SUPABASE_URL atau SUPABASE_ANON_KEY belum terisi di environment variables!');
  }

  return client;
}

export const isSupabaseConfigured = () => {
  return getSupabaseClient() !== null;
};

// Proxy dinamis agar impor `supabase` tidak pernah bernilai null saat inisialisasi awal modul
export const supabase = new Proxy({}, {
  get(target, prop) {
    const c = getSupabaseClient();
    if (!c) return undefined;
    const val = c[prop];
    return typeof val === 'function' ? val.bind(c) : val;
  },
});
