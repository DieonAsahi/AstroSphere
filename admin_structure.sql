-- ==============================================================================
-- AstroSphere - Skema Database Global Admin & RLS (Tanpa Seed Data / Kredensial)
-- ==============================================================================
-- File ini bersifat global/publik untuk tim pengembang dan berisi DDL skema,
-- indeks, fungsi helper, storage bucket, serta kebijakan keamanan RLS.
-- Tidak memuat data seed privat maupun kredensial akun Admin.
-- ==============================================================================

-- ==============================================================================
-- 1. EKSTENSI DATABASE
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. SKEMA TABEL MASTER ADMIN
-- ==============================================================================

-- 2.1 Tabel Whitelist Admin Internal
CREATE TABLE IF NOT EXISTS public.admin_users (
  email TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blok Migrasi Idempoten untuk Skema Database Lama
DO $$
BEGIN
  -- 1. Tambahkan kolom email jika belum ada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.admin_users ADD COLUMN email TEXT;
  END IF;

  -- 2. Tambahkan kolom password_hash jika belum ada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE public.admin_users ADD COLUMN password_hash TEXT;
  END IF;

  -- 3. Izinkan user_id NULL (karena admin bisa didaftarkan via email sebelum login pertama)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.admin_users ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  -- 4. Sinkronkan email dari auth.users jika ada data lama yang email-nya masih kosong
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'user_id'
  ) THEN
    UPDATE public.admin_users a
    SET email = lower(trim(u.email))
    FROM auth.users u
    WHERE a.user_id = u.id AND (a.email IS NULL OR trim(a.email) = '');
  END IF;

  DELETE FROM public.admin_users WHERE email IS NULL OR trim(email) = '';

  -- 5. Pastikan kolom email memiliki constraint UNIQUE atau PRIMARY KEY
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public' 
      AND rel.relname = 'admin_users' 
      AND con.contype IN ('p', 'u')
      AND array_to_string(con.conkey, ',') = (
        SELECT attnum::text 
        FROM pg_attribute 
        WHERE attrelid = rel.oid AND attname = 'email'
      )
  ) THEN
    BEGIN
      ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_email_unique UNIQUE (email);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- 2.2 Tabel Master Planet Tata Surya (A02 - Data Planet Sesuai PLY-02 & Procedural 3D Shader)
-- Blok Migrasi Aman untuk Kolom Baru & Pembersihan Kolom Usang
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'planets'
  ) THEN
    -- Hapus kolom-kolom visual 3D & parameter lama yang tidak dipakai di PLY-02
    ALTER TABLE public.planets DROP COLUMN IF EXISTS urutan_orbit CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS rotation_period_hours CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS orbital_period_days CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS axial_tilt_deg CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS ringkasan_cepat CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS sumber_referensi CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS aset_model_url CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS tekstur_url CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS warna_atmosfer_hex CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS skala_visual CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS batas_zona_radius CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS kecepatan_jelajah_nyaman CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS jarak_matahari_au CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS gravitasi_ms2 CASCADE;
    ALTER TABLE public.planets DROP COLUMN IF EXISTS jumlah_satelit CASCADE;

    -- Tambahkan kolom-kolom resmi PLY-02 jika belum ada
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS urutan_planet INT NOT NULL DEFAULT 1;
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS perbandingan_bumi TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS periode_rotasi TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS subteks_rotasi TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS periode_orbit TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS subteks_orbit TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS kemiringan_sumbu TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS suhu_rata_c TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS rentang_suhu TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS usia_planet TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS subteks_usia TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS judul_rotasi TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS deskripsi_rotasi TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS deskripsi_materi TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

    BEGIN
      ALTER TABLE public.planets DROP CONSTRAINT IF EXISTS planets_urutan_planet_check;
      ALTER TABLE public.planets ADD CONSTRAINT planets_urutan_planet_check CHECK (urutan_planet >= 1);
      ALTER TABLE public.planets DROP CONSTRAINT IF EXISTS planets_urutan_orbit_check;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.planets (
  planet_id TEXT PRIMARY KEY,
  urutan_planet INT NOT NULL UNIQUE CHECK (urutan_planet >= 1),
  nama TEXT NOT NULL,
  kategori_planet TEXT NOT NULL DEFAULT 'TERRESTRIAL' CHECK (kategori_planet IN ('TERRESTRIAL', 'GAS_GIANT', 'ICE_GIANT')),
  diameter_km NUMERIC NOT NULL,
  perbandingan_bumi TEXT NOT NULL DEFAULT '',
  periode_rotasi TEXT NOT NULL DEFAULT '',
  subteks_rotasi TEXT NOT NULL DEFAULT '',
  periode_orbit TEXT NOT NULL DEFAULT '',
  subteks_orbit TEXT NOT NULL DEFAULT '',
  kemiringan_sumbu TEXT NOT NULL DEFAULT '',
  suhu_rata_c TEXT NOT NULL DEFAULT '',
  rentang_suhu TEXT NOT NULL DEFAULT '',
  usia_planet TEXT NOT NULL DEFAULT '',
  subteks_usia TEXT NOT NULL DEFAULT '',
  judul_rotasi TEXT NOT NULL DEFAULT '',
  deskripsi_rotasi TEXT NOT NULL DEFAULT '',
  deskripsi_materi TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Tabel Peristiwa Sejarah & Point of Interest (POI) (A03 - Sesuai PLY-03 & PLY-04)
-- Blok Migrasi Aman untuk Kolom Baru & Pembersihan Koordinat Usang
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'history_events'
  ) THEN
    -- Hapus kolom koordinat yang tidak dipakai di PLY-03 & PLY-04
    ALTER TABLE public.history_events DROP CONSTRAINT IF EXISTS history_events_koordinat_lat_check;
    ALTER TABLE public.history_events DROP CONSTRAINT IF EXISTS history_events_koordinat_lng_check;
    ALTER TABLE public.history_events DROP COLUMN IF EXISTS koordinat_lat CASCADE;
    ALTER TABLE public.history_events DROP COLUMN IF EXISTS koordinat_lng CASCADE;

    -- Tambahkan kolom era_label dan sumber_referensi jika belum ada
    ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS era_label TEXT NOT NULL DEFAULT 'Sejarah & Bentang Alam';
    ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS sumber_referensi TEXT DEFAULT '';
    ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS gambar_url TEXT DEFAULT '';
    ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS ringkasan_singkat TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS karakteristik_fisik TEXT NOT NULL DEFAULT '';

    -- Lepas constraint check kategori lama agar mendukung penamaan kategori deskriptif
    ALTER TABLE public.history_events DROP CONSTRAINT IF EXISTS history_events_kategori_poi_check;
    ALTER TABLE public.history_events ALTER COLUMN kategori_poi SET DEFAULT 'Titik Observasi & Sejarah';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.history_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planet_id TEXT NOT NULL REFERENCES public.planets(planet_id) ON DELETE CASCADE,
  era_label TEXT NOT NULL DEFAULT 'Sejarah & Bentang Alam',
  tahun_kejadian INT NOT NULL,
  kategori_poi TEXT NOT NULL DEFAULT 'Titik Observasi & Sejarah',
  judul TEXT NOT NULL,
  ringkasan_singkat TEXT NOT NULL DEFAULT '',
  nama_wahana TEXT,
  karakteristik_fisik TEXT NOT NULL DEFAULT '',
  deskripsi TEXT NOT NULL,
  gambar_url TEXT DEFAULT '',
  sumber_referensi TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_planet_year 
  ON public.history_events (planet_id, tahun_kejadian);

-- 2.4 Tabel Simulasi Fenomena Astronomi (A04 - Fenomena Astronomi)
DO $$
BEGIN
  ALTER TABLE public.phenomena ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE public.phenomena ADD COLUMN IF NOT EXISTS penjelasan_matahari TEXT DEFAULT '';
  ALTER TABLE public.phenomena ADD COLUMN IF NOT EXISTS penjelasan_bulan TEXT DEFAULT '';
EXCEPTION WHEN others THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.phenomena (
  phenomenon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planet_id TEXT NOT NULL REFERENCES public.planets(planet_id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  tombol_aksi_label TEXT NOT NULL DEFAULT 'Putar Simulasi Fenomena',
  tipe_animasi TEXT NOT NULL CHECK (
    tipe_animasi IN (
      'SOLAR_ECLIPSE',
      'LUNAR_ECLIPSE',
      'MOON_PHASES',
      'GALILEAN_TRANSIT',
      'CUSTOM_ALIGNMENT'
    )
  ),
  deskripsi_edukatif TEXT NOT NULL,
  konfigurasi_visual JSONB NOT NULL DEFAULT '{}'::jsonb,
  penjelasan_matahari TEXT DEFAULT '',
  penjelasan_bulan TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Tabel Bank Soal Kuis Formatif (A05 - Kuis)
CREATE TABLE IF NOT EXISTS public.questions (
  question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planet_id TEXT NOT NULL REFERENCES public.planets(planet_id) ON DELETE CASCADE,
  soal TEXT NOT NULL,
  opsi JSONB NOT NULL,
  kunci_jawaban INT NOT NULL CHECK (kunci_jawaban BETWEEN 0 AND 3),
  pembahasan_edukatif TEXT NOT NULL,
  bobot_poin INT NOT NULL DEFAULT 50 CHECK (bobot_poin > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Tabel Master Pesawat Reward (R09, R11)
CREATE TABLE IF NOT EXISTS public.ships (
  ship_id TEXT PRIMARY KEY CHECK (ship_id IN ('astra-scout', 'orion-glider', 'nova-voyager')),
  urutan_tier INT NOT NULL DEFAULT 1,
  nama TEXT NOT NULL,
  panjang_meter INT NOT NULL,
  harga_poin INT NOT NULL,
  kecepatan_bonus_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  aset_model_url TEXT NOT NULL,
  deskripsi TEXT NOT NULL
);

-- 2.7 Tabel Bank Soal Mitos atau Fakta (Tab Mitos atau Fakta)
CREATE TABLE IF NOT EXISTS public.myths (
  myth_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  benda_langit TEXT NOT NULL DEFAULT 'bumi',
  pernyataan TEXT NOT NULL,
  is_fact BOOLEAN NOT NULL,
  penjelasan TEXT NOT NULL,
  sumber_referensi TEXT NOT NULL DEFAULT 'NASA',
  bobot_poin INT NOT NULL DEFAULT 10 CHECK (bobot_poin > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. FUNGSI KEAMANAN & HELPER ADMIN (DENGAN search_path AMAN DARI HIJACKING)
-- ==============================================================================

-- Fungsi cek Admin: Mencocokkan user_id ATAU email dari sesi Supabase Auth terautentikasi (FAIL-CLOSED)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
         OR (
           email IS NOT NULL
           AND COALESCE(auth.jwt()->>'email', '') <> ''
           AND lower(trim(email)) = lower(trim(auth.jwt()->>'email'))
         )
    );
$$;

-- Helper SQL: Menghitung total poin kuis maksimal yang sah per planet (Anti-Tampering)
CREATE OR REPLACE FUNCTION public.get_planet_max_quiz_score(p_planet_id TEXT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(bobot_poin), 0)::INT
  FROM public.questions
  WHERE planet_id = p_planet_id;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_planet_max_quiz_score(TEXT) TO anon, authenticated;

-- ==============================================================================
-- 4. STORAGE BUCKET (astrosphere-assets)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('astrosphere-assets', 'astrosphere-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read astrosphere-assets" ON storage.objects;
CREATE POLICY "Public Read astrosphere-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'astrosphere-assets');

DROP POLICY IF EXISTS "Admin Insert astrosphere-assets" ON storage.objects;
CREATE POLICY "Admin Insert astrosphere-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'astrosphere-assets' AND public.is_admin() = true);

DROP POLICY IF EXISTS "Admin Update astrosphere-assets" ON storage.objects;
CREATE POLICY "Admin Update astrosphere-assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'astrosphere-assets' AND public.is_admin() = true);

DROP POLICY IF EXISTS "Admin Delete astrosphere-assets" ON storage.objects;
CREATE POLICY "Admin Delete astrosphere-assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'astrosphere-assets' AND public.is_admin() = true);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) — PUBLIK (SELECT) & ADMIN (FULL CRUD)
-- ==============================================================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phenomena ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.myths ENABLE ROW LEVEL SECURITY;

-- 5.1 Policies: public.admin_users (Zero Anon Access + Anti Self-Escalation)
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.admin_users TO authenticated;

DROP POLICY IF EXISTS "Admins can view admin whitelist" ON public.admin_users;
CREATE POLICY "Admins can view admin whitelist"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()
      OR (
        user_id IS NULL
        AND COALESCE(auth.jwt()->>'email', '') <> ''
        AND lower(trim(email)) = lower(trim(auth.jwt()->>'email'))
      )
      OR public.is_admin() = true
    )
  );

DROP POLICY IF EXISTS "Superadmin manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Superadmin insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Superadmin update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Superadmin delete admin users" ON public.admin_users;

CREATE POLICY "Superadmin insert admin users"
  ON public.admin_users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() = true);

CREATE POLICY "Superadmin update admin users"
  ON public.admin_users FOR UPDATE
  TO authenticated
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

CREATE POLICY "Superadmin delete admin users"
  ON public.admin_users FOR DELETE
  TO authenticated
  USING (public.is_admin() = true);

-- 5.2 Policies: public.planets (Publik Hanya Baca Item Aktif, Admin Kelola Penuh)
DROP POLICY IF EXISTS "Public can view planets" ON public.planets;
CREATE POLICY "Public can view planets"
  ON public.planets FOR SELECT
  USING (is_active = true OR public.is_admin() = true);

DROP POLICY IF EXISTS "Admins can modify planets" ON public.planets;
CREATE POLICY "Admins can modify planets"
  ON public.planets FOR ALL
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 5.3 Policies: public.history_events (Publik Hanya Baca dari Planet Aktif, Admin Kelola Penuh)
DROP POLICY IF EXISTS "Public can view history events" ON public.history_events;
CREATE POLICY "Public can view history events"
  ON public.history_events FOR SELECT
  USING (
    public.is_admin() = true
    OR EXISTS (
      SELECT 1 FROM public.planets p
      WHERE p.planet_id = history_events.planet_id
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can modify history events" ON public.history_events;
CREATE POLICY "Admins can modify history events"
  ON public.history_events FOR ALL
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 5.4 Policies: public.phenomena (Publik Hanya Baca Item Aktif dari Planet Aktif, Admin Kelola Penuh)
DROP POLICY IF EXISTS "Public can view phenomena" ON public.phenomena;
CREATE POLICY "Public can view phenomena"
  ON public.phenomena FOR SELECT
  USING (
    public.is_admin() = true
    OR (
      is_active = true
      AND EXISTS (
        SELECT 1 FROM public.planets p
        WHERE p.planet_id = phenomena.planet_id
          AND p.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Admins can modify phenomena" ON public.phenomena;
CREATE POLICY "Admins can modify phenomena"
  ON public.phenomena FOR ALL
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 5.5 Policies: public.questions (Publik Hanya Baca dari Planet Aktif, Admin Kelola Penuh)
DROP POLICY IF EXISTS "Public can view questions" ON public.questions;
CREATE POLICY "Public can view questions"
  ON public.questions FOR SELECT
  USING (
    public.is_admin() = true
    OR EXISTS (
      SELECT 1 FROM public.planets p
      WHERE p.planet_id = questions.planet_id
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can modify questions" ON public.questions;
CREATE POLICY "Admins can modify questions"
  ON public.questions FOR ALL
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 5.6 Policies: public.ships (Publik Baca, Admin Kelola Penuh)
DROP POLICY IF EXISTS "Public can view ships" ON public.ships;
CREATE POLICY "Public can view ships"
  ON public.ships FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can modify ships" ON public.ships;
CREATE POLICY "Admins can modify ships"
  ON public.ships FOR ALL
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 5.7 Revokasi Hak Modifikasi dari Anon & Publik (Anti-Jebol REST API)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.planets, public.history_events, public.phenomena, public.questions, public.ships, public.myths, public.admin_users FROM anon, PUBLIC;
GRANT SELECT ON public.planets, public.history_events, public.phenomena, public.questions, public.ships, public.myths TO anon, authenticated;
GRANT ALL ON public.planets, public.history_events, public.phenomena, public.questions, public.ships, public.myths, public.admin_users TO authenticated;


-- ==============================================================================
-- 6. PENDAFTARAN AKUN ADMIN (TEMPLATE GLOBAL - TANPA KREDENSIAL NYATA)
-- ==============================================================================
-- Untuk mendaftarkan akun Admin pertama pada project Supabase Anda:
-- 1. Buat user di Supabase Dashboard -> Authentication -> Users (mis. admin@example.com).
-- 2. Salin UUID user tersebut, lalu jalankan perintah SQL berikut:
--
-- INSERT INTO public.admin_users (email, user_id)
-- VALUES ('admin@example.com', '<USER_UUID_DARI_SUPABASE_AUTH>')
-- ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;

-- Muat ulang cache skema PostgREST agar perubahan langsung aktif
NOTIFY pgrst, 'reload schema';
