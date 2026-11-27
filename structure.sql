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
    ALTER TABLE public.planets ADD COLUMN IF NOT EXISTS sumber_referensi TEXT NOT NULL DEFAULT 'NASA Planetary Fact Sheet';
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
  body_type TEXT NOT NULL DEFAULT 'planet' CHECK (body_type IN ('planet', 'moon')),
  parent_planet_id TEXT,
  kategori_planet TEXT NOT NULL DEFAULT 'TERRESTRIAL' CHECK (kategori_planet IN ('TERRESTRIAL', 'GAS_GIANT', 'ICE_GIANT', 'MOON')),
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
  sumber_referensi TEXT NOT NULL DEFAULT 'NASA Planetary Fact Sheet',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blok Migrasi Otomatis Kolom Baru Satelit / Bulan pada Tabel planets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'planets' AND column_name = 'body_type'
  ) THEN
    ALTER TABLE public.planets ADD COLUMN body_type TEXT NOT NULL DEFAULT 'planet' CHECK (body_type IN ('planet', 'moon'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'planets' AND column_name = 'parent_planet_id'
  ) THEN
    ALTER TABLE public.planets ADD COLUMN parent_planet_id TEXT;
  END IF;

  ALTER TABLE public.planets DROP CONSTRAINT IF EXISTS planets_kategori_planet_check;
  ALTER TABLE public.planets ADD CONSTRAINT planets_kategori_planet_check CHECK (kategori_planet IN ('TERRESTRIAL', 'GAS_GIANT', 'ICE_GIANT', 'MOON'));
END $$;

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
    ALTER TABLE public.history_events DROP COLUMN IF EXISTS lat CASCADE;
    ALTER TABLE public.history_events DROP COLUMN IF EXISTS lon CASCADE;

    -- Tambahkan kolom era_label, sumber_referensi jika belum ada
    ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS era_label TEXT NOT NULL DEFAULT 'Sejarah & Bentang Alam';
    ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS sumber_referensi TEXT DEFAULT '';
    ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS gambar_url TEXT DEFAULT '';
    ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS ringkasan_singkat TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS karakteristik_fisik TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    

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
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom koordinat lat & lon selalu dibersihkan & kolom is_active tersedia
ALTER TABLE public.history_events DROP COLUMN IF EXISTS lat, DROP COLUMN IF EXISTS lon;
ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_history_planet_year 
  ON public.history_events (planet_id, tahun_kejadian);

-- 2.4 Tabel Simulasi Fenomena Astronomi (A04 - Fenomena Astronomi)
DO $$
BEGIN
  ALTER TABLE public.phenomena ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE public.phenomena ADD COLUMN IF NOT EXISTS penjelasan_matahari TEXT DEFAULT '';
  ALTER TABLE public.phenomena ADD COLUMN IF NOT EXISTS penjelasan_bulan TEXT DEFAULT '';
  ALTER TABLE public.phenomena ADD COLUMN IF NOT EXISTS sumber_referensi TEXT NOT NULL DEFAULT 'NASA';
  ALTER TABLE public.phenomena ADD COLUMN IF NOT EXISTS tebak_dulu JSONB;
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
  sumber_referensi TEXT NOT NULL DEFAULT 'NASA',
  tebak_dulu JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Tabel Bank Soal Kuis Formatif (A05 - Kuis)
DO $$
BEGIN
  ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN others THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.questions (
  question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planet_id TEXT NOT NULL REFERENCES public.planets(planet_id) ON DELETE CASCADE,
  soal TEXT NOT NULL,
  opsi JSONB NOT NULL,
  kunci_jawaban INT NOT NULL CHECK (kunci_jawaban BETWEEN 0 AND 3),
  pembahasan_edukatif TEXT NOT NULL,
  bobot_poin INT NOT NULL DEFAULT 50 CHECK (bobot_poin > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2.6 Tabel Master Pesawat Reward (R09, R11)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ships'
  ) THEN
    ALTER TABLE public.ships DROP CONSTRAINT IF EXISTS ships_ship_id_check;

    UPDATE public.ships SET ship_id = 'astra' WHERE ship_id = 'astra-scout' AND NOT EXISTS (SELECT 1 FROM public.ships s2 WHERE s2.ship_id = 'astra');
    UPDATE public.ships SET ship_id = 'orion' WHERE ship_id = 'orion-glider' AND NOT EXISTS (SELECT 1 FROM public.ships s2 WHERE s2.ship_id = 'orion');
    UPDATE public.ships SET ship_id = 'nova' WHERE ship_id = 'nova-voyager' AND NOT EXISTS (SELECT 1 FROM public.ships s2 WHERE s2.ship_id = 'nova');
    DELETE FROM public.ships WHERE ship_id IN ('astra-scout', 'orion-glider', 'nova-voyager');

    ALTER TABLE public.ships ADD COLUMN IF NOT EXISTS kelas_pesawat TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.ships ADD COLUMN IF NOT EXISTS kecepatan_jelajah DOUBLE PRECISION NOT NULL DEFAULT 70;
    ALTER TABLE public.ships ADD COLUMN IF NOT EXISTS kecepatan_turbo DOUBLE PRECISION NOT NULL DEFAULT 4.5;
    ALTER TABLE public.ships ADD COLUMN IF NOT EXISTS akselerasi DOUBLE PRECISION NOT NULL DEFAULT 1.5;
    ALTER TABLE public.ships ADD COLUMN IF NOT EXISTS kelincahan DOUBLE PRECISION NOT NULL DEFAULT 1.15;
    ALTER TABLE public.ships ALTER COLUMN kecepatan_jelajah SET DEFAULT 70;
    ALTER TABLE public.ships ALTER COLUMN kecepatan_turbo SET DEFAULT 4.5;
    ALTER TABLE public.ships ALTER COLUMN akselerasi SET DEFAULT 1.5;
    ALTER TABLE public.ships ALTER COLUMN kelincahan SET DEFAULT 1.15;
    ALTER TABLE public.ships ADD COLUMN IF NOT EXISTS statistik_bar JSONB NOT NULL DEFAULT '{"speed":68,"agility":92,"accel":84,"boost":74}'::jsonb;
    ALTER TABLE public.ships ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

    ALTER TABLE public.ships ADD CONSTRAINT ships_ship_id_check CHECK (ship_id IN ('astra', 'orion', 'nova'));
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.ships (
  ship_id TEXT PRIMARY KEY CHECK (ship_id IN ('astra', 'orion', 'nova')),
  urutan_tier INT NOT NULL DEFAULT 1,
  nama TEXT NOT NULL,
  kelas_pesawat TEXT NOT NULL DEFAULT '',
  panjang_meter INT NOT NULL,
  harga_poin INT NOT NULL,
  kecepatan_bonus_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  kecepatan_jelajah DOUBLE PRECISION NOT NULL DEFAULT 70,
  kecepatan_turbo DOUBLE PRECISION NOT NULL DEFAULT 4.5,
  akselerasi DOUBLE PRECISION NOT NULL DEFAULT 1.5,
  kelincahan DOUBLE PRECISION NOT NULL DEFAULT 1.15,
  statistik_bar JSONB NOT NULL DEFAULT '{"speed":68,"agility":92,"accel":84,"boost":74}'::jsonb,
  aset_model_url TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
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

-- 2.8 Tabel Kartu Fakta "Tahukah Kamu?" (Jurnal Penjelajah)
CREATE TABLE IF NOT EXISTS public.facts (
  fact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_id TEXT NOT NULL CHECK (
    body_id IN (
      'matahari', 'merkurius', 'venus', 'bumi', 'mars', 'jupiter', 'saturnus', 'uranus', 'neptunus',
      'bulan', 'io', 'europa', 'ganymede', 'callisto', 'titan', 'sabuk'
    )
  ),
  judul TEXT NOT NULL,
  isi_fakta TEXT NOT NULL,
  sumber_referensi TEXT NOT NULL DEFAULT 'NASA',
  urutan INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facts_body_order
  ON public.facts (body_id, urutan);

-- ==============================================================================
-- 3. FUNGSI KEAMANAN & HELPER ADMIN (DENGAN search_path AMAN DARI HIJACKING)
-- ==============================================================================

-- Fungsi cek Admin: Mencocokkan user_id ATAU email terverifikasi dari sesi Supabase Auth terautentikasi (FAIL-CLOSED)
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
           AND (
             (COALESCE(auth.jwt()->>'email_verified', 'false'))::boolean IS TRUE
             OR (COALESCE(auth.jwt()->'user_metadata'->>'email_verified', 'false'))::boolean IS TRUE
           )
           AND COALESCE(auth.jwt()->>'email', '') <> ''
           AND lower(trim(email)) = lower(trim(auth.jwt()->>'email'))
         )
    );
$$;

-- Helper SQL: Menautkan user_id akun Admin yang masih NULL secara aman setelah login terverifikasi
CREATE OR REPLACE FUNCTION public.link_admin_user_id()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')));
  v_is_verified BOOLEAN := false;
BEGIN
  IF auth.role() <> 'authenticated' OR v_uid IS NULL OR v_email = '' THEN
    RETURN false;
  END IF;

  -- Verifikasi bahwa email pengguna benar-benar terverifikasi
  v_is_verified := (
    (COALESCE(auth.jwt()->>'email_verified', 'false'))::boolean IS TRUE
    OR (COALESCE(auth.jwt()->'user_metadata'->>'email_verified', 'false'))::boolean IS TRUE
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = v_uid
        AND u.email_confirmed_at IS NOT NULL
        AND LOWER(TRIM(u.email)) = v_email
    )
  );

  IF NOT v_is_verified THEN
    RETURN false;
  END IF;

  -- Perbarui user_id hanya jika baris admin_users ada dan user_id masih NULL (atau sudah sesuai v_uid)
  UPDATE public.admin_users
  SET user_id = v_uid
  WHERE LOWER(TRIM(email)) = v_email
    AND (user_id IS NULL OR user_id = v_uid);

  RETURN FOUND;
END;
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
  WHERE planet_id = p_planet_id
    AND is_active = true;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
REVOKE ALL ON FUNCTION public.link_admin_user_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_admin_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_planet_max_quiz_score(TEXT) TO anon, authenticated;

-- ==============================================================================
-- 4. STORAGE BUCKET (astrosphere-assets)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'astrosphere-assets',
  'astrosphere-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

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
ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;

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

-- 5.3 Policies: public.history_events (Publik Hanya Baca Item Aktif dari Planet Aktif, Admin Kelola Penuh)
DROP POLICY IF EXISTS "Public can view history events" ON public.history_events;
CREATE POLICY "Public can view history events"
  ON public.history_events FOR SELECT
  USING (
    public.is_admin() = true
    OR (
      is_active = true
      AND EXISTS (
        SELECT 1 FROM public.planets p
        WHERE p.planet_id = history_events.planet_id
          AND p.is_active = true
      )
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

-- 5.5 Policies: public.questions (Publik Hanya Baca Item Aktif dari Planet Aktif, Admin Kelola Penuh)
DROP POLICY IF EXISTS "Public can view questions" ON public.questions;
CREATE POLICY "Public can view questions"
  ON public.questions FOR SELECT
  USING (
    public.is_admin() = true
    OR (
      is_active = true
      AND EXISTS (
        SELECT 1 FROM public.planets p
        WHERE p.planet_id = questions.planet_id
          AND p.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Admins can modify questions" ON public.questions;
CREATE POLICY "Admins can modify questions"
  ON public.questions FOR ALL
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 5.6 Policies: public.ships (Publik Hanya Baca Item Aktif, Admin Kelola Penuh)
DROP POLICY IF EXISTS "Public can view ships" ON public.ships;
CREATE POLICY "Public can view ships"
  ON public.ships FOR SELECT
  USING (is_active = true OR public.is_admin() = true);

DROP POLICY IF EXISTS "Admins can modify ships" ON public.ships;
CREATE POLICY "Admins can modify ships"
  ON public.ships FOR ALL
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 5.7 Policies: public.myths (Publik Hanya Baca Item Aktif, Admin Kelola Penuh)
DROP POLICY IF EXISTS "Public can view myths" ON public.myths;
CREATE POLICY "Public can view myths"
  ON public.myths FOR SELECT
  USING (is_active = true OR public.is_admin() = true);

DROP POLICY IF EXISTS "Admins can modify myths" ON public.myths;
CREATE POLICY "Admins can modify myths"
  ON public.myths FOR ALL
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 5.8 Policies: public.facts (Publik Hanya Baca Item Aktif, Admin Kelola Penuh)
DROP POLICY IF EXISTS "Public can view facts" ON public.facts;
CREATE POLICY "Public can view facts"
  ON public.facts FOR SELECT
  USING (is_active = true OR public.is_admin() = true);

DROP POLICY IF EXISTS "Admins can modify facts" ON public.facts;
CREATE POLICY "Admins can modify facts"
  ON public.facts FOR ALL
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 5.9 Revokasi Hak Modifikasi dari Anon & Publik (Anti-Jebol REST API)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.planets, public.history_events, public.phenomena, public.questions, public.ships, public.myths, public.facts, public.admin_users FROM anon, PUBLIC;
GRANT SELECT ON public.planets, public.history_events, public.phenomena, public.questions, public.ships, public.myths, public.facts TO anon, authenticated;
GRANT ALL ON public.planets, public.history_events, public.phenomena, public.questions, public.ships, public.myths, public.facts TO authenticated;
-- Isolasi ketat admin_users: authenticated HANYA memiliki hak SELECT (modifikasi admin via superadmin RLS)
REVOKE ALL ON public.admin_users FROM PUBLIC, anon;
GRANT SELECT ON public.admin_users TO authenticated;


-- ==============================================================================

-- ============================================================================== 
-- 6. SEED DATA MATERI EDUKASI ASTROSPHERE (8 PLANET, SEJARAH, FENOMENA & KUIS)
-- ==============================================================================

-- 6.0 Pembersihan Data Lama (Idempoten & Bersih dari Data Sampah)
TRUNCATE TABLE public.history_events, public.phenomena, public.questions, public.myths, public.facts RESTART IDENTITY CASCADE;

-- 6.1 Seed 8 Planet Tata Surya & 6 Bulan Satelit Alami
INSERT INTO public.planets (
  planet_id, urutan_planet, nama, body_type, parent_planet_id, kategori_planet, diameter_km, perbandingan_bumi,
  periode_rotasi, subteks_rotasi, periode_orbit, subteks_orbit,
  kemiringan_sumbu, suhu_rata_c, rentang_suhu, usia_planet, subteks_usia,
  judul_rotasi, deskripsi_rotasi, deskripsi_materi, sumber_referensi, is_active
) VALUES
('mercury', 1, 'Merkurius', 'planet', NULL, 'TERRESTRIAL', 4879.0, '0.38x Bumi',
 '58.6 Hari Bumi', '1.408 Jam', '88 Hari Bumi', '0.24 Tahun Bumi',
 '0.034°', '167°C', '-180°C s/d 430°C', '~4.5 Miliar Tahun', 'Terbentuk bersama Tata Surya',
 'Rotasi Sangat Lambat', 'Merkurius memerlukan 59 hari Bumi untuk satu putaran poros, menghasilkan siang dan malam yang sangat ekstrem.',
 'Saat pesawatmu berhenti di hadapan Merkurius, kamu sedang menatap dunia batuan abu-abu yang penuh kawah tumbukan dan memiliki inti besi cair raksasa (mencapai 85% radius planet). Karena hampir tidak memiliki atmosfer untuk menahan kalor, suhu siang harinya membara hingga 430°C sedangkan sisi malamnya membeku hingga -180°C. Pendinginan inti besinya membuat permukaan planet ini mengerut dan melahirkan tebing-tebing patahan setinggi 3 km, sementara dasar kawah kutubnya yang gelap abadi menyimpan es air murni.', 'NASA Planetary Fact Sheet', true),

('venus', 2, 'Venus', 'planet', NULL, 'TERRESTRIAL', 12104.0, '0.95x Bumi',
 '243 Hari Bumi', 'Retrograd / Mundur', '225 Hari Bumi', '0.62 Tahun Bumi',
 '177.3°', '464°C', '465°C Konstan', '~4.5 Miliar Tahun', 'Terbentuk bersama Tata Surya',
 'Rotasi Retrograd Unik', 'Venus berputar berlawanan arah dengan mayoritas planet; matahari terbit dari barat dan tenggelam di timur.',
 'Dari balik jendela pesawat, Venus tampak berkilau kuning keemasan karena diselimuti awan asam sulfat pekat dan atmosfer karbon dioksida bertekanan 90 kali Bumi. Efek rumah kaca ekstrem membuat suhu permukaannya mencapai 465°C—cukup panas untuk melelehkan timbal. Uniknya, Venus berputar searah jarum jam (retrograde) dengan sangat lambat sehingga satu hari di Venus lebih lama daripada satu tahunnya, dan di balik awannya berdiri pegunungan tinggi bersalju logam serta ribuan gunung berapi.', 'NASA Planetary Fact Sheet', true),

('earth', 3, 'Bumi', 'planet', NULL, 'TERRESTRIAL', 12742.0, '1.00x Standar',
 '23 Jam 56 Menit', '1 Hari Sideris', '365.25 Hari', '1 Tahun Kalender',
 '23.44°', '15°C', '15°C (Rata-rata)', '~4.54 Miliar Tahun', 'Radiometrik Batuan',
 'Rotasi Prograd Ideal', 'Kemiringan sumbu 23.4° menciptakan 4 musim dinamis dan iklim stabil yang menopang biosfer kehidupan.',
 'Bumi tampak bagaikan kelereng biru bercorak awan putih dengan 71% permukaan tertutup samudra air cair. Pergerakan lempeng tektoniknya melahirkan pegunungan tertinggi, gunung api bawah laut, dan palung samudra terdalam. Dilindungi oleh perisai medan magnet (magnetosfer) serta lapisan ozon di stratosfer, Bumi menyimpan jejak sejarah panjang mulai dari zaman dinosaurus, manusia purba, monumen peradaban kuno dan sejarah Islam, penjelajahan samudra, hingga bentang hutan dan gurun raksasa.', 'NASA Planetary Fact Sheet', true),

('mars', 4, 'Mars', 'planet', NULL, 'TERRESTRIAL', 6779.0, '0.53x Bumi',
 '24 Jam 37 Menit', '1 Sol Planet', '687 Hari Bumi', '1.88 Tahun Bumi',
 '25.19°', '-65°C', '-60°C (Rata-rata)', '~4.6 Miliar Tahun', 'Dikonfirmasi Zirkon',
 'Siklus Hari Mirip Bumi', 'Durasi sol Mars hampir identik dengan Bumi, dengan kemiringan sumbu yang juga memicu perubahan musim kutub es.',
 'Permukaan Mars tampak merah jingga karena lapisan mineral oksida besi (karat) yang menyelimuti batuan dan gurunnya. Meski diameternya hanya separuh Bumi, Mars memiliki bentang alam raksasa yang jauh melampaui Bumi: gunung berapi perisai tertinggi di Tata Surya (Olympus Mons setinggi 21,9 km), sistem ngarai patahan Valles Marineris sepanjang 4.000 km, tudung es di kedua kutubnya, serta lembah sungai kering yang membuktikan bahwa Mars dulunya memiliki danau air cair.', 'NASA Planetary Fact Sheet', true),

('jupiter', 5, 'Jupiter', 'planet', NULL, 'GAS_GIANT', 139820.0, '11.21x Bumi',
 '9 Jam 55 Menit', 'Tercepat di Tata Surya', '11.86 Tahun', '4.333 Hari Bumi',
 '3.13°', '-110°C', '-110°C (Puncak Awan)', '~4.6 Miliar Tahun', 'Planet Tertua',
 'Rotasi Ekstrem Cepat', 'Putaran kurang dari 10 jam menciptakan gaya sentrifugal masif yang meratakan kutub dan membentuk sabuk badai zonal.',
 'Jupiter adalah raksasa gas terbesar di Tata Surya (berdiameter 11 kali Bumi) tanpa daratan padat. Seluruh permukaannya yang terlihat adalah sabuk dan zona awan amonia warna-warni yang diputar oleh rotasi super cepat (hanya 9 jam 55 menit per hari). Di belahan selatannya berputar Bintik Merah Raksasa, badai antisiklon abadi yang lebih besar dari planet Bumi, sementara jauh di kedalamannya terdapat lautan hidrogen metalik cair pembangkit medan magnet dan aurora raksasa.', 'NASA Planetary Fact Sheet', true),

('saturn', 6, 'Saturnus', 'planet', NULL, 'GAS_GIANT', 116460.0, '9.45x Bumi',
 '10 Jam 33 Menit', 'Diferensial Gas', '29.45 Tahun', '10.759 Hari Bumi',
 '26.73°', '-140°C', '-140°C (Lapisan Awan)', '~4.5 Miliar Tahun', 'Sezaman dengan Jupiter',
 'Rotasi Cepat & Cincin Megah', 'Kecepatan rotasi tinggi memicu badai heksagonal di kutub utara dan menjaga dinamika cincin partikel es.',
 'Saturnus memukau setiap penjelajah antariksa dengan sistem tujuh cincin es murninya yang membentang selebar 282.000 km namun ketebalannya hanya puluhan meter. Planet raksasa gas ini memiliki massa jenis sangat rendah (0,687 g/cm³)—lebih ringan dari air. Di kutub utaranya berputar arus jet berbentuk segi enam sempurna (Hexagon) selebar dua kali Bumi, dikelilingi lebih dari seratus satelit alami termasuk Titan yang berdanau metana cair.', 'NASA Planetary Fact Sheet', true),

('uranus', 7, 'Uranus', 'planet', NULL, 'ICE_GIANT', 50724.0, '4.01x Bumi',
 '17 Jam 14 Menit', 'Retrograd Gelinding', '84.02 Tahun', '30.687 Hari Bumi',
 '97.77°', '-195°C', '-195°C s/d -224°C', '~4.5 Miliar Tahun', 'Raksasa Es',
 'Rotasi Menggelinding Ekstrem', 'Sumbu kemiringan 98 derajat membuat Uranus berputar miring menyamping, seolah-olah menggelinding di bidang orbitnya.',
 'Uranus adalah raksasa es dengan atmosfer dingin (-224°C) yang tampak biru-kehijauan lembut karena gas metana menyerap spektrum cahaya merah Matahari. Keunikan utamanya adalah poros rotasinya yang rebah 97,77°, membuat planet ini menggelinding miring bersama 13 cincin gelap vertikalnya. Di bawah atmosfernya terdapat mantel es fluida bertekanan jutaan atmosfer yang memisahkan atom karbon dari metana menjadi hujan kristal berlian.', 'NASA Planetary Fact Sheet', true),

('neptune', 8, 'Neptunus', 'planet', NULL, 'ICE_GIANT', 49244.0, '3.88x Bumi',
 '16 Jam 6 Menit', 'Diferensial Cepat', '164.79 Tahun', '60.190 Hari Bumi',
 '28.32°', '-200°C', '-201°C (Beku Abadi)', '~4.5 Miliar Tahun', 'Batas Tata Surya',
 'Rotasi Cepat & Supersonik', 'Kombinasi rotasi cepat dan panas internal memicu angin supersonik tercepat di Tata Surya hingga 2.100 km/jam.',
 'Berada di tepian dingin Tata Surya (30 kali jarak Bumi ke Matahari), Neptunus menampilkan warna biru kobalt yang pekat dengan sapuan awan kristal es metana putih. Panas dari dalam intinya memicu angin tercepat di Tata Surya yang menembus kecepatan supersonik 2.100 km/jam serta pusaran badai Bintik Gelap Besar. Seperti Uranus, tekanan ekstrem di mantel es dalamnya memampatkan karbon menjadi hujan kristal berlian murni.', 'NASA Planetary Fact Sheet', true),

('moon', 9, 'Bulan', 'moon', 'earth', 'MOON', 3474.8, '0.27x Bumi',
 '27.3 Hari Bumi', 'Terkunci Pasang Surut', '27.3 Hari Bumi', 'Mengelilingi Bumi',
 '6.68°', '-20°C', '-130°C s/d 120°C', '~4.5 Miliar Tahun', 'Tumbukan Purba Theia',
 'Sinkronisasi Pasang Surut', 'Bulan berputar pada porosnya dengan kecepatan yang persis sama dengan waktu orbitnya mengitari Bumi, sehingga sisi yang sama selalu menghadap ke Bumi.',
 'Satu-satunya satelit alami Bumi dan satu-satunya dunia di luar Bumi yang pernah diinjak oleh manusia. Permukaannya dihiasi kawah tubrukan purba dan mare (lautan lava basal gelap yang membeku). Karena tidak memiliki atmosfer pelindung, suhunya berfluktuasi ekstrem antara siang membakar dan malam membeku.', 'NASA Solar System Exploration', true),

('io', 10, 'Io', 'moon', 'jupiter', 'MOON', 3643.2, '0.29x Bumi',
 '1.77 Hari Bumi', 'Terkunci Pasang Surut', '1.77 Hari Bumi', 'Mengelilingi Jupiter',
 '0.0°', '-130°C', '-143°C s/d 1600°C (Kawah Api)', '~4.5 Miliar Tahun', 'Terbentuk bersama Jupiter',
 'Pasang Surut Gravitasi Ekstrem', 'Gaya tarik gravitasi pasang surut antara Jupiter, Europa, dan Ganymede meremas bagian dalam Io dan memicu panas internal luar biasa.',
 'Benda paling aktif secara vulkanik di tata surya dengan lebih dari 400 gunung api belerang aktif. Letusan vulkanik Io menyemburkan sulfur hingga ketinggian 500 km ke ruang angkasa, mewarnai permukaannya dengan nuansa kuning, jingga, dan hitam tanpa kawah tubrukan.', 'NASA Solar System Exploration', true),

('europa', 11, 'Europa', 'moon', 'jupiter', 'MOON', 3121.6, '0.25x Bumi',
 '3.55 Hari Bumi', 'Terkunci Pasang Surut', '3.55 Hari Bumi', 'Mengelilingi Jupiter',
 '0.1°', '-160°C', '-220°C s/d -160°C', '~4.5 Miliar Tahun', 'Terbentuk bersama Jupiter',
 'Dunia Es Air Luar Angkasa', 'Berputar sinkron mengelilingi Jupiter dengan sumbu tegak, memicu retakan garis-garis kemerahan (lineae) pada kerak es permukaannya.',
 'Satelit es yang menyimpan samudra air asin cair global sedalam 60–150 km di balik kerak es tebalnya, diperkirakan mengandung air dua kali lipat volume seluruh samudra di Bumi. Europa menjadi kandidat utama pencarian jejak kehidupan luar bumi.', 'NASA Solar System Exploration', true),

('ganymede', 12, 'Ganymede', 'moon', 'jupiter', 'MOON', 5268.2, '0.41x Bumi',
 '7.16 Hari Bumi', 'Terkunci Pasang Surut', '7.16 Hari Bumi', 'Mengelilingi Jupiter',
 '0.2°', '-163°C', '-203°C s/d -121°C', '~4.5 Miliar Tahun', 'Satelit Terbesar Tata Surya',
 'Satelit Raksasa Bermagnet', 'Satu-satunya bulan di Tata Surya yang membangkitkan medan magnet internalnya sendiri berkat inti besi cair yang berotasi.',
 'Satelit alami terbesar di seluruh tata surya—bahkan lebih besar dari planet Merkurius dan Pluto. Memiliki medan magnet sendiri yang menghasilkan pita aurora, serta lapisan es tebal yang menyelimuti samudra air garam bawah tanah.', 'NASA Solar System Exploration', true),

('callisto', 13, 'Callisto', 'moon', 'jupiter', 'MOON', 4820.6, '0.38x Bumi',
 '16.69 Hari Bumi', 'Terkunci Pasang Surut', '16.69 Hari Bumi', 'Mengelilingi Jupiter',
 '0.0°', '-139°C', '-193°C s/d -108°C', '~4.5 Miliar Tahun', 'Permukaan Tertua Tata Surya',
 'Rotasi Lambat Stabil', 'Terletak di orbit terluar dari 4 satelit Galileo, sehingga mengalami radiasi dan gravitasi pasang surut paling minim dari Jupiter.',
 'Dunia beku dengan kepadatan kawah tertinggi di tata surya, permukaannya hampir tidak pernah mengalami aktivitas geologis atau peremajaan sejak 4 miliar tahun lalu. Menjadi fosil hidup sejarah tumbukan Tata Surya awal.', 'NASA Solar System Exploration', true),

('titan', 14, 'Titan', 'moon', 'saturn', 'MOON', 5149.4, '0.40x Bumi',
 '15.95 Hari Bumi', 'Terkunci Pasang Surut', '15.95 Hari Bumi', 'Mengelilingi Saturnus',
 '0.0°', '-179°C', '-180°C s/d -175°C', '~4.5 Miliar Tahun', 'Terbentuk bersama Saturnus',
 'Siklus Metana Hidrologis', 'Atmosfer nitrogen tebalnya berotasi lebih cepat dari permukaan padatnya (super-rotasi atmosfer).',
 'Satu-satunya satelit dengan atmosfer tebal (didominasi nitrogen dengan tekanan 1,5 atm) dan satu-satunya objek di luar Bumi yang memiliki cairan stabil di permukaannya—berupa danau, sungai, dan laut metana dan etana cair.', 'NASA Solar System Exploration', true)
ON CONFLICT (planet_id) DO UPDATE SET
  urutan_planet = EXCLUDED.urutan_planet,
  nama = EXCLUDED.nama,
  body_type = EXCLUDED.body_type,
  parent_planet_id = EXCLUDED.parent_planet_id,
  kategori_planet = EXCLUDED.kategori_planet,
  diameter_km = EXCLUDED.diameter_km,
  perbandingan_bumi = EXCLUDED.perbandingan_bumi,
  periode_rotasi = EXCLUDED.periode_rotasi,
  subteks_rotasi = EXCLUDED.subteks_rotasi,
  periode_orbit = EXCLUDED.periode_orbit,
  subteks_orbit = EXCLUDED.subteks_orbit,
  kemiringan_sumbu = EXCLUDED.kemiringan_sumbu,
  suhu_rata_c = EXCLUDED.suhu_rata_c,
  rentang_suhu = EXCLUDED.rentang_suhu,
  usia_planet = EXCLUDED.usia_planet,
  subteks_usia = EXCLUDED.subteks_usia,
  judul_rotasi = EXCLUDED.judul_rotasi,
  deskripsi_rotasi = EXCLUDED.deskripsi_rotasi,
  deskripsi_materi = EXCLUDED.deskripsi_materi,
  sumber_referensi = EXCLUDED.sumber_referensi,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 6.2 Seed Master Pesawat Reward (PRD R09, R11)
INSERT INTO public.ships (
  ship_id, urutan_tier, nama, kelas_pesawat, panjang_meter, harga_poin, kecepatan_bonus_multiplier,
  kecepatan_jelajah, kecepatan_turbo, akselerasi, kelincahan, statistik_bar, aset_model_url, deskripsi, is_active
) VALUES
('astra', 1, 'Astra Scout', 'Pengorbit ulang-alik', 37, 0, 1.0,
 70, 4.5, 1.5, 1.15,
 '{"speed":62,"agility":92,"accel":85,"boost":70}'::jsonb,
 '/models/ships/astra-scout.glb',
 'Berbasis Space Shuttle Discovery (OV-103), pengorbit NASA yang terbang 39 kali (1984–2011) dan meluncurkan Teleskop Hubble pada 1990. Semburan apinya memanjang mengikuti tuas gas.',
 true),
('orion', 2, 'Orion Glider', 'Peluncur siluman', 15, 300, 1.25,
 82, 5.2, 1.25, 0.95,
 '{"speed":80,"agility":66,"accel":72,"boost":88}'::jsonb,
 '/models/ships/orion-glider.glb',
 'Lambung siluman hitam bersayap berlian dengan kokpit kaca biru dan satu mesin utama besar di buritan. Dirancang untuk perjalanan jauh yang senyap.',
 true),
('nova', 3, 'Nova Voyager', 'Kapal ekspedisi', 18, 700, 1.5,
 96, 5.6, 1.15, 0.9,
 '{"speed":96,"agility":70,"accel":68,"boost":100}'::jsonb,
 '/models/ships/nova-voyager.glb',
 'Rangka berbentuk X dengan empat pod mesin di ujung lengan yang berpijar biru saat dipacu. Kecepatan jelajah tertinggi di armada.',
 true)
ON CONFLICT (ship_id) DO UPDATE SET
  urutan_tier = EXCLUDED.urutan_tier,
  nama = EXCLUDED.nama,
  kelas_pesawat = EXCLUDED.kelas_pesawat,
  panjang_meter = EXCLUDED.panjang_meter,
  harga_poin = EXCLUDED.harga_poin,
  kecepatan_bonus_multiplier = EXCLUDED.kecepatan_bonus_multiplier,
  kecepatan_jelajah = EXCLUDED.kecepatan_jelajah,
  kecepatan_turbo = EXCLUDED.kecepatan_turbo,
  akselerasi = EXCLUDED.akselerasi,
  kelincahan = EXCLUDED.kelincahan,
  statistik_bar = EXCLUDED.statistik_bar,
  aset_model_url = EXCLUDED.aset_model_url,
  deskripsi = EXCLUDED.deskripsi,
  is_active = EXCLUDED.is_active;

-- 6.3 Seed 108 Entri Sejarah & Bentang Alam v3 (28 Entri 7 Planet Lain + 80 Entri Bumi List -> Detail)
INSERT INTO public.history_events (
  event_id, planet_id, era_label, tahun_kejadian, kategori_poi, judul, ringkasan_singkat, nama_wahana, karakteristik_fisik, gambar_url, deskripsi, sumber_referensi
) VALUES
('10000000-0000-0000-0001-000000000001', 'mercury', 'Sejarah Geologi', 1974, 'Kawah Tumbukan & Kaldera Terbesar', 'Cekungan Caloris Basin', 'Kawah tumbukan asteroid raksasa selebar 1.550 km di Merkurius.', 'Mariner 10 & MESSENGER (NASA)', 'Belahan Utara Merkurius • Diameter 1.550 km • Dikelilingi Pegunungan 2 km', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/mercury-caloris-basin.webp', 'Sekitar 3,9 miliar tahun lalu, asteroid berdiameter 100 km menghantam Merkurius dan membentuk Cekungan Caloris selebar 1.550 km. Gelombang kejutnya menembus inti planet dan meremukkan permukaan di sisi seberang planet.', 'NASA Caloris Basin'),
('10000000-0000-0000-0001-000000000002', 'mercury', 'Sejarah Geologi', 2011, 'Formasi Geologi & Tebing Kerutan', 'Tebing Enterprise Rupes', 'Tebing patahan raksasa yang terbentuk akibat menyusutnya inti besi Merkurius.', 'Wahana MESSENGER (NASA)', 'Belahan Selatan Merkurius • Tinggi 3 km • Panjang 1.000 km', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/mercury-enterprise-rupes.webp', 'Seiring mendinginnya inti besi raksasa Merkurius selama miliaran tahun, diameter planet ini menyusut sekitar 14 km. Kerak luarnya terlipat dan patah membentuk tebing raksasa Enterprise Rupes sepanjang 1.000 km.', 'NASA Mercury'),
('10000000-0000-0000-0001-000000000003', 'mercury', 'Fenomena Kutub', 2012, 'Kawah Kutub & Es Abadi', 'Es Abadi Kawah Prokofiev', 'Cadangan es air murni di kawah kutub Merkurius yang tidak pernah terkena Matahari.', 'Wahana MESSENGER (NASA)', 'Kutub Utara Merkurius • Suhu -180°C • Temuan Wahana MESSENGER', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/mercury-polar-ice.webp', 'Meskipun siang hari di khatulistiwa Merkurius mencapai 430°C, kemiringan porosnya yang hampir 0° membuat dasar kawah Prokofiev di kutub utara tidak pernah tersentuh sinar Matahari, mengawetkan miliaran ton es air murni.', 'NASA MESSENGER'),
('10000000-0000-0000-0001-000000000004', 'mercury', 'Sejarah Vulkanik', 2014, 'Kawah Tumbukan & Fitur Permukaan', 'Cekungan Kawah Rembrandt', 'Kawah tumbukan muda berisi aliran lava basal purba dan pola patahan roda.', 'Wahana MESSENGER (NASA)', 'Belahan Selatan Merkurius • Diameter 715 km • Usia ~3,9 Miliar Tahun', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/mercury-rembrandt-basin.webp', 'Cekungan tumbukan raksasa di belahan selatan Merkurius yang dasarnya dipenuhi aliran lava basal purba dan pola patahan tektonik menyerupai jeruji roda.', 'NASA Mercury Atlas'),
('10000000-0000-0000-0001-000000000005', 'venus', 'Sejarah Alam & Cuaca', 1990, 'Formasi Geologi & Pegunungan Ekstrem', 'Pegunungan Maxwell Montes', 'Pegunungan tertinggi di Venus yang puncaknya diselimuti salju logam berkilau.', 'Wahana Magellan & Pioneer Venus (NASA)', 'Dataran Tinggi Ishtar Terra • Tinggi 11 km • Lebar 797 km', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/venus-maxwell-montes.webp', 'Maxwell Montes adalah pegunungan tertinggi di Venus (11 km). Di puncaknya yang lebih sejuk dibanding dataran rendah, uap mineral timbal sulfida dan bismut sulfida mengembun menjadi lapisan ''salju logam'' yang memantulkan sinyal radar dengan sangat terang.', 'NASA Maxwell Montes'),
('10000000-0000-0000-0001-000000000006', 'venus', 'Sejarah Geologi', 1991, 'Formasi Geologi & Gunung Berapi', 'Gunung Berapi Maat Mons', 'Gunung berapi perisai tertinggi di Venus yang memicu efek rumah kaca purba.', 'Wahana Magellan (NASA)', 'Wilayah Atla Regio, Venus • Tinggi 8 km • Kaldera 28×31 km', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/venus-maat-mons.webp', 'Miliaran tahun lalu Venus diduga sempat memiliki lautan dangkal, namun letusan gunung-gunung berapi raksasa seperti Maat Mons memuntahkan karbon dioksida masif yang memicu efek rumah kaca tak terkendali dan menguapkan seluruh airnya.', 'NASA Magellan'),
('10000000-0000-0000-0001-000000000007', 'venus', 'Bentang Alam Unik', 1992, 'Kubah Vulkanik & Bentang Alam Unik', 'Kubah Lava Pancake Domes', 'Deretan kubah gunung berapi berbentuk pipih mirip kue panekuk di Venus.', 'Wahana Magellan (NASA)', 'Alpha Regio, Venus • Diameter Kubah ~25 km • Tekanan 90 Bar', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/venus-pancake-domes.webp', 'Formasi geologis unik di Venus berupa deretan kubah gunung berapi berbentuk bundar pipih mirip kue panekuk selebar 25 km yang terbentuk dari keluarnya lava silika kental di bawah tekanan atmosfer 90 bar.', 'NASA Venus Domes'),
('10000000-0000-0000-0001-000000000008', 'venus', 'Sejarah Eksplorasi', 1975, 'Titik Pendaratan & Observasi Permukaan', 'Pendaratan Venera 9', 'Wahana pertama yang berhasil memotret batuan di permukaan panas Venus.', 'Wahana Pendarat Venera 9 (Uni Soviet)', 'Permukaan Venus • Suhu 465°C • Tekanan 90 Kali Bumi', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/venus-venera9-surface.webp', 'Wahana berlapis titanium Venera 9 berhasil menembus awan asam sulfat dan mendarat di lereng berbatu Venus, mengirimkan foto pertama permukaan planet lain sebelum instrumennya lumpuh oleh panas 465°C.', 'NASA Venera Archive'),
('10000000-0000-0000-0001-000000000009', 'mars', 'Sejarah Gunung Berapi', 1971, 'Formasi Geologi & Gunung Berapi', 'Gunung Olympus Mons', 'Gunung berapi perisai tertinggi di seluruh Tata Surya, hampir 3 kali Everest.', 'Mariner 9 & Mars Express', 'Dataran Tinggi Tharsis, Mars • Tinggi 21,9 km • Lebar Kaki 600 km', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/mars-olympus-mons.webp', 'Olympus Mons menjulang setinggi 21,9 km (hampir 3 kali tinggi Gunung Everest) dengan lebar kaki gunung 600 km. Gunung ini tumbuh sedemikian raksasa karena kerak lempeng Mars tidak bergerak, sehingga titik panas magma terus menumpuk lava di satu titik selama ratusan juta tahun.', 'NASA Mars Volcanoes'),
('10000000-0000-0000-0001-000000000010', 'mars', 'Sejarah Geologi', 1972, 'Formasi Geologi & Lembah Patahan', 'Ngarai Valles Marineris', 'Lembah patahan tektonik terpanjang di Tata Surya yang membelah ekuator Mars.', 'Wahana Mariner 9 (NASA)', 'Ekuator Mars • Panjang 4.000 km • Lebar 200 km • Dalam 7 km', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/mars-valles-marineris.webp', 'Saat dataran vulkanik Tharsis membengkak akibat desakan magma dari dalam Mars, kerak planet di sebelah timurnya robek dan runtuh membentuk Valles Marineris—ngarai sepanjang 4.000 km dan sedalam 7 km yang lima kali lebih dalam dari Grand Canyon.', 'USGS Valles Marineris'),
('10000000-0000-0000-0001-000000000011', 'mars', 'Fenomena Kutub & Cuaca', 2003, 'Kutub Es & Fenomena Cuaca', 'Tudung Es Planum Boreum', 'Kubah es air dan es kering CO2 permanen yang memicu badai debu global Mars.', 'Mars Reconnaissance Orbiter (NASA)', 'Kutub Utara Mars • Diameter 1.000 km • Ketebalan Es 3 km', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/mars-polar-icecap.webp', 'Kubah lapisan es berlapis selebar 1.000 km dan setebal 3 km di kutub utara Mars yang tersusun atas es air permanen dan selimut karbon dioksida beku yang menyublim saat musim panas dan memicu angin badai debu.', 'NASA Mars Polar Cap'),
('10000000-0000-0000-0001-000000000012', 'mars', 'Sejarah Air Purba', 2012, 'Titik Pendaratan & Observasi Permukaan', 'Danau Purba Kawah Gale', 'Bukti keberadaan danau air tawar purba yang diteliti oleh rover Curiosity.', 'Curiosity Rover (NASA / JPL)', 'Kawah Gale & Gunung Sharp, Mars • Diameter 154 km • Misi 2012', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/mars-gale-crater-curiosity.webp', 'Lapisan batuan lempung dan mineral sulfat di kaki Gunung Sharp di dalam Kawah Gale membuktikan bahwa sekitar 3,5 miliar tahun lalu Mars memiliki iklim lebih hangat dengan sungai dan danau air cair yang tenang.', 'NASA Curiosity Map'),
('10000000-0000-0000-0001-000000000013', 'mars', 'Sejarah Air & Eksplorasi', 2021, 'Titik Pendaratan & Observasi Permukaan', 'Delta Sungai Kawah Jezero', 'Bekas delta sungai kuno tempat rover Perseverance & helikopter Ingenuity mendarat.', 'Perseverance Rover & Ingenuity (NASA)', 'Kawah Jezero, Mars • Diameter 45 km • Misi Mars 2020 (2021)', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/mars-jezero-perseverance.webp', 'Citra satelit dan sampel batuan di Kawah Jezero memperlihatkan bentuk kipas delta sungai purba yang dulunya mengalir masuk ke kawah danau, tempat rover Perseverance mencari jejak fosil mikroba.', 'NASA Perseverance Map'),
('10000000-0000-0000-0001-000000000014', 'jupiter', 'Sejarah Cuaca Ekstrem', 1831, 'Fitur Atmosfer & Badai Raksasa', 'Bintik Merah Raksasa', 'Badai antisiklon abadi di Jupiter yang ukurannya lebih besar dari planet Bumi.', 'Teleskop Cassini, Voyager 1 & Misi Juno', 'Belahan Selatan Jupiter • Diameter >16.000 km • Angin 680 km/jam', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/jupiter-great-red-spot.webp', 'Bintik Merah Raksasa adalah badai antisiklon bertekanan tinggi terbesar di Tata Surya yang telah berputar tanpa henti selama ratusan tahun. Karena Jupiter tidak memiliki daratan padat untuk menggesek angin, badai seukuran Bumi ini terus bertahan dengan kecepatan angin hingga 680 km/jam.', 'NASA Great Red Spot'),
('10000000-0000-0000-0001-000000000015', 'jupiter', 'Fenomena Interior & Kutub', 2016, 'Fenomena Interior & Magnetosfer', 'Samudra Hidrogen Metalik & Siklon Kutub', 'Lautan logam cair pembangkit medan magnet raksasa dan 8 siklon di kutub Jupiter.', 'Wahana Pengorbit Juno (NASA)', 'Interior & Kutub Utara Jupiter • Aurora Terkuat • Misi Juno', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/jupiter-polar-cyclones.webp', 'Di bawah awan amonia Jupiter, tekanan jutaan atmosfer memampatkan gas hidrogen menjadi cairan logam penghantar listrik yang membangkitkan medan magnet raksasa dan memicu aurora permanen di atas 8 pusaran badai siklon kutub.', 'NASA Juno Science'),
('10000000-0000-0000-0001-000000000016', 'jupiter', 'Sejarah Bulan Vulkanik', 1979, 'Satelit Alami & Aktivitas Vulkanik', 'Gunung Berapi Bulan Io', 'Bulan milik Jupiter dengan ratusan gunung berapi belerang paling aktif di Tata Surya.', 'Voyager 1, Galileo & Juno', 'Orbit Satelit Galilea Jupiter • >400 Gunung Api Aktif • Voyager 1', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/jupiter-io-volcano.webp', 'Tarikan gravitasi tarik-ulur antara Jupiter dan bulan-bulan Galilea lainnya meremas bagian dalam bulan Io hingga meleleh, menjadikannya objek dengan ratusan gunung berapi paling aktif di Tata Surya.', 'NASA Voyager Jupiter'),
('10000000-0000-0000-0001-000000000017', 'jupiter', 'Samudra Bawah Es', 1997, 'Satelit Alami & Samudra Bawah Permukaan', 'Samudra Bawah Es Europa', 'Lautan air asin cair sedalam 100 km yang tersembunyi di bawah kerak es bulan Europa.', 'Wahana Galileo & Europa Clipper (NASA)', 'Satelit Europa, Jupiter • Kedalaman Laut ~100 km • 2x Air Bumi', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/jupiter-europa-ocean.webp', 'Di bawah lapisan es retak-retak permukaan bulan Europa yang mengorbit Jupiter, tersimpan samudra air cair global sedalam 100 km yang jumlah airnya mencapai dua kali lipat total seluruh air laut di Bumi.', 'NASA Europa Science'),
('10000000-0000-0000-0001-000000000018', 'saturn', 'Sejarah Cincin Es', 1675, 'Cincin Planet & Dinamika Partikel', 'Cincin Es & Divisi Cassini', 'Bentangan cincin es air murni selebar 282.000 km dengan celah selebar 4.800 km.', 'Giovanni Cassini (1675) & Misi Cassini-Huygens', 'Ekuator Saturnus • Lebar 282.000 km • Tebal 10–100 Meter', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/saturn-rings-cassini.webp', 'Cincin Saturnus terbentuk sekitar 100 juta tahun lalu ketika sebuah bulan es purba mendekat melewati batas gravitasi Roche Saturnus dan terkoyak menjadi miliaran bongkahan es murni, dengan celah Divisi Cassini selebar 4.800 km yang disapu oleh gravitasi bulan Mimas.', 'NASA Saturn Rings'),
('10000000-0000-0000-0001-000000000019', 'saturn', 'Fenomena Cuaca Unik', 1981, 'Fitur Atmosfer & Pusaran Kutub', 'Badai Segi Enam Heksagon', 'Pusaran arus jet berbentuk segi enam geometris sempurna di kutub utara Saturnus.', 'Voyager 1, Voyager 2 & Cassini Orbiter', 'Kutub Utara Saturnus • Lebar 29.000 km • Angin 350 km/jam', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/saturn-north-hexagon.webp', 'Di kutub utara Saturnus berputar arus jet atmosfer berbentuk segi enam geometris selebar 29.000 km (dua kali diameter Bumi) dengan kecepatan angin 350 km/jam yang tetap mempertahankan bentuk heksagonalnya selama puluhan tahun.', 'NASA Saturn Hexagon'),
('10000000-0000-0000-0001-000000000020', 'saturn', 'Fenomena Bulan Saturnus', 2005, 'Titik Pendaratan & Samudra Hidrokarbon', 'Danau Metana Bulan Titan', 'Bulan terbesar Saturnus yang memiliki sungai, hujan, dan danau metana cair.', 'Wahana Pendarat Huygens (ESA / NASA)', 'Satelit Titan, Saturnus • Suhu -179°C • Pendaratan Huygens 2005', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/saturn-titan-lakes.webp', 'Bulan terbesar Saturnus, Titan, memiliki atmosfer nitrogen tebal dan suhu -179°C di mana gas metana dan etana mencair membentuk awan, hujan, sungai, hingga lautan hidrokarbon seperti Kraken Mare.', 'NASA Huygens Titan'),
('10000000-0000-0000-0001-000000000021', 'saturn', 'Fenomena Geyser Es', 2008, 'Satelit Alami & Geyser Es Aktif', 'Geyser Es Bulan Enceladus', 'Semburan uap air asin dari samudra hangat di bawah lapisan es bulan Enceladus.', 'Wahana Antariksa Cassini (NASA / ESA)', 'Kutub Selatan Enceladus • Celah Tiger Stripes • Misi Cassini', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/saturn-enceladus-plumes.webp', 'Wahana Cassini terbang menembus semburan geyser raksasa di kutub selatan bulan Enceladus dan menemukan uap air asin, molekul organik, serta partikel silika dari ventilasi hidrotermal hangat di dasar laut bawah esnya.', 'NASA Enceladus'),
('10000000-0000-0000-0001-000000000022', 'uranus', 'Fenomena Hujan Berlian', 1986, 'Fenomena Tekanan Interior & Mantel Es', 'Hujan Kristal Berlian Uranus', 'Fenomena pemampatan gas metana menjadi hujan berlian di kedalaman mantel Uranus.', 'Voyager 2 & Laboratorium SLAC', 'Mantel Es Uranus (Kedalaman 8.000 km) • Tekanan 6 Juta Bar', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/uranus-diamond-rain.webp', 'Pada kedalaman sekitar 8.000 km di bawah awan biru-kehijauan Uranus, tekanan 6 juta atmosfer dan suhu ribuan derajat memecah molekul metana (CH4) serta memampatkan atom karbonnya menjadi kristal berlian padat yang menghujani bagian dalam planet.', 'NASA Diamond Rain'),
('10000000-0000-0000-0001-000000000023', 'uranus', 'Sejarah Tumbukan Purba', 1977, 'Dinamika Poros & Tumbukan Protoplanet', 'Poros Miring 97,77° Uranus', 'Tumbukan purba yang membuat Uranus menggelinding miring beserta 13 cincinnya.', 'Observatorium Bumi & Misi Voyager 2', 'Sistem Uranus • Kemiringan 97,77° • Musim Kutub 42 Tahun', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/uranus-axial-tilt.webp', 'Para astronom menduga sebuah protoplanet seukuran dua kali Bumi menabrak Uranus di masa awal Tata Surya, menggulingkan poros rotasinya hingga rebah 97,77° beserta 13 cincin gelap dan orbit bulan-bulannya.', 'NASA Uranus'),
('10000000-0000-0000-0001-000000000024', 'uranus', 'Bentang Alam Ekstrem', 1986, 'Formasi Geologi & Tebing Es Vertikal', 'Tebing Es Verona Rupes', 'Tebing patahan es tertinggi di Tata Surya setinggi 20 km di bulan Miranda.', 'Wahana Voyager 2 (NASA)', 'Satelit Miranda, Uranus • Tinggi Tebing 20 km • Voyager 2', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/uranus-miranda-verona-rupes.webp', 'Voyager 2 memotret Verona Rupes di permukaan bulan Miranda milik Uranus, sebuah tebing patahan es vertikal setinggi 20 km (dua kali kedalaman Palung Mariana). Karena gravitasi Miranda sangat lemah, batu yang dijatuhkan dari puncaknya butuh waktu 12 menit untuk menyentuh dasar!', 'NASA Miranda Cliff'),
('10000000-0000-0000-0001-000000000025', 'neptune', 'Fenomena Hujan Berlian', 2017, 'Fenomena Tekanan Interior & Mantel Es', 'Hujan Berlian Neptunus', 'Kristal berlian yang tenggelam ke inti planet dan memanaskan bagian dalam Neptunus.', 'Voyager 2 & Eksperimen Sinar-X XFEL', 'Mantel Superionik Neptunus • Tekanan Jutaan Atmosfer', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/neptune-diamond-rain.webp', 'Di dalam mantel es Neptunus yang bertekanan jutaan kali atmosfer Bumi, molekul hidrokarbon metana terpecah menjadi berlian murni yang tenggelam menuju inti planet. Gesekan jatuhnya hujan berlian ini ikut menyumbang panas internal Neptunus.', 'NASA Diamond Rain'),
('10000000-0000-0000-0001-000000000026', 'neptune', 'Sejarah Cuaca Ekstrem', 1989, 'Fitur Atmosfer & Badai Supersonik', 'Bintik Gelap & Angin Supersonik', 'Badai seukuran Bumi dengan hembusan angin tercepat di Tata Surya (>2.100 km/jam).', 'Wahana Voyager 2 & Teleskop Luar Angkasa Hubble', 'Atmosfer Neptunus • Kecepatan Angin >2.100 km/jam • Voyager 2', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/neptune-great-dark-spot.webp', 'Panas internal Neptunus menggerakkan pusaran badai antisiklon seukuran Bumi (Great Dark Spot) dengan hembusan angin tercepat di Tata Surya yang mencapai 2.100 km/jam, didampingi awan es metana putih tinggi bernama ''Scooter''.', 'NASA Neptune Winds'),
('10000000-0000-0000-0001-000000000027', 'neptune', 'Fenomena Bulan Triton', 1989, 'Satelit Alami & Vulkanisme Es (Kriovulkanik)', 'Geyser Nitrogen Bulan Triton', 'Gunung berapi es aktif yang menyemburkan gas nitrogen cair setinggi 8 km.', 'Wahana Voyager 2 (NASA)', 'Satelit Triton, Neptunus • Suhu -235°C • Semburan 8 km', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/neptune-triton-geysers.webp', 'Bulan terbesar Neptunus, Triton, mengorbit berlawanan arah rotasi planet (retrograde) dan memiliki gunung berapi es aktif yang menyemburkan tiang gas nitrogen cair serta debu organik gelap setinggi 8 km di suhu -235°C.', 'NASA Triton Geysers'),
('10000000-0000-0000-0001-000000000028', 'neptune', 'Penemuan Matematis', 1846, 'Observasi Astronomi & Penemuan Bersejarah', 'Penemuan Matematis Neptunus', 'Planet pertama yang ditemukan lewat rumus matematika sebelum terlihat di teleskop.', 'Urbain Le Verrier, John Couch Adams & Johann Galle', 'Observatorium Berlin • Tahun 1846 • Urbain Le Verrier & Johann Galle', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/neptune-mathematical-discovery.webp', 'Neptunus adalah planet pertama dalam sejarah yang keberadaannya diprediksi terlebih dahulu lewat perhitungan matematika gangguan gravitasi orbit Uranus oleh Urbain Le Verrier dan John Couch Adams sebelum akhirnya terlihat di teleskop pada 23 September 1846.', 'NASA Neptune Discovery'),
('10000000-0000-0000-0002-000000000001', 'earth', 'Zaman Awal Bumi & Purba', -400000, 'Situs Geologi Purba', 'Batuan Tertua Acasta Gneiss', 'Singkapan batuan kerak benua tertua di Bumi yang masih bertahan hingga kini.', 'Tim Riset Geologi Samuel Bowring', 'Kanada Barat Laut • Usia 4,03 Miliar Tahun', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-01-acasta-gneiss.webp', 'Singkapan batuan Acasta Gneiss di Kanada adalah bukti fisik kerak benua tertua yang masih bertahan di Bumi, terbentuk saat Bumi purba baru saja mendingin dari lautan magma cair.', 'NASA Earth Geology'),
('10000000-0000-0000-0002-000000000002', 'earth', 'Zaman Awal Bumi & Purba', -350000, 'Situs Biosfer & Fosil Hidup', 'Stromatolit Shark Bay', 'Koloni mikroba purba yang pertama kali menghasilkan gas oksigen di Bumi.', 'Koloni Sianobakteri Purba', 'Australia Barat • Usia 3,5 Miliar Tahun', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-02-stromatolites.webp', 'Stromatolit adalah struktur batuan hidup yang dibentuk mikroba sianobakteri purba sejak 3,5 miliar tahun lalu. Melalui fotosintesis, mikroba inilah yang pertama kali mengisi atmosfer Bumi dengan gas oksigen.', 'NASA Astrobiology'),
('10000000-0000-0000-0002-000000000003', 'earth', 'Zaman Awal Bumi & Purba', -50800, 'Situs Paleontologi & Fosil Purba', 'Ledakan Kambrium Burgess Shale', 'Munculnya beragam hewan laut bercangkang dan bertulang belakang untuk pertama kalinya.', 'Charles Doolittle Walcott (1909, 51.4286, -116.4719)', 'Pegunungan Rocky, Kanada • ~508 Juta Tahun Lalu', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-03-burgess-shale.webp', 'Lapisan batuan Burgess Shale merekam peristiwa Ledakan Kambrium (508 juta tahun lalu) ketika sebagian besar kelompok hewan laut bercangkang dan bertulang belakang pertama kali muncul serentak.', 'Earth Paleontology'),
('10000000-0000-0000-0002-000000000004', 'earth', 'Zaman Awal Bumi & Purba', -4500, 'Bentang Alam & Hidrologi', 'Danau Baikal', 'Danau air tawar tertua sekaligus terdalam di Bumi hingga saat ini.', 'Ekspedisi Hidrologi Rusia', 'Siberia Selatan, Rusia • Kedalaman 1.642 Meter • Usia ~25 Juta Tahun', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-08-lake-baikal.webp', 'Terbentuk dari rekahan lempeng benua berusia 25 juta tahun, Danau Baikal adalah danau terdalam dan tertua di dunia yang menampung 20% air tawar cair di permukaan Bumi.', 'Earth Hydrology'),
('10000000-0000-0000-0002-000000000005', 'earth', 'Zaman Awal Bumi & Purba', -4200, 'Formasi Geologi & Tektonik Benua', 'Great Rift Valley Afrika', 'Lembah patahan benua raksasa sepanjang 6.000 km di Afrika Timur.', 'John Walter Gregory (1893, 0.35, 36.1)', 'Ethiopia–Mozambik, Afrika Timur • Panjang 6.000 km', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-09-great-rift-valley.webp', 'Sistem lembah patahan tektonik raksasa sepanjang 6.000 km yang membelah benua Afrika secara perlahan dan melahirkan deretan danau dalam serta gunung berapi purba.', 'African Rift Geology'),
('10000000-0000-0000-0002-000000000006', 'earth', 'Zaman Awal Bumi & Purba', -4000, 'Formasi Geologi & Erosi Batuan', 'Ngarai Grand Canyon', 'Lembah ngarai curam yang menyingkap lapisan batuan Bumi selama 2 miliar tahun.', 'John Wesley Powell (1869, 36.0544, -112.1401)', 'Arizona, Amerika Serikat • Panjang 446 km • Dalam 1,8 km', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-10-grand-canyon.webp', 'Lembah ngarai curam yang diukir aliran Sungai Colorado selama jutaan tahun, menyingkap lapisan batuan warna-warni yang merekam sejarah geologi Bumi sepanjang 2 miliar tahun.', 'USGS Grand Canyon'),
('10000000-0000-0000-0002-000000000007', 'earth', 'Zaman Awal Bumi & Purba', -3800, 'Formasi Geologi & Gunung Api Samudra', 'Gunung Mauna Kea', 'Gunung tertinggi di Bumi jika diukur dari kaki dasarnya di lantai dasar laut.', 'Pusat Observatorium Astronomi Mauna Kea', 'Kepulauan Hawaii, Pasifik • Tinggi Total 10.210 m (6.000 m di Bawah Laut, 19.8206, -155.4681)', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-11-mauna-kea.webp', 'Jika diukur dari kakinya di dasar Samudra Pasifik (sedalam 6.000 m) hingga puncaknya di atas laut (4.207 m), Gunung Mauna Kea memiliki tinggi total 10.210 meter—lebih tinggi 1,4 km dibanding Gunung Everest!', 'USGS Mauna Kea'),
('10000000-0000-0000-0002-000000000008', 'earth', 'Zaman Dinosaurus & Kapur', -23000, 'Geologi Tektonik & Rekonstruksi Purba', 'Superbenua Pangaea (Zaman Trias, 20, 0)', 'Masa ketika seluruh benua Bumi masih menyatu dan dinosaurus pertama muncul.', 'Teori Pergeseran Benua Alfred Wegener', 'Daratan Tunggal Purba • ~230 Juta Tahun Lalu', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-pangaea-triassic.webp', 'Sekitar 230 juta tahun lalu pada Zaman Trias, seluruh benua di Bumi masih menyatu menjadi satu superbenua raksasa bernama Pangaea, tempat dinosaurus awal mulai muncul dan beradaptasi.', 'Triassic Pangaea'),
('10000000-0000-0000-0002-000000000009', 'earth', 'Zaman Dinosaurus & Kapur', -15000, 'Situs Paleontologi & Dinosaurus', 'Zaman Jura (Brachiosaurus & Stegosaurus, 39.65, -105.19)', 'Era hutan pakis raksasa yang menjadi habitat dinosaurus berleher panjang.', 'Othniel Charles Marsh & Edward Drinker Cope', 'Formasi Morrison, Amerika Utara • ~150 Juta Tahun Lalu', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-05-morrison-dinosaurs.webp', 'Pada Zaman Jura (~150 juta tahun lalu), benua mulai terpisah dan iklim hangat menyuburkan hutan konifer serta pakis raksasa yang menjadi habitat dinosaurus herbivora raksasa seperti Brachiosaurus.', 'Jurassic Era'),
('10000000-0000-0000-0002-000000000010', 'earth', 'Zaman Dinosaurus & Kapur', -9500, 'Situs Paleontologi & Dinosaurus Raksasa', 'Zaman Kapur: Argentinosaurus', 'Dinosaurus pemakan tumbuhan terbesar yang pernah berjalan di daratan Bumi.', 'Guillermo Heredia & José Bonaparte', 'Patagonia, Argentina • Panjang 37 m • Bobot ~70 Ton', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-04-argentinosaurus.webp', 'Pada Zaman Kapur, daratan Amerika Selatan dihuni oleh dinosaurus pemakan tumbuhan terbesar sepanjang masa seperti Argentinosaurus dan Patagotitan, berdampingan dengan munculnya tumbuhan berbunga pertama di Bumi.', 'Cretaceous Patagonia'),
('10000000-0000-0000-0002-000000000011', 'earth', 'Zaman Dinosaurus & Kapur', -6800, 'Situs Paleontologi & Fauna Purba', 'Zaman Kapur Akhir (T-Rex & Triceratops, 47.5, -106.5)', 'Puncak keragaman dinosaurus serta awal munculnya dinosaurus berbulu nenek moyang burung.', 'Barnum Brown & Henry Fairfield Osborn', 'Amerika Utara & Asia • ~68 Juta Tahun Lalu', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-cretaceous-trex.webp', 'Menjelang akhir Zaman Kapur (~68 juta tahun lalu), daratan Bumi dihuni dinosaurus ikonik seperti Triceratops dan T-Rex sementara dinosaurus berbulu mulai berevolusi menjadi nenek moyang burung modern.', 'Late Cretaceous'),
('10000000-0000-0000-0002-000000000012', 'earth', 'Zaman Dinosaurus & Kapur', -6600, 'Kawah Tumbukan & Peristiwa Kepunahan', 'Kawah Asteroid Chicxulub', 'Tumbukan asteroid di akhir Zaman Kapur yang mengakhiri era dinosaurus.', 'Antonio Camargo & Glen Penfield', 'Semenanjung Yucatán, Meksiko • Diameter Kawah 180 km • ~66 Juta Lalu', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-06-chicxulub-crater.webp', 'Sekitar 66 juta tahun lalu, asteroid selebar 10–15 km menghantam Meksiko dan membentuk Kawah Chicxulub selebar 180 km. Debu tebal menutup sinar Matahari sehingga mengakhiri era dinosaurus non-unggas dan membuka jalan bagi mamalia.', 'NASA JPL Chicxulub'),
('10000000-0000-0000-0002-000000000013', 'earth', 'Zaman Dinosaurus & Kapur', -5000, 'Bentang Alam & Titik Tertinggi Bumi', 'Gunung Everest', 'Puncak daratan tertinggi di Bumi yang terbentuk dari tabrakan Lempeng India dan Eurasia.', 'Sir George Everest, Edmund Hillary & Tenzing Norgay', 'Perbatasan Nepal–Tibet • Tinggi 8.848,86 mdpl • Terbentuk ~50 Juta Lalu', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-07-mount-everest.webp', 'Setelah zaman dinosaurus berakhir (~50 juta tahun lalu, 27.9881, 86.925), Lempeng India bergerak ke utara dan bertabrakan dengan Lempeng Eurasia, melipat kerak Bumi menjadi Pegunungan Himalaya dan puncak tertinggi Gunung Everest.', 'NASA Earth Tectonics'),
('10000000-0000-0000-0002-000000000014', 'earth', 'Zaman Dinosaurus & Kapur', -3600, 'Formasi Geologi & Supervolcano', 'Kaldera Danau Toba', 'Danau vulkanik terbesar di dunia yang terbentuk dari letusan supervolcano purba.', 'Pusat Vulkanologi & Geologi Indonesia', 'Sumatera Utara, Indonesia • Panjang 100 km • Lebar 30 km • ~74.000 SM', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-12-lake-toba.webp', 'Sekitar 74.000 tahun lalu, letusan supervolcano Toba memuntahkan material vulkanik terbesar dalam 2 juta tahun terakhir dan membentuk kaldera raksasa Danau Toba sepanjang 100 km.', 'Toba Caldera'),
('10000000-0000-0000-0002-000000000015', 'earth', 'Zaman Manusia Purba & Batu', -3500, 'Situs Paleoantropologi & Asal Usul Manusia', 'Ngarai Olduvai', 'Situs penemuan perkakas batu pertama dalam sejarah manusia purba.', 'Louis Leakey & Mary Leakey', 'Serengeti, Tanzania • Panjang 48 km • ~1,8 Juta Tahun Lalu', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-13-olduvai-gorge.webp', 'Lembah curam di Afrika Timur tempat ditemukannya fosil hominid awal dan perkakas batu pukul tertua yang menandai dimulainya Zaman Batu dalam sejarah manusia.', 'Olduvai Paleo'),
('10000000-0000-0000-0002-000000000016', 'earth', 'Zaman Manusia Purba & Batu', -3400, 'Situs Warisan Dunia & Fosil Hominid', 'Situs Manusia Purba Sangiran', 'Situs warisan dunia penyimpan lebih dari separuh fosil Homo erectus dunia.', 'G.H.R. von Koenigswald (1936, -7.4619, 110.8353)', 'Sragen & Karanganyar, Jawa Tengah • Luas 56 km² • ~1,5 Juta Tahun Lalu', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-14-sangiran-fossil.webp', 'Kubah Sangiran menyimpan lebih dari separuh temuan fosil Homo erectus di dunia beserta alat serpih batu yang menceritakan adaptasi manusia purba di Nusantara.', 'Sangiran Early Man'),
('10000000-0000-0000-0002-000000000017', 'earth', 'Zaman Manusia Purba & Batu', -3300, 'Situs Paleoantropologi Nusantara', 'Situs Trinil Bengawan Solo', 'Lokasi penemuan fosil Pithecanthropus erectus oleh Eugene Dubois di Jawa Timur.', 'Eugène Dubois (1891, -7.3719, 111.3575)', 'Ngawi, Jawa Timur • Ditemukan Tahun 1891 • Usia ~500.000 Tahun', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-15-trinil-bengawan-solo.webp', 'Lokasi bersejarah penemuan fosil Pithecanthropus erectus di tepi Sungai Bengawan Solo yang menjadi tonggak penting ilmu paleoantropologi dunia.', 'Trinil Site'),
('10000000-0000-0000-0002-000000000018', 'earth', 'Zaman Manusia Purba & Batu', -3250, 'Situs Arkeologi & Budaya Api Purba', 'Gua Api Purba Zhoukoudian', 'Bukti awal kemampuan manusia purba mengendalikan api untuk memasak dan menghangatkan diri.', 'Pei Wenzhong & Davidson Black', 'Beijing, Tiongkok • Usia ~700.000 Tahun', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-16-zhoukoudian-fire.webp', 'Lapisan abu tebal di dalam gua kapur Zhoukoudian membuktikan bahwa manusia purba telah mampu mengendalikan api untuk menghangatkan diri dan memasak.', 'Zhoukoudian Site'),
('10000000-0000-0000-0002-000000000019', 'earth', 'Zaman Manusia Purba & Batu', -3200, 'Situs Seni Cadas Prasejarah', 'Lukisan Gua Maros-Pangkep', 'Lukisan cadas Zaman Batu tertua di dunia yang berada di gua kapur Sulawesi Selatan.', 'Tim Arkeologi Pusat Riset Arkeologi Nasional', 'Leang Tedongnge, Sulawesi Selatan • Usia >45.500 Tahun', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-17-maros-pangkep-cave.webp', 'Lukisan cadas babi hutan dan cap tangan manusia menggunakan pigmen oker merah di gua kapur Sulawesi Selatan yang diakui sebagai karya seni Zaman Batu tertua di dunia.', 'Sulawesi Cave Art'),
('10000000-0000-0000-0002-000000000020', 'earth', 'Zaman Manusia Purba & Batu', -3150, 'Situs Seni Cadas Paleolitikum', 'Gua Lascaux', 'Galeri seni lukis Zaman Es Akhir dengan lebih dari 600 gambar hewan purba.', 'Marcel Ravidat & Jacques Marsal', 'Dordogne, Prancis • Usia ~17.000 Tahun', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-18-lascaux-cave.webp', 'Dinding gua bawah tanah yang dipenuhi ratusan lukisan kuda, rusa, dan bison zaman es karya manusia Paleolitikum Akhir.', 'Lascaux Cave'),
('10000000-0000-0000-0002-000000000021', 'earth', 'Zaman Manusia Purba & Batu', -3100, 'Situs Megalitikum Kuno', 'Kuil Batu Göbekli Tepe', 'Kompleks pilar batu megalitikum tertua di Bumi dari penghujung Zaman Batu.', 'Prof. Klaus Schmidt & Institut Arkeologi Jerman', 'Şanlıurfa, Turki • Berat Pilar 10–20 Ton • ~9600 SM', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-19-gobekli-tepe.webp', 'Lingkaran pilar batu kapur berbentuk huruf T seberat 10–20 ton yang dibangun oleh masyarakat di penghujung Zaman Batu, ribuan tahun sebelum Piramida Giza.', 'Gobekli Tepe'),
('10000000-0000-0000-0002-000000000022', 'earth', 'Zaman Manusia Purba & Batu', -3050, 'Tonggak Sejarah Domestikasi & Pertanian', 'Revolusi Pertanian Neolitikum', 'Peralihan manusia dari berburu menjadi bercocok tanam dan membangun desa permanen.', 'Komunitas Petani Awal Jericho & Anatolia', 'Bulan Sabit Subur (Jericho & Anatolia, 31.8697, 35.4444) • ~8500 SM', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-20-fertile-crescent.webp', 'Titik balik sejarah manusia ketika masyarakat mulai bercocok tanam gandum, menjinakkan ternak, dan mendirikan kota batu permanen pertama.', 'Neolithic Revolution'),
('10000000-0000-0000-0002-000000000023', 'earth', 'Zaman Manusia Purba & Batu', -3000, 'Monumen Megalitikum & Kalender Kuno', 'Lingkaran Batu Stonehenge', 'Monumen batu raksasa yang disejajarkan dengan arah terbit Matahari.', 'Masyarakat Neolitikum & Zaman Perunggu Inggris', 'Wiltshire, Inggris • Berat Batu ~25 Ton • ~3000 SM', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-21-stonehenge.webp', 'Susunan batu sarsen raksasa seberat 25 ton yang disejajarkan masyarakat Zaman Batu Akhir dengan arah terbitnya Matahari pada titik balik musim panas.', 'Stonehenge'),
('10000000-0000-0000-0002-000000000024', 'earth', 'Zaman Manusia Purba & Batu', -2900, 'Situs Megalitikum & Punden Berundak', 'Situs Megalitikum Gunung Padang', 'Punden berundak batu vulkanik heksagonal terbesar dari era Megalitikum Nusantara.', 'Pusat Penelitian Arkeologi Nasional Indonesia', 'Cianjur, Jawa Barat • 5 Teras Punden Berundak', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-22-gunung-padang.webp', 'Warisan zaman batu besar di Indonesia berupa teras batu kolom vulkanik heksagonal di Gunung Padang dan patung-patung batu megalit di Lembah Bada.', 'Indonesian Megaliths'),
('10000000-0000-0000-0002-000000000025', 'earth', 'Zaman Peradaban Kuno & Kenabian', -2800, 'Situs Peradaban Kuno & Literasi Aksara Paku', 'Peradaban Mesopotamia', 'Lahirnya roda, tulisan aksara paku, serta pembagian waktu 60 menit dan 60 detik.', 'Masyarakat Bangsa Sumeria & Babilonia', 'Lembah Eufrat–Tigris, Irak • ~3500 SM', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-23-mesopotamia-babylon.webp', 'Peradaban kota pertama di dunia yang menemukan roda, tulisan aksara paku di tablet tanah liat, serta sistem pembagian waktu 60 menit dan 60 detik yang masih kita pakai hingga kini.', 'Mesopotamia'),
('10000000-0000-0000-0002-000000000026', 'earth', 'Zaman Peradaban Kuno & Kenabian', -2560, 'Keajaiban Dunia Kuno & Monumen Batu', 'Piramida Agung Giza', 'Keajaiban dunia kuno dari 2,3 juta blok batu kapur dan granit di Mesir.', 'Firaun Khufu & Arsitek Hemiunu', 'Giza, Kairo, Mesir • Tinggi Awal 146,6 m • ~2560 SM', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-24-pyramids-giza.webp', 'Satu-satunya dari Tujuh Keajaiban Dunia Kuno yang masih berdiri hingga hari ini. Disusun dari 2,3 juta blok batu kapur dan granit dengan presisi arah mata angin yang menakjubkan.', 'Great Pyramid of Giza'),
('10000000-0000-0000-0002-000000000027', 'earth', 'Zaman Peradaban Kuno & Kenabian', -2500, 'Peradaban Kuno & Tata Kota Modern', 'Kota Kuno Mohenjo-daro', 'Kota kuno berpola jalan lurus yang sudah memiliki saluran sanitasi dan drainase modern.', 'R.D. Banerji & Sir John Marshall', 'Lembah Sungai Indus, Pakistan • ~2500 SM', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-25-mohenjo-daro.webp', 'Kota kuno berpola jalan kisi-kisi (grid, 27.3294, 68.1389) yang sudah dilengkapi rumah bertingkat, pemandian umum besar, dan saluran drainase tertutup di setiap rumah.', 'Indus Valley'),
('10000000-0000-0000-0002-000000000028', 'earth', 'Zaman Peradaban Kuno & Kenabian', -2000, 'Situs Sejarah Kenabian & Pusat Spiritual', 'Pembangunan Ka''bah di Makkah', 'Sejarah pembangunan Baitullah oleh Nabi Ibrahim AS dan Nabi Ismail AS menurut Islam.', 'Nabi Ibrahim AS & Nabi Ismail AS', 'Masjidil Haram, Makkah • Batu Granit Sekitar Haram • Tinggi ~13 m', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-26-makkah-kaaba.webp', 'Ka''bah (Baitullah, 21.4225, 39.8262) adalah kiblat umat Islam sedunia hingga saat ini. Menurut Islam (QS. Al-Baqarah: 127), fondasi Ka''bah ditinggikan kembali oleh Nabi Ibrahim AS bersama Nabi Ismail AS menggunakan batu-batu granit kokoh dari perbukitan sekitar Makkah, dilengkapi Hajar Aswad, Maqam Ibrahim, serta Sumur Zamzam.', 'Makkah Kaaba'),
('10000000-0000-0000-0002-000000000029', 'earth', 'Zaman Peradaban Kuno & Kenabian', -1000, 'Situs Sejarah Kenabian & Kiblat Pertama', 'Masjidil Aqsa Al-Quds', 'Kiblat pertama umat Islam sekaligus lokasi peristiwa Isra'' Mi''raj.', 'Nabi Daud AS, Nabi Sulaiman AS & Khalifah Abdul Malik', 'Kota Tua Al-Quds (Yerusalem, 31.7761, 35.2358) • Kompleks 14,4 Hektare', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-27-masjid-al-aqsa.webp', 'Kompleks bersejarah tempat berdirinya Masjidil Aqsa yang menjadi kiblat pertama umat Islam sebelum Ka''bah serta titik perjalanan spiritual Isra'' Mi''raj Nabi Muhammad SAW.', 'Al-Quds History'),
('10000000-0000-0000-0002-000000000030', 'earth', 'Zaman Peradaban Kuno & Kenabian', -447, 'Pusat Filsafat Klasik & Geometri Bumi', 'Acropolis Athena & Eratosthenes', 'Pusat geometri Yunani kuno dan perhitungan keliling Bumi dari bayangan tongkat.', 'Perikles, Iktinos & Astronom Eratosthenes', 'Athena & Alexandria • Keliling Bumi ~40.000 km • 447–240 SM', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-28-athens-acropolis.webp', 'Pusat peradaban Yunani Klasik tempat lahirnya geometri serta keberhasilan Eratosthenes (240 SM, 37.9715, 23.7257) menghitung keliling bola Bumi hanya bermodal bayangan tongkat dan sinar Matahari.', 'Classical Greece'),
('10000000-0000-0000-0002-000000000031', 'earth', 'Zaman Peradaban Kuno & Kenabian', -220, 'Benteng Kuno & Warisan Peradaban', 'Tembok Besar Tiongkok', 'Jaringan benteng batu terpanjang buatan manusia melintasi pegunungan Tiongkok.', 'Kaisar Qin Shi Huang & Dinasti Ming', 'Tiongkok Utara & Xi''an • Panjang 21.196 km • ~220 SM', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-29-great-wall-china.webp', 'Jaringan benteng batu terpanjang buatan manusia yang melintasi pegunungan dan gurun Tiongkok utara, disertai makam 8.000 patung prajurit Terakota di Xi''an.', 'Great Wall of China'),
('10000000-0000-0000-0002-000000000032', 'earth', 'Zaman Peradaban Kuno & Kenabian', -100, 'Arsitektur Kuno Pahat Tebing', 'Kota Batu Petra', 'Kota perdagangan kafilah yang dipahat langsung pada dinding tebing batu merah muda.', 'Bangsa Nabatea & Johann Ludwig Burckhardt', 'Ma''an, Yordania • Tinggi Al-Khazneh 39 m • ~100 SM', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-30-petra-jordan.webp', 'Kota perdagangan kafilah yang dipahat langsung pada dinding tebing batu pasir merah muda lengkap dengan sistem pipa air bersih di tengah gurun.', 'Petra Jordan'),
('10000000-0000-0000-0002-000000000033', 'earth', 'Zaman Peradaban Kuno & Kenabian', 80, 'Arsitektur Klasik & Amfiteater Romawi', 'Colosseum Roma', 'Amfiteater batu dan beton vulkanik kuno yang bertahan hampir 2.000 tahun.', 'Kaisar Vespasianus & Titus', 'Roma, Italia • Kapasitas 50.000 Penonton • Tahun 80 M', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-31-roman-colosseum.webp', 'Ikon arsitektur Romawi kuno yang dibangun dengan beton abu vulkanik (pozzolana, 41.8902, 12.4922) tahan air laut sehingga tetap berdiri kokoh selama hampir 2.000 tahun.', 'Roman Colosseum'),
('10000000-0000-0000-0002-000000000034', 'earth', 'Zaman Peradaban Kuno & Kenabian', 610, 'Situs Sejarah Islam & Kenabian', 'Gua Hira & Wahyu Pertama', 'Lokasi turunnya wahyu pertama Al-Qur''an (''Iqra'', 19.6925, -98.8438) kepada Nabi Muhammad SAW.', 'Nabi Muhammad SAW & Malaikat Jibril AS', 'Jabal Nur, Makkah • Tinggi Bukit 634 m • Tahun 610 M', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-32-gua-hira.webp', 'Gua di puncak Jabal Nur tempat Nabi Muhammad SAW menerima wahyu pertama QS. Al-Alaq: 1–5 yang dimulai dengan kata ''Iqra'' (Bacalah), menjadi titik awal peradaban ilmu dalam Islam.', 'Jabal Nur'),
('10000000-0000-0000-0002-000000000035', 'earth', 'Zaman Peradaban Kuno & Kenabian', 622, 'Situs Sejarah Kenabian & Peradaban Islam', 'Masjid Nabawi & Hijrah Madinah', 'Awal perhitungan Kalender Hijriah dan berdirinya masyarakat Madinah yang damai.', 'Nabi Muhammad SAW & Kaum Muhajirin-Anshar', 'Madinah Al-Munawwarah • Tahun 1 Hijriah (622 M, 24.4672, 39.6108)', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-33-masjid-nabawi.webp', 'Peristiwa hijrah ke Madinah pada 622 M yang menandai tahun pertama Kalender Hijriah serta penyusunan Piagam Madinah sebagai konstitusi masyarakat majemuk yang damai.', 'Madinah History'),
('10000000-0000-0000-0002-000000000036', 'earth', 'Zaman Pertengahan & Nusantara', 750, 'Arsitektur Astronomi Suku Maya', 'Piramida Chichén Itzá', 'Piramida kalender astronomi suku Maya dengan 365 anak tangga.', 'Peradaban Bangsa Maya (Toltek-Maya, 20.6843, -88.5678)', 'Yucatán, Meksiko • Tinggi 30 m • 365 Anak Tangga • ~750 M', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-34-chichen-itza.webp', 'Piramida suku Maya yang dirancang mengikuti pergerakan Matahari: memiliki 365 anak tangga sesuai jumlah hari dalam setahun dan menampilkan bayangan ular saat ekuinoks.', 'Chichen Itza'),
('10000000-0000-0000-0002-000000000037', 'earth', 'Zaman Pertengahan & Nusantara', 800, 'Mahakarya Arsitektur Batu Nusantara', 'Candi Borobudur', 'Candi batu vulkanik terbesar di dunia yang disusun tanpa semen di Tanah Jawa.', 'Dinasti Syailendra & Arsitek Gunadharma', 'Magelang, Jawa Tengah • 2 Juta Balok Batu • Tinggi 35 m • ~800 M', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-35-candi-borobudur.webp', 'Mahakarya arsitektur Nusantara abad ke-8 hingga ke-9 yang disusun dari 2 juta balok batu andesit menggunakan teknik sambungan kunci batu tanpa semen.', 'Borobudur'),
('10000000-0000-0000-0002-000000000038', 'earth', 'Zaman Pertengahan & Nusantara', 830, 'Pusat Sains & Zaman Keemasan Islam', 'Baitul Hikmah Baghdad', 'Pusat ilmu pengetahuan dunia tempat lahirnya Aljabar, Algoritma, dan ilmu Optik.', 'Khalifah Al-Ma''mun, Al-Khwarizmi & Ibnu Al-Haytham', 'Baghdad, Irak • Al-Khwarizmi & Ibnu Al-Haytham • ~830 M', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-36-house-of-wisdom.webp', 'Pusat keilmuan dunia abad ke-9 tempat Al-Khwarizmi merumuskan Aljabar & Algoritma (dasar komputer modern, 33.3406, 44.4009) serta Ibnu Al-Haytham meletakkan dasar metode ilmiah dan kamera obscura.', 'House of Wisdom'),
('10000000-0000-0000-0002-000000000039', 'earth', 'Zaman Pertengahan & Nusantara', 859, 'Pusat Pendidikan Tinggi Tertua Dunia', 'Universitas Al-Qarawiyyin', 'Universitas tertua di dunia yang didirikan oleh Fatimah al-Fihri dan masih aktif.', 'Fatimah binti Muhammad al-Fihri', 'Fez, Maroko • Didirikan Tahun 859 M • Rekor UNESCO', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-37-al-qarawiyyin.webp', 'Didirikan oleh Fatimah al-Fihri pada 859 M dan diakui UNESCO serta Guinness World Records sebagai perguruan tinggi tertua di dunia yang masih beroperasi hingga sekarang.', 'Al-Qarawiyyin'),
('10000000-0000-0000-0002-000000000040', 'earth', 'Zaman Pertengahan & Nusantara', 1000, 'Penjelajahan Maritim Samudra Atlantik', 'Pelayaran Viking ke Amerika', 'Bangsa Viking pimpinan Leif Erikson mencapai Amerika Utara 500 tahun sebelum Columbus.', 'Leif Erikson & Kru Ekspedisi Nordik', 'L''Anse aux Meadows, Kanada • Tahun ~1000 M • Situs UNESCO', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-viking-vinland.webp', 'Sekitar tahun 1000 M, penjelajah Viking asal Nordik yang dipimpin Leif Erikson berlayar melintasi Samudra Atlantik Utara dan mendirikan permukiman di L''Anse aux Meadows (Kanada, 51.5956, -55.5342)—menjadi bangsa Eropa pertama yang menginjakkan kaki di Benua Amerika, 500 tahun sebelum Columbus!', 'Parks Canada Viking Site'),
('10000000-0000-0000-0002-000000000041', 'earth', 'Zaman Pertengahan & Nusantara', 1150, 'Monumen Keagamaan & Hidrolik Kuno', 'Kompleks Angkor Wat', 'Monumen keagamaan terluas di dunia dengan sistem kanal dan waduk kuno.', 'Raja Suryawarman II (Kemaharajaan Khmer, 13.4125, 103.867)', 'Siem Reap, Kamboja • Luas 162,6 Hektare • ~1150 M', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-38-angkor-wat.webp', 'Kompleks bangunan batu pasir terbesar di dunia yang dikelilingi jaringan kanal dan waduk penyimpanan air raksasa untuk mengairi pertanian masyarakat Khmer.', 'Angkor Wat'),
('10000000-0000-0000-0002-000000000042', 'earth', 'Zaman Pertengahan & Nusantara', 1350, 'Peradaban Maritim & Jalur Rempah Nusantara', 'Kemaharajaan Majapahit', 'Pusat maritim Nusantara yang menghubungkan Jalur Rempah dunia secara damai.', 'Hayam Wuruk & Mahapatih Gajah Mada', 'Trowulan, Jawa Timur & Maluku • Abad ke-14 (1350 M, -7.5562, 112.3813)', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-39-majapahit-spice.webp', 'Pusat peradaban maritim Nusantara yang menghubungkan kepulauan penghasil cengkih dan pala di Maluku dengan jalur perdagangan damai Asia dan Timur Tengah.', 'Majapahit Maritime'),
('10000000-0000-0000-0002-000000000043', 'earth', 'Zaman Pertengahan & Nusantara', 1405, 'Penjelajahan Maritim & Jalur Sutra Laut', 'Pelayaran Laksamana Cheng Ho', 'Armada kayu raksasa yang berlayar damai ke Nusantara dan Samudra Hindia.', 'Laksamana Cheng Ho & Armada Kapal Harta Dinasti Ming', 'Semarang, Malaka & Samudra Hindia • 1405–1433 M', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-zheng-he-voyage.webp', 'Antara 1405–1433, Laksamana Cheng Ho memimpin armada kapal kayu raksasa melintasi Samudra Hindia dan singgah di berbagai pelabuhan Nusantara (Samudera Pasai, Palembang, Semarang, -6.9826, 110.3922) untuk mempererat perdagangan dan diplomasi damai.', 'Maritime Silk Road'),
('10000000-0000-0000-0002-000000000044', 'earth', 'Zaman Pertengahan & Nusantara', 1420, 'Pusat Astronomi & Pemetaan Bintang Kuno', 'Observatorium Ulugh Beg', 'Observatorium astronomi raksasa penyusun katalog 1.018 bintang di Samarkand.', 'Sultan Ulugh Beg & Para Astronom Samarkand', 'Samarkand, Uzbekistan • Radius Sekstan 40 m • Tahun 1420 M', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-40-ulugh-beg.webp', 'Observatorium raksasa abad ke-15 yang berhasil menyusun katalog 1.018 bintang dan mengukur panjang satu tahun Bumi dengan selisih kurang dari satu menit dibanding satelit modern.', 'Ulugh Beg'),
('10000000-0000-0000-0002-000000000045', 'earth', 'Zaman Pertengahan & Nusantara', 1450, 'Arsitektur Megah Pegunungan Andes', 'Kota Awan Machu Picchu', 'Kota batu peradaban Inca di puncak pegunungan Andes yang tahan gempa.', 'Kaisar Pachacuti & Hiram Bingham', 'Pegunungan Andes, Peru • Ketinggian 2.430 mdpl • ~1450 M', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-41-machu-picchu.webp', 'Kota batu peradaban Inca di punggung curam Pegunungan Andes yang dipahat presisi tanpa semen sehingga tahan terhadap guncangan gempa bumi.', 'Machu Picchu'),
('10000000-0000-0000-0002-000000000046', 'earth', 'Zaman Pertengahan & Nusantara', 1455, 'Revolusi Teknologi Informasi & Percetakan', 'Mesin Cetak Gutenberg', 'Penemuan mesin cetak bergerak yang mempercepat penyebaran buku dan ilmu.', 'Johannes Gutenberg', 'Mainz, Jerman • Tahun 1455 M', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-gutenberg-press.webp', 'Penemuan mesin cetak bergerak oleh Johannes Gutenberg membuat buku ilmu pengetahuan dapat dicetak cepat dan terjangkau, mendorong lahirnya zaman pencerahan dan sains modern.', 'Gutenberg Press'),
('10000000-0000-0000-0002-000000000047', 'earth', 'Zaman Pertengahan & Nusantara', 1492, 'Penjelajahan Samudra & Jalur Benua Baru', 'Penemuan Benua Amerika (Columbus, 24.05, -74.53)', 'Pelayaran melintasi Atlantik yang menghubungkan Benua Amerika dengan dunia global.', 'Christopher Columbus & Kapal Santa Maria', 'Kepulauan Karibia, Amerika • 12 Oktober 1492', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-columbus-1492.webp', 'Pada 12 Oktober 1492, pelayaran samudra Christopher Columbus tiba di Kepulauan Karibia (Benua Amerika), membuka pertukaran tanaman pangan global (seperti cokelat, kentang, jagung, dan tomat) antara Benua Amerika dan seluruh dunia.', 'Age of Discovery'),
('10000000-0000-0000-0002-000000000048', 'earth', 'Zaman Modern (1500 – Sekarang)', 1519, 'Penjelajahan Sirkumnavigasi Bola Bumi', 'Ekspedisi Keliling Dunia Pertama', 'Pelayaran pertama mengelilingi seluruh bola Bumi oleh Magellan dan Elcano.', 'Ferdinand Magellan, Juan Sebastián Elcano & Kapal Victoria', 'Selat Magellan & Maluku • Tahun 1519–1522', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-magellan-1519.webp', 'Pelayaran yang dimulai tahun 1519 dan selesai tahun 1522 oleh Juan Sebastián Elcano ini menjadi pelayaran pertama dalam sejarah yang berhasil mengelilingi seluruh bola Bumi melalui jalur laut.', 'First Circumnavigation'),
('10000000-0000-0000-0002-000000000049', 'earth', 'Zaman Modern (1500 – Sekarang)', 1543, 'Revolusi Teori Astronomi & Kosmologi', 'Teori Heliosentris Copernicus', 'Teori ilmiah bahwa Bumi dan planet-planet berputar mengelilingi Matahari.', 'Nicolaus Copernicus', 'Toruń, Polandia • Tahun 1543', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-42-copernicus-galileo.webp', 'Pada 1543, Nicolaus Copernicus menerbitkan teori ilmiah bahwa Bumi dan planet-planet berputar mengelilingi Matahari (Heliosentris), mengubah cara pandang manusia terhadap alam semesta.', 'Copernican Revolution'),
('10000000-0000-0000-0002-000000000050', 'earth', 'Zaman Modern (1500 – Sekarang)', 1582, 'Sistem Penanggalan Astronomis Dunia', 'Kalender Masehi Gregorian', 'Penyempurnaan kalender tahun kabisat yang digunakan secara internasional hingga kini.', 'Paus Gregorius XIII, Aloysius Lilius & Christopher Clavius', 'Eropa & Dunia • Oktober 1582', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-gregorian-calendar.webp', 'Diperkenalkan pada Oktober 1582 untuk menyempurnakan perhitungan tahun kabisat agar kalender selalu selaras dengan peredaran Bumi mengelilingi Matahari; kalender inilah yang dipakai secara internasional saat ini.', 'Gregorian Calendar'),
('10000000-0000-0000-0002-000000000051', 'earth', 'Zaman Modern (1500 – Sekarang)', 1590, 'Terobosan Instrumen Optik & Biologi', 'Penemuan Mikroskop Pertama', 'Alat optik pertama yang membuka pandangan manusia ke dunia sel dan mikroba.', 'Zacharias Janssen & Hans Janssen', 'Middelburg, Belanda • Zacharias Janssen • Tahun 1590', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-first-microscope.webp', 'Penemuan mikroskop gabungan pertama di akhir abad ke-16 membuka mata ilmuwan untuk pertama kalinya melihat sel tumbuhan, bakteri, dan dunia mikroskopis yang tak tampak mata telanjang.', 'History of Microscope'),
('10000000-0000-0000-0002-000000000052', 'earth', 'Zaman Modern (1500 – Sekarang)', 1606, 'Penjelajahan Maritim Samudra Selatan', 'Penjelajahan Pertama Australia', 'Pencatatan pesisir Benua Australia pertama oleh kapal Duyfken pada 1606.', 'Willem Janszoon & Kapal Duyfken', 'Cape York, Australia • Kapal Duyfken • Tahun 1606', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-australia-1606.webp', 'Meski penduduk asli Aborigin telah menghuni Australia selama puluhan ribu tahun, pelaut Belanda Willem Janszoon dengan kapal Duyfken pada 1606 mencatat pendaratan Eropa pertama yang terdokumentasi di pesisir Australia.', 'Australia Exploration'),
('10000000-0000-0000-0002-000000000053', 'earth', 'Zaman Modern (1500 – Sekarang)', 1609, 'Instrumen Astronomi & Observasi Langit', 'Teleskop Astronomi Galileo', 'Pengamatan pertama kawah Bulan dan 4 bulan Jupiter lewat teleskop.', 'Galileo Galilei', 'Padua & Pisa, Italia • Tahun 1609', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-galileo-telescope.webp', 'Pada 1609, Galileo Galilei mengarahkan teleskop buatannya ke langit malam dan untuk pertama kalinya melihat kawah di Bulan, cincin Saturnus, serta 4 bulan yang mengorbit Jupiter.', 'Galileo Telescope'),
('10000000-0000-0000-0002-000000000054', 'earth', 'Zaman Modern (1500 – Sekarang)', 1642, 'Penjelajahan Maritim Oseania', 'Pemetaan Tasmania & Selandia Baru', 'Pelayaran Abel Tasman yang memetakan pulau di selatan Benua Australia.', 'Abel Tasman & Kapal Heemskerck', 'Tasmania & Selandia Baru • Tahun 1642', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-tasman-1642.webp', 'Pelayaran penjelajahan Abel Tasman pada 1642–1643 memetakan wilayah Tasmania, Selandia Baru, dan Fiji di belahan Bumi selatan.', 'Abel Tasman'),
('10000000-0000-0000-0002-000000000055', 'earth', 'Zaman Modern (1500 – Sekarang)', 1653, 'Mahakarya Arsitektur Marmer Dunia', 'Taj Mahal', 'Monumen marmer putih berarsitektur simetri sempurna di tepi Sungai Yamuna.', 'Kaisar Shah Jahan & Arsitek Ustad Ahmad Lahori', 'Agra, India • Tinggi Kubah 73 m • Selesai Tahun 1653', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-43-taj-mahal.webp', 'Monumen marmer putih Makrana yang selesai dibangun pada 1653 dengan simetri arsitektur geometris sempurna dan menjadi salah satu Situs Warisan Dunia paling terkenal hingga kini.', 'Taj Mahal'),
('10000000-0000-0000-0002-000000000056', 'earth', 'Zaman Modern (1500 – Sekarang)', 1687, 'Revolusi Fisika Klasik & Mekanika Langit', 'Hukum Gravitasi Isaac Newton', 'Rumus fisika yang menjelaskan jatuhnya benda dan orbit planet mengelilingi Matahari.', 'Sir Isaac Newton', 'Cambridge, Inggris • Buku Principia • Tahun 1687', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-newton-gravity.webp', 'Isaac Newton merumuskan Hukum Gravitasi dan tiga Hukum Gerak pada 1687 yang menjelaskan mengapa apel jatuh ke tanah sekaligus mengapa Bulan dan planet-planet tetap berada di orbitnya.', 'Newton Principia'),
('10000000-0000-0000-0002-000000000057', 'earth', 'Zaman Modern (1500 – Sekarang)', 1769, 'Revolusi Rekayasa Mesin & Industri', 'Mesin Uap & Revolusi Industri', 'Penyempurnaan mesin uap oleh James Watt yang melahirkan kereta dan kapal modern.', 'James Watt & Matthew Boulton', 'Skotlandia & Inggris • Tahun 1769', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-steam-engine-1769.webp', 'Penyempurnaan mesin uap oleh James Watt pada 1769 memicu Revolusi Industri pertama, melahirkan kereta api uap, kapal uap, dan pabrik modern yang mengubah wajah kehidupan manusia.', 'Industrial Revolution'),
('10000000-0000-0000-0002-000000000058', 'earth', 'Zaman Modern (1500 – Sekarang)', 1770, 'Ekspedisi Kartografi Maritim & Sains', 'Pemetaan Pesisir Timur Australia', 'Ekspedisi Kapten James Cook memetakan pantai timur Australia & Karang Penghalang Besar.', 'Kapten James Cook & Kapal Riset HMS Endeavour', 'Botany Bay, Australia • Kapal HMS Endeavour • April 1770', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-cook-australia-1770.webp', 'Pada April 1770, pelayar dan kartografer James Cook mendarat di Botany Bay serta memetakan seluruh garis pantai timur Benua Australia dan Karang Penghalang Besar (Great Barrier Reef).', 'Endeavour 1770'),
('10000000-0000-0000-0002-000000000059', 'earth', 'Zaman Modern (1500 – Sekarang)', 1783, 'Penerbangan Aeronautika Pertama Manusia', 'Balon Udara Panas Pertama', 'Penerbangan bebas pertama manusia di langit Paris dengan balon Montgolfier.', 'Joseph-Michel Montgolfier & Jacques-Étienne Montgolfier', 'Paris, Prancis • 21 November 1783', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-montgolfier-1783.webp', 'Pada 21 November 1783, manusia untuk pertama kalinya berhasil terbang bebas di udara menggunakan balon udara panas rancangan Montgolfier bersaudara di langit Paris.', 'First Balloon Flight'),
('10000000-0000-0000-0002-000000000060', 'earth', 'Zaman Modern (1500 – Sekarang)', 1796, 'Terobosan Imunologi & Kedokteran Modern', 'Penemuan Vaksin Pertama', 'Terobosan kedokteran Edward Jenner untuk melindungi manusia dari wabah cacar.', 'Dr. Edward Jenner', 'Gloucestershire, Inggris • Tahun 1796', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-jenner-vaccine-1796.webp', 'Pada 1796, dokter Edward Jenner mengembangkan vaksin pertama untuk melindungi manusia dari penyakit cacar, yang di kemudian hari menyelamatkan ratusan juta nyawa di seluruh dunia.', 'History of Vaccines'),
('10000000-0000-0000-0002-000000000061', 'earth', 'Zaman Modern (1500 – Sekarang)', 1800, 'Inovasi Elektrokimia & Eksplorasi Geografis', 'Baterai Listrik & Gurun Sahara', 'Penemuan baterai listrik Volta dan pemetaan padang pasir panas terluas di Bumi.', 'Alessandro Volta (Voltaic Pile) & Ekspedisi Sahara', 'Italia & Afrika Utara • Luas Sahara 9,2 Juta km² • Tahun 1800', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-44-sahara-desert.webp', 'Tahun 1800 ditandai penemuan baterai listrik pertama oleh Alessandro Volta yang memungkinkan aliran listrik stabil, di abad yang sama ekspedisi ilmiah mulai memetakan Gurun Sahara (padang pasir panas terluas 9,2 juta km²).', 'Volta & Sahara'),
('10000000-0000-0000-0002-000000000062', 'earth', 'Zaman Modern (1500 – Sekarang)', 1820, 'Penjelajahan Kutub Selatan & Daratan Es', 'Penemuan Benua Antartika', 'Penemuan benua es di Kutub Selatan yang menyimpan 70% air tawar Bumi.', 'Fabian von Bellingshausen, Edward Bransfield & Nathaniel Palmer', 'Kutub Selatan Bumi • Luas 14,2 Juta km² • Suhu -89,2°C • 1820', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-45-antarctica-ice.webp', 'Pada tahun 1820, ekspedisi maritim pertama kali melihat daratan utama Benua Antartika—gurun dingin terbesar di Bumi yang menyimpan 70% air tawar dunia dalam bentuk lapisan es.', 'Antarctica 1820'),
('10000000-0000-0000-0002-000000000063', 'earth', 'Zaman Modern (1500 – Sekarang)', 1850, 'Situs Keanekaragaman Hayati & Paru-Paru Dunia', 'Hutan Hujan Amazon', 'Hutan tropis terbesar di Bumi dengan 390 miliar pohon dan sungai terbesar dunia.', 'Alexander von Humboldt & Ahli Botani Sedunia', 'Amerika Selatan (9 Negara) • Luas 5,5 Juta km²', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-46-amazon-rainforest.webp', 'Eksplorasi botani abad ke-19 menyingkap kekayaan luar biasa Hutan Hujan Amazon—hutan tropis terbesar di planet Bumi yang menampung 10% spesies makhluk hidup dunia.', 'Amazon Basin'),
('10000000-0000-0000-0002-000000000064', 'earth', 'Zaman Modern (1500 – Sekarang)', 1869, 'Rekayasa Kanal Maritim Antar-Benua', 'Pembukaan Terusan Suez', 'Kanal buatan sepanjang 193 km di Mesir yang menghubungkan Eropa dan Asia.', 'Ferdinand de Lesseps & Suez Canal Company', 'Mesir • Panjang 193 km • Dibuka November 1869', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-suez-canal-1869.webp', 'Dibuka pada November 1869, Terusan Suez membelah tanah genting Mesir untuk menghubungkan Laut Tengah dan Laut Merah, memangkas waktu pelayaran kapal dagang antara Eropa dan Asia hingga berminggu-minggu.', 'Suez Canal 1869'),
('10000000-0000-0000-0002-000000000065', 'earth', 'Zaman Modern (1500 – Sekarang)', 1876, 'Inovasi Telekomunikasi & Energi Listrik', 'Telepon & Lampu Pijar Listrik', 'Penemuan telepon jarak jauh dan lampu pijar yang menerangi dunia malam.', 'Alexander Graham Bell (1876) & Thomas Alva Edison (1879)', 'Amerika Serikat • Alexander Graham Bell (1876) & Edison (1879)', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-telephone-bulb.webp', 'Penemuan telepon pada 1876 memungkinkan suara manusia dikirim melintasi kabel jarak jauh untuk pertama kalinya, disusul penyempurnaan lampu pijar listrik praktis pada 1879.', 'Communication History'),
('10000000-0000-0000-0002-000000000066', 'earth', 'Zaman Modern (1500 – Sekarang)', 1883, 'Peristiwa Vulkanik Dahsyat & Pembentukan Gunung Baru', 'Letusan Gunung Krakatau 1883', 'Letusan terdahsyat era modern di Selat Sunda yang melahirkan Anak Krakatau.', 'Layanan Geologi Hindia Belanda & Royal Society', 'Selat Sunda, Indonesia • 27 Agustus 1883', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-49-krakatau-volcano.webp', 'Letusan dahsyat Gunung Krakatau pada 27 Agustus 1883 menghasilkan suara terdahsyat dalam sejarah modern dan gelombang tekanan udara yang mengelilingi Bumi tujuh kali, lalu melahirkan gunung baru Anak Krakatau.', 'Krakatau 1883'),
('10000000-0000-0000-0002-000000000067', 'earth', 'Zaman Modern (1500 – Sekarang)', 1895, 'Fisika Radiasi & Gelombang Elektromagnetik', 'Penemuan Sinar-X & Radio', 'Terobosan foto rontgen medis dan komunikasi telegraf nirkabel pertama.', 'Wilhelm Conrad Röntgen & Guglielmo Marconi', 'Jerman & Italia • Röntgen & Marconi • Tahun 1895', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-xray-radio-1895.webp', 'Penemuan sinar-X (1895) memungkinkan dokter melihat tulang di dalam tubuh tanpa operasi, bersamaan dengan penemuan telegraf radio tanpa kabel oleh Marconi.', 'X-Ray & Radio'),
('10000000-0000-0000-0002-000000000068', 'earth', 'Zaman Modern (1500 – Sekarang)', 1903, 'Penerbangan Pesawat Bermotor Terkendali', 'Pesawat Wright Bersaudara', 'Penerbangan pesawat bermotor terkendali pertama dalam sejarah manusia.', 'Orville Wright, Wilbur Wright & Pesawat Wright Flyer', 'Kitty Hawk, North Carolina • 17 Desember 1903', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-54-wright-flyer.webp', 'Pada 17 Desember 1903, Orville dan Wilbur Wright menerbangkan pesawat bermotor pertama yang terkendali di Kitty Hawk, membuka era penerbangan sipil dan antariksa.', 'Wright Flyer 1903'),
('10000000-0000-0000-0002-000000000069', 'earth', 'Zaman Modern (1500 – Sekarang)', 1912, 'Tragedi Maritim & Reformasi Keselamatan Samudra', 'Tenggelamnya Kapal RMS Titanic', 'Peristiwa duka maritim di Atlantik Utara yang melahirkan standar keselamatan laut dunia.', 'RMS Titanic (White Star Line) & Kapal Penyelamat RMS Carpathia', 'Samudra Atlantik Utara (~530 km Tenggara Newfoundland) • 15 April 1912', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-titanic-1912.webp', 'Pada pelayaran perdananya dari Southampton ke New York, kapal penumpang terbesar masa itu—RMS Titanic—menabrak gunung es pada malam 14 April 1912 dan tenggelam pada pukul 02.20 dini hari tanggal 15 April 1912 di Samudra Atlantik Utara. Peristiwa duka ini merenggut lebih dari 1.500 nyawa dari ~2.220 penumpang dan mendorong aturan keselamatan maritim internasional (SOLAS) yang mewajibkan sekoci cukup untuk semua penumpang serta patroli gunung es.', 'NOAA RMS Titanic'),
('10000000-0000-0000-0002-000000000070', 'earth', 'Zaman Modern (1500 – Sekarang)', 1914, 'Rekayasa Kanal Maritim & Pintu Air Raksasa', 'Pembukaan Terusan Panama', 'Jalur air penghubung Samudra Atlantik dan Pasifik dengan sistem pintu air raksasa.', 'George Washington Goethals & Korps Zeni Angkatan Darat AS', 'Panama, Amerika Tengah • Panjang 82 km • 15 Agustus 1914', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-panama-canal-1914.webp', 'Resmi dibuka pada 15 Agustus 1914, Terusan Panama menghubungkan Samudra Atlantik dan Samudra Pasifik menggunakan pintu air (locks) raksasa sehingga kapal tidak perlu lagi memutari ujung selatan Benua Amerika.', 'Panama Canal 1914'),
('10000000-0000-0000-0002-000000000071', 'earth', 'Zaman Modern (1500 – Sekarang)', 1928, 'Revolusi Farmakologi & Kedokteran Penyelamat Jiwa', 'Penemuan Antibiotik Penisilin', 'Penemuan obat antibiotik pertama oleh Alexander Fleming yang menyelamatkan jutaan nyawa.', 'Sir Alexander Fleming, Howard Florey & Ernst Chain', 'London, Inggris • Tahun 1928', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-penicillin-1928.webp', 'Pada 1928, ilmuwan Alexander Fleming menemukan jamur Penicillium yang mampu membunuh bakteri berbahaya—melahirkan era antibiotik modern yang menyelamatkan jutaan nyawa manusia.', 'Penicillin 1928'),
('10000000-0000-0000-0002-000000000072', 'earth', 'Zaman Modern (1500 – Sekarang)', 1945, 'Tonggak Sejarah Diplomasi & Perdamaian Dunia', 'Kemerdekaan Indonesia & Berdirinya PBB', 'Proklamasi 17 Agustus 1945 serta lahirnya Perserikatan Bangsa-Bangsa untuk perdamaian.', 'Soekarno-Hatta (Indonesia) & Delegasi 50 Negara Piagam PBB', 'Jakarta & San Francisco • 17 Agustus & 24 Oktober 1945', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-55-indonesia-un-1945.webp', 'Tahun 1945 menjadi tonggak sejarah perdamaian dan kemerdekaan: Bangsa Indonesia memproklamasikan kemerdekaannya pada 17 Agustus 1945, dan pada 24 Oktober 1945 Perserikatan Bangsa-Bangsa (PBB / United Nations) resmi berdiri di San Francisco untuk menjaga perdamaian dunia, hak asasi manusia, pendidikan (UNESCO), dan kesehatan global (WHO).', '1945 Indonesia & UN'),
('10000000-0000-0000-0002-000000000073', 'earth', 'Zaman Modern (1500 – Sekarang)', 1960, 'Eksplorasi Oseanografi Laut Dalam', 'Palung Mariana (Challenger Deep)', 'Titik terdalam di kerak Bumi saat ini yang berhasil diselami pada kedalaman 10.984 m.', 'Batiskap Trieste, Jacques Piccard & Don Walsh', 'Samudra Pasifik Barat • Kedalaman 10.984 Meter • 23 Januari 1960', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-53-mariana-trench.webp', 'Pada 23 Januari 1960, Jacques Piccard dan Don Walsh menyelam hingga dasar Challenger Deep di Palung Mariana sedalam 10.984 meter—titik terdalam kerak Bumi yang pernah dicapai manusia hingga saat ini.', 'Mariana Trench 1960'),
('10000000-0000-0000-0002-000000000074', 'earth', 'Zaman Modern (1500 – Sekarang)', 1969, 'Titik Pendaratan & Eksplorasi Antariksa Berawak', 'Pendaratan Bulan Apollo 11', 'Langkah pertama manusia menjejakkan kaki di permukaan Bulan setelah Yuri Gagarin.', 'Apollo 11, Lunar Module Eagle, Neil Armstrong & Buzz Aldrin', 'Kennedy Space Center & Bulan • Juli 1969', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-57-apollo-11.webp', 'Setelah Yuri Gagarin mengorbit Bumi pada 1961, misi Apollo 11 NASA meluncur dengan roket Saturn V pada Juli 1969 dan berhasil mendaratkan Neil Armstrong serta Buzz Aldrin di permukaan Bulan.', 'Apollo 11 NASA'),
('10000000-0000-0000-0002-000000000075', 'earth', 'Zaman Modern (1500 – Sekarang)', 1989, 'Revolusi Komputasi & Jaringan Informasi Global', 'Lahirnya Internet (World Wide Web)', 'Penemuan WWW oleh Tim Berners-Lee di CERN yang menghubungkan informasi sedunia.', 'Sir Tim Berners-Lee, Robert Cailliau & Laboratorium CERN', 'Jenewa, Swiss • Tahun 1989', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-58-cern-web.webp', 'Pada 1989, Tim Berners-Lee menciptakan World Wide Web (WWW) di laboratorium CERN yang memungkinkan seluruh pelajar dan masyarakat di berbagai belahan Bumi bertukar ilmu melalui internet.', 'CERN WWW 1989'),
('10000000-0000-0000-0002-000000000076', 'earth', 'Zaman Modern (1500 – Sekarang)', 1998, 'Laboratorium Antariksa Orbit Rendah Internasional', 'Stasiun Luar Angkasa (ISS)', 'Laboratorium riset antariksa terbesar hasil kerja sama damai 15 negara.', 'Kerja Sama 15 Negara: NASA, Roscosmos, ESA, JAXA & CSA', 'Orbit Rendah Bumi (400 km) • Kecepatan 28.000 km/jam • 1998', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-59-iss-station.webp', 'Sejak modul pertamanya diluncurkan pada 1998, ISS menjadi laboratorium riset ilmiah terbesar di luar angkasa yang dihuni bergantian oleh astronot dari berbagai negara.', 'NASA ISS'),
('10000000-0000-0000-0002-000000000077', 'earth', 'Zaman Modern (1500 – Sekarang)', 2003, 'Terobosan Bioteknologi Molekuler & Genetika', 'Pemetaan Genom Manusia', 'Rampungnya peta 3 miliar kode DNA manusia untuk kemajuan dunia kedokteran.', 'Human Genome Project (HGP) & Celera Genomics', 'Konsorsium Sains Global • April 2003', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-human-genome-2003.webp', 'Pada April 2003, ilmuwan dunia merampungkan pemetaan 3 miliar pasangan basa DNA manusia yang membuka kemajuan pesat di bidang kedokteran dan biologi modern.', 'Human Genome 2003'),
('10000000-0000-0000-0002-000000000078', 'earth', 'Zaman Modern (1500 – Sekarang)', 2008, 'Pusat Konservasi Biodiversitas Tanaman Pangan', 'Gudang Benih Global Svalbard', 'Brankas penyimpan 1,2 juta benih pangan dunia di dalam gunung es Kutub Utara.', 'Pemerintah Norwegia, Crop Trust & NordGen', 'Pulau Spitsbergen, Norwegia • Tahun 2008', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-svalbard-2008.webp', 'Dibangun jauh di dalam gunung es abadi Kutub Utara pada 2008 sebagai brankas cadangan benih tanaman pangan seluruh negara di Bumi untuk menjaga ketahanan pangan generasi mendatang.', 'Svalbard Vault'),
('10000000-0000-0000-0002-000000000079', 'earth', 'Zaman Modern (1500 – Sekarang)', 2015, 'Konsensus Internasional Keberlanjutan & Aksi Iklim', 'Kesepakatan SDG PBB & Iklim Paris', 'Komitmen global 17 Tujuan Pembangunan Berkelanjutan termasuk SDG 4 Pendidikan.', 'Majelis Umum PBB & 196 Negara Anggota COP21', 'Paris & Markas PBB • Tahun 2015', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-sdg-paris-2015.webp', 'Pada 2015, seluruh negara anggota PBB menyepakati 17 Tujuan Pembangunan Berkelanjutan (SDGs)—termasuk SDG 4 Pendidikan Berkualitas—dan Perjanjian Iklim Paris untuk menjaga suhu Bumi tetap layak huni.', 'UN SDGs 2015'),
('10000000-0000-0000-0002-000000000080', 'earth', 'Zaman Modern (1500 – Sekarang)', 2021, 'Observatorium Antariksa Inframerah Generasi Baru', 'Teleskop Luar Angkasa James Webb', 'Teleskop cermin emas selebar 6,5 meter pengamat galaksi paling awal di alam semesta.', 'James Webb Space Telescope (NASA, ESA, CSA)', 'Titik Lagrange L2 (1,5 Juta km) • Desember 2021', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/earth-60-svalbard-jwst.webp', 'Diluncurkan pada Desember 2021, Teleskop James Webb menggunakan cermin emas selebar 6,5 meter untuk memotret galaksi-galaksi tertua dan meneliti atmosfer planet jauh di luar Tata Surya.', 'NASA James Webb'),

-- Seed Sejarah 6 Bulan / Satelit Alami
('10000000-0000-0000-0003-000000000001', 'moon', 'Era Antariksa Awal', 1959, 'Tumbukan Eksplorasi Pertama', 'Luna 2: Benda Buatan Pertama Mencapai Bulan', 'Luna 2 (Uni Soviet) sengaja ditumbukkan ke permukaan Bulan di Palus Putredinis.', 'Wahana Luna 2 (Uni Soviet)', 'Permukaan Bulan • 14 September 1959 • Misi Tumbukan Pertama', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/moon-luna2-1959.webp', 'Luna 2 mencatat sejarah sebagai objek buatan manusia pertama yang berhasil mencapai dan mendarat keras di permukaan benda langit lain di luar Bumi.', 'Soviet Space Program / NASA'),
('10000000-0000-0000-0003-000000000002', 'moon', 'Era Antariksa Awal', 1966, 'Pendaratan Lunak Pertama', 'Luna 9: Foto Panorama Pertama Permukaan Bulan', 'Luna 9 mendarat lunak di Oceanus Procellarum dan membuktikan tanah Bulan cukup padat.', 'Wahana Pendarat Luna 9 (Uni Soviet)', 'Oceanus Procellarum, Bulan • 3 Februari 1966 • Pendaratan Lunak', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/moon-luna9-1966.webp', 'Sebelum Luna 9 mendarat, para ilmuwan sempat khawatir Bulan diselimuti debu tebal mematikan. Luna 9 membuktikan permukaan Bulan kokoh untuk didarati manusia.', 'Soviet Space Program / NASA'),
('10000000-0000-0000-0003-000000000003', 'moon', 'Eksplorasi Berawak Apollo', 1969, 'Pendaratan Berawak Pertama', 'Apollo 11: Manusia Pertama Menginjak Bulan', 'Neil Armstrong dan Buzz Aldrin mendarat di Mare Tranquillitatis dan membawa sampel batuan.', 'Apollo 11 & Lunar Module Eagle (NASA)', 'Mare Tranquillitatis, Bulan • 20 Juli 1969 • Neil Armstrong & Buzz Aldrin', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/moon-apollo11-1969.webp', 'Pada 20 Juli 1969, astronaut Neil Armstrong melangkah di permukaan Bulan dan menyampaikan kutipan legendaris: Satu langkah kecil bagi manusia, satu lompatan raksasa bagi umat manusia.', 'NASA Apollo 11'),
('10000000-0000-0000-0003-000000000004', 'moon', 'Eksplorasi Modern Sisi Jauh', 2019, 'Pendaratan Sisi Jauh Pertama', 'Chang''e 4: Eksplorasi Sisi Jauh Bulan', 'Wahana Chang''e 4 dan rover Yutu-2 mendarat di Kawah Von Karman di sisi jauh Bulan.', 'Chang''e 4 & Yutu-2 Rover (CNSA)', 'Kawah Von Karman, Belahan Sisi Jauh Bulan • 3 Januari 2019', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/moon-change4-2019.webp', 'Chang''e 4 mencetak sejarah sebagai wahana pertama yang mendarat di sisi jauh Bulan yang tidak pernah menghadap ke Bumi, berkomunikasi menggunakan satelit relai Queqiao.', 'CNSA / NASA'),
('10000000-0000-0000-0003-000000000005', 'moon', 'Eksplorasi Kutub Selatan', 2023, 'Pendaratan Kutub Selatan Pertama', 'Chandrayaan-3: Menjejak Kutub Selatan Bulan', 'Chandrayaan-3 mendarat dekat kutub selatan Bulan untuk meneliti kandungan es air dan mineral.', 'Chandrayaan-3 & Rover Pragyan (ISRO)', 'Wilayah Kutub Selatan Bulan (69,37° S) • 23 Agustus 2023', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/moon-chandrayaan3-2023.webp', 'India menjadi negara pertama yang berhasil mendaratkan wahananya secara lunak di dekat wilayah kutub selatan Bulan, kawasan strategis yang kaya akan es air abadi.', 'ISRO / NASA'),

('10000000-0000-0000-0003-000000000006', 'io', 'Era Teleskopik', 1610, 'Penemuan Teleskop Astronomi', 'Penemuan Satelit Io oleh Galileo Galilei', 'Galileo mengamati Io sebagai salah satu dari empat satelit pengorbit Jupiter.', 'Galileo Galilei (Teleskop Sederhana)', 'Orbit Jupiter • 7–8 Januari 1610', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/io-discovery-1610.webp', 'Pengamatan teleskopik Galileo terhadap Io membuktikan secara ilmiah bahwa tidak semua benda langit di alam semesta berputar mengitari planet Bumi.', 'NASA Solar System Exploration'),
('10000000-0000-0000-0003-000000000007', 'io', 'Era Antariksa Modern', 1979, 'Vulkanisme Aktif Luar Bumi', 'Penemuan Letusan Vulkanik Gunung Api Pele', 'Wahana Voyager 1 memotret semburan gas dan belerang aktif setinggi 300 km dari gunung api Pele.', 'Wahana Voyager 1 (NASA)', 'Gunung Api Pele, Satelit Io • 8 Maret 1979', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/io-pele-volcano-1979.webp', 'Insinyur navigasi Linda Morabito melihat semburan plume raksasa pada citra Voyager 1, menjadi bukti pertama keberadaan gunung berapi aktif di luar planet Bumi.', 'NASA Voyager 1'),

('10000000-0000-0000-0003-000000000008', 'europa', 'Era Antariksa Modern', 1979, 'Pemetaan Permukaan Es Retak', 'Pemetaan Garis Retakan Lineae Europa', 'Voyager 2 memotret jaringan garis fraktur kemerahan pada lapisan es mulus Europa.', 'Wahana Voyager 2 (NASA)', 'Kerak Es Europa • Juli 1979', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/europa-lineae-1979.webp', 'Citra jarak dekat Voyager 2 menunjukkan permukaan Europa nyaris tanpa kawah dan penuh garis retakan lineae, mengindikasikan adanya kerak es dinamis yang mengapung di atas cairan.', 'NASA Voyager 2'),
('10000000-0000-0000-0003-000000000009', 'europa', 'Era Antariksa Abad 21', 1997, 'Penemuan Samudra Bawah Es', 'Deteksi Samudra Air Asin Cair Bawah Permukaan', 'Pengorbit Galileo mendeteksi medan magnet induksi dari samudra air asin cair global sedalam 100 km.', 'Wahana Pengorbit Galileo (NASA)', 'Samudra Bawah Es Europa • 1997–2000', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/europa-subsurface-ocean-1997.webp', 'Data magnetometer wahana Galileo membuktikan adanya lapisan konduktif cair di bawah kerak es tebal Europa, mengonfirmasi keberadaan samudra cair yang volumenya melebihi seluruh lautan Bumi.', 'NASA Galileo Science'),

('10000000-0000-0000-0003-000000000010', 'ganymede', 'Era Antariksa Modern', 1996, 'Penemuan Medan Magnetik Alami', 'Penemuan Medan Magnet Intrinsik Ganymede', 'Wahana Galileo mencatat Ganymede memiliki medan magnet internal dan magnetosfer sendiri.', 'Wahana Pengorbit Galileo (NASA)', 'Magnetosfer Ganymede • Juni 1996', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/ganymede-magnetic-1996.webp', 'Galileo menemukan bahwa satelit terbesar tata surya ini memiliki inti besi cair yang membangkitkan medan magnet dipol internal, menjadikannya satu-satunya bulan bercahaya aurora.', 'NASA Galileo Mission'),
('10000000-0000-0000-0003-000000000011', 'ganymede', 'Era Antariksa Mutakhir', 2023, 'Misi Penjelajahan Samudra Es', 'Peluncuran Misi Penjelajah JUICE', 'Badan Antariksa Eropa (ESA) meluncurkan wahana JUICE khusus mengitari dan meneliti Ganymede.', 'Jupiter Icy Moons Explorer (ESA / NASA / JAXA)', 'Wahana Pengorbit JUICE • Diluncurkan April 2023', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/ganymede-juice-mission-2023.webp', 'Misi JUICE dirancang untuk menjadi wahana antariksa pertama yang mengorbit bulan di luar orbit Bumi, menyelidiki potensi kelayakhunian samudra bawah tanah Ganymede.', 'ESA JUICE Mission'),

('10000000-0000-0000-0003-000000000012', 'callisto', 'Era Antariksa Modern', 1979, 'Kawah Tumbukan Purba', 'Pemetaan Cekungan Tumbukan Valhalla', 'Voyager 1 memotret cekungan multiring raksasa Valhalla berdiameter 3.800 km.', 'Wahana Voyager 1 (NASA)', 'Cekungan Kawah Valhalla, Callisto • Maret 1979', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/callisto-valhalla-1979.webp', 'Cekungan kawah Valhalla memiliki puluhan cincin punggungan konsentris yang terbentuk saat asteroid raksasa menghantam kerak beku Callisto sekitar 4 miliar tahun lalu.', 'NASA Voyager 1'),
('10000000-0000-0000-0003-000000000013', 'callisto', 'Era Antariksa Modern', 1998, 'Fosil Geologi Tata Surya', 'Konfirmasi Permukaan Tertua Tata Surya', 'Wahana Galileo mengonfirmasi kerak berbatu-es Callisto tidak pernah mengalami pembaharuan tektonik.', 'Wahana Pengorbit Galileo (NASA)', 'Kerak Es Purba Callisto • Mei 1998', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/callisto-ancient-crust-1998.webp', 'Tidak adanya aktivitas pasang surut gravitasi membuat permukaan Callisto tetap membeku sejak awal pembentukan Tata Surya, menjadikannya rekaman geologis paling utuh di alam semesta.', 'NASA Galileo Science'),

('10000000-0000-0000-0003-000000000014', 'titan', 'Era Teleskopik', 1655, 'Penemuan Astronomi Bersejarah', 'Penemuan Bulan Titan oleh Christiaan Huygens', 'Astronom Belanda Christiaan Huygens menemukan satelit terbesar Saturnus dengan teleskop 57 mm.', 'Christiaan Huygens', 'Den Haag, Belanda • 25 Maret 1655', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/titan-huygens-1655.webp', 'Huygens mencatat bulan berkabut oranye yang mengitari cincin Saturnus setiap 16 hari, yang kemudian diberi nama Titan.', 'ESA / NASA History'),
('10000000-0000-0000-0003-000000000015', 'titan', 'Era Antariksa Modern', 2005, 'Pendaratan Terjauh di Tata Surya', 'Pendaratan Bersejarah Wahana Huygens di Titan', 'Probe Huygens mendarat dengan parasut menembus awan tebal Titan ke hamparan kerikil es air.', 'Probe Pendarat Huygens (ESA / NASA)', 'Dataran Kerikil Es Titan • 14 Januari 2005', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/titan-huygens-landing-2005.webp', 'Huygens mencatat rekor pendaratan terjauh di Tata Surya luar, mengirimkan suara angin atmosfer, foto saluran sungai metana, dan membuktikan permukaan tanah Titan mirip lumpur pasir basah.', 'ESA Huygens Landing'),
('10000000-0000-0000-0003-000000000016', 'titan', 'Era Antariksa Modern', 2007, 'Penemuan Laut Hidrokarbon Cair', 'Pemetaan Lautan Metana Kraken Mare', 'Radar Cassini memetakan laut metana dan etana cair Kraken Mare seluas 400.000 km².', 'Wahana Pengorbit Cassini (NASA / ESA)', 'Kutub Utara Titan • Luas Laut 400.000 km² • Misi 2007', 'https://czkakizdvroprrhwbewv.supabase.co/storage/v1/object/public/astrosphere-assets/poi/titan-kraken-mare-2007.webp', 'Pengamatan radar Cassini membuktikan bahwa Titan memiliki siklus hidrologis lengkap seperti Bumi, tetapi menggunakan metana cair sebagai pengganti air.', 'NASA Cassini Mission')
ON CONFLICT (event_id) DO UPDATE SET
  planet_id = EXCLUDED.planet_id,
  era_label = EXCLUDED.era_label,
  tahun_kejadian = EXCLUDED.tahun_kejadian,
  kategori_poi = EXCLUDED.kategori_poi,
  judul = EXCLUDED.judul,
  ringkasan_singkat = EXCLUDED.ringkasan_singkat,
  nama_wahana = EXCLUDED.nama_wahana,
  karakteristik_fisik = EXCLUDED.karakteristik_fisik,
  gambar_url = EXCLUDED.gambar_url,
  deskripsi = EXCLUDED.deskripsi,
  sumber_referensi = EXCLUDED.sumber_referensi;

-- 6.4 Seed Fenomena Astronomi Lengkap untuk Seluruh 8 Planet Tata Surya
INSERT INTO public.phenomena (
  phenomenon_id, planet_id, judul, tombol_aksi_label, tipe_animasi, deskripsi_edukatif, penjelasan_matahari, penjelasan_bulan, sumber_referensi, tebak_dulu, konfigurasi_visual, is_active
) VALUES
('20000000-0000-0000-0000-000000000009', 'mercury', 'Sehari Lebih Lama dari Setahun', 'Putar Simulasi Hari & Tahun Merkurius', 'CUSTOM_ALIGNMENT',
 'Dari siang ke siang lagi di Merkurius butuh 176 hari Bumi — dua kali lamanya satu tahun Merkurius (88 hari Bumi) akibat resonansi spin-orbit 3:2 yang unik.',
 '', '', 'NASA',
 '{"q": "Di Merkurius, mana yang lebih lama?", "opts": ["Satu hari (dari siang ke siang lagi)", "Satu tahun", "Sama panjang"], "a": 0, "why": "Dari siang ke siang lagi di Merkurius butuh 176 hari Bumi — dua kali lamanya satu tahun Merkurius (88 hari Bumi).", "points": 10}'::jsonb,
 '{"mul": 400, "view": "top", "show": "pin"}'::jsonb, true),

('20000000-0000-0000-0000-000000000006', 'venus', 'Matahari Terbit di Barat (Rotasi Retrograd)', 'Putar Simulasi Rotasi Venus', 'CUSTOM_ALIGNMENT',
 'Venus berputar terbalik (retrograd) dan sangat lambat akibat kemiringan 177,3°. Di sana Matahari terbit di barat dan terbenam di timur, dengan satu hari Venus setara 243 hari Bumi.',
 '', '', 'NASA',
 '{"q": "Di Venus, Matahari terbit dari arah mana?", "opts": ["Timur, seperti di Bumi", "Barat", "Tidak pernah terbit"], "a": 1, "why": "Venus berputar berlawanan arah (retrograd), jadi Matahari terbit di barat dan terbenam di timur.", "points": 10}'::jsonb,
 '{"mul": 600, "view": "top", "show": "pin"}'::jsonb, true),

('20000000-0000-0000-0000-000000000001', 'earth', 'Gerhana Matahari & Bulan', 'Buka Laboratorium Gerhana', 'SOLAR_ECLIPSE',
 'Saat Matahari, Bulan, dan Bumi berada dalam satu garis lurus (syzygy), bayangan menghalangi cahaya Matahari dan melahirkan fenomena gerhana total, cincin, atau sebagian.',
 'Matahari sekitar 400 kali lebih lebar dari Bulan, tapi juga sekitar 400 kali lebih jauh. Dari Bumi, piringan keduanya tampak hampir sama besar di langit sehingga bisa saling menutup sempurna.',
 'Cahaya Matahari menembus atmosfer Bumi. Spektrum biru dihamburkan, sedangkan spektrum merah dibelokkan hingga mencapai permukaan Bulan dan menghasilkan rona merah tembaga (Blood Moon).',
 'NASA',
 '{"gerhana-matahari": {"q": "Bulan jauh lebih kecil dari Matahari. Bisakah Bulan menutupinya penuh?", "opts": ["Tidak mungkin", "Bisa, karena Matahari jauh lebih jauh", "Bisa, karena Bulan lebih dekat ke Matahari"], "a": 1, "why": "Matahari sekitar 400 kali lebih lebar dari Bulan, tapi juga sekitar 400 kali lebih jauh. Dari Bumi keduanya tampak hampir sama besar, jadi Bulan bisa menutup Matahari.", "points": 10}, "gerhana-bulan": {"q": "Saat gerhana Bulan total, Bulan akan tampak…", "opts": ["Hilang, gelap total", "Merah tembaga", "Tetap putih terang"], "a": 1, "why": "Cahaya Matahari menembus atmosfer Bumi. Biru dihamburkan, merah dibelokkan sampai ke Bulan — seperti semua matahari terbenam di Bumi terlihat sekaligus.", "points": 10}}'::jsonb,
 '{"lab": true, "showUmbraPenumbra": true, "judul_matahari": "Gerhana Matahari", "judul_bulan": "Gerhana Bulan"}'::jsonb, true),

('20000000-0000-0000-0000-000000000007', 'mars', 'Musim Seperti di Bumi & Badai Debu Global', 'Putar Simulasi Musim Mars', 'CUSTOM_ALIGNMENT',
 'Sumbu Mars miring 25,2°, sehingga mengalami 4 musim mirip Bumi. Tiap musimnya hampir dua kali lebih lama dari musim di Bumi karena tahun Mars mencapai 687 hari.',
 '', '', 'NASA',
 '{"q": "Apakah Mars punya musim seperti Bumi?", "opts": ["Ya, karena sumbunya miring", "Tidak, Mars tidak punya musim", "Hanya musim dingin sepanjang tahun"], "a": 0, "why": "Sumbu Mars miring 25,2°, sehingga mengalami empat musim mirip Bumi namun hampir dua kali lebih panjang.", "points": 10}'::jsonb,
 '{"mul": 2500, "view": "sun", "show": "season"}'::jsonb, true),

('20000000-0000-0000-0000-000000000004', 'jupiter', 'Hari Paling Singkat & Transit Satelit Io', 'Putar Simulasi Rotasi Cepat & Satelit Io', 'GALILEAN_TRANSIT',
 'Jupiter berputar sekali hanya dalam ± 9 jam 55 menit (rotasi tercepat di Tata Surya). Satelit vulkaniknya, Io, mengitarinya dengan cepat tiap 1,8 hari dan menjatuhkan bayangan bulat hitam di atas awan Jupiter.',
 '', '', 'NASA',
 '{"q": "Jupiter planet terbesar. Berapa lama sehari di sana?", "opts": ["Kurang dari 10 jam", "Sekitar 24 jam", "Lebih dari 100 jam"], "a": 0, "why": "Jupiter berputar sangat cepat: satu hari hanya sekitar 9 jam 55 menit.", "points": 10}'::jsonb,
 '{"mul": 12, "view": "wide", "show": "spins"}'::jsonb, true),

('20000000-0000-0000-0000-000000000005', 'saturn', 'Cincin yang "Menghilang" (Ring Plane Crossing)', 'Putar Simulasi Orientasi Cincin', 'CUSTOM_ALIGNMENT',
 'Tiap ± 15 tahun (setengah revolusi Saturnus), bidang cincin Saturnus sejajar tepat dengan garis pandang Matahari dan Bumi, sehingga cincin esnya tampak seperti garis tipis yang menghilang dari pandangan.',
 '', '', 'NASA',
 '{"q": "Kenapa cincin Saturnus kadang seperti menghilang?", "opts": ["Cincinnya hancur lalu terbentuk lagi", "Kita melihatnya tepat dari samping", "Tertutup awan Saturnus"], "a": 1, "why": "Setiap sekitar 15 tahun sekali bidang cincin Saturnus sejajar dengan garis pandang dari Bumi sehingga tampak menghilang.", "points": 10}'::jsonb,
 '{"mul": 12000, "view": "sun", "show": "years"}'::jsonb, true),

('20000000-0000-0000-0000-000000000008', 'uranus', 'Planet yang Menggelinding (Poros Rebah 98°)', 'Putar Simulasi Poros Menggelinding', 'CUSTOM_ALIGNMENT',
 'Sumbu Uranus miring 97,8°, membuat planet ini berputar menggelinding di orbitnya. Tiap kutubnya disinari Matahari terus-menerus selama ± 42 tahun diikuti 42 tahun malam abadi.',
 '', '', 'NASA',
 '{"q": "Seberapa miring sumbu Uranus?", "opts": ["Hampir tegak", "Miring seperti Bumi", "Hampir rebah"], "a": 2, "why": "Sumbu Uranus miring 97,8° sehingga tampak menggelinding dan tiap kutubnya mengalami 42 tahun siang serta 42 tahun malam.", "points": 10}'::jsonb,
 '{"mul": 30000, "view": "sun", "show": "season"}'::jsonb, true),

('20000000-0000-0000-0000-000000000010', 'neptune', 'Setahun = 165 Tahun Bumi (Revolusi Terlama)', 'Putar Simulasi Revolusi Neptunus', 'CUSTOM_ALIGNMENT',
 'Sejak ditemukan pada 1846, Neptunus baru sekali menuntaskan satu putaran mengelilingi Matahari pada 2011 karena waktu revolusinya mencapai 164,8 tahun Bumi di tepian Tata Surya.',
 '', '', 'NASA',
 '{"q": "Sejak ditemukan tahun 1846, berapa kali Neptunus mengelilingi Matahari?", "opts": ["Baru sekali", "Sekitar 10 kali", "Lebih dari 100 kali"], "a": 0, "why": "Satu tahun Neptunus berlangsung 164,8 tahun Bumi, sehingga baru menuntaskan satu orbit sejak ditemukan pada 1846.", "points": 10}'::jsonb,
 '{"mul": 60000, "view": "sun", "show": "years"}'::jsonb, true)
ON CONFLICT (phenomenon_id) DO UPDATE SET
  planet_id = EXCLUDED.planet_id,
  judul = EXCLUDED.judul,
  tombol_aksi_label = EXCLUDED.tombol_aksi_label,
  tipe_animasi = EXCLUDED.tipe_animasi,
  deskripsi_edukatif = EXCLUDED.deskripsi_edukatif,
  penjelasan_matahari = EXCLUDED.penjelasan_matahari,
  penjelasan_bulan = EXCLUDED.penjelasan_bulan,
  sumber_referensi = EXCLUDED.sumber_referensi,
  tebak_dulu = EXCLUDED.tebak_dulu,
  konfigurasi_visual = EXCLUDED.konfigurasi_visual,
  is_active = EXCLUDED.is_active;

-- 6.5 Seed 32 Soal Kuis Formatif (4 Soal x 8 Planet @ 50 Poin = 1.600 Poin)
INSERT INTO public.questions (
  question_id, planet_id, soal, opsi, kunci_jawaban, pembahasan_edukatif, bobot_poin
) VALUES
('30000000-0000-0000-0000-000000000001', 'mercury', 'Apa nama cekungan kawah tumbukan raksasa berdiameter 1.550 km yang berada di permukaan Merkurius?',
 '["Kawah Jezero", "Cekungan Caloris (Caloris Basin)", "Kawah Gale", "Kawah Chicxulub"]'::jsonb, 1, 'Cekungan Caloris adalah kawah tumbukan terbesar di Merkurius selebar 1.550 km yang dikelilingi pegunungan cincin setinggi 2 km.', 50),
('30000000-0000-0000-0000-000000000002', 'mercury', 'Mengapa di permukaan Merkurius banyak ditemukan tebing patahan tinggi seperti Enterprise Rupes?',
 '["Karena kikisan air sungai deras", "Karena inti besi raksasanya mendingin sehingga kerak planet menyusut dan mengerut", "Karena tarikan cincin es", "Karena badai angin amonia"]'::jsonb, 1, 'Saat inti besi Merkurius perlahan mendingin, ukuran planet menyusut sekitar 14 km dan membuat kerak batuannya terlipat menjadi tebing tinggi.', 50),
('30000000-0000-0000-0000-000000000003', 'mercury', 'Meskipun siang hari di Merkurius mencapai 430°C, di bagian manakah wahana MESSENGER menemukan cadangan es air murni?',
 '["Di puncak gunung berapi khatulistiwa", "Di dasar kawah kutub yang gelap abadi dan tidak pernah terkena sinar Matahari", "Di lapisan awan atas", "Di lembah lava panas"]'::jsonb, 1, 'Karena kemiringan poros Merkurius hampir 0°, dasar kawah dalam di kutub utaranya seperti Kawah Prokofiev selalu berada dalam bayangan abadi bersuhu -180°C.', 50),
('30000000-0000-0000-0000-000000000004', 'mercury', 'Mengapa suhu permukaan Merkurius berubah sangat ekstrem antara siang (430°C) dan malam (-180°C)?',
 '["Karena Merkurius tidak memiliki atmosfer tebal untuk menahan panas", "Karena jaraknya paling jauh dari Matahari", "Karena tertutup samudra cair", "Karena berputar terlalu cepat"]'::jsonb, 0, 'Tanpa selimut atmosfer tebal, panas sinar Matahari di siang hari langsung terlepas kembali ke ruang hampa saat malam tiba.', 50),
('30000000-0000-0000-0000-000000000005', 'venus', 'Apa keunikan puncak Pegunungan Maxwell Montes setinggi 11 km di planet Venus menurut pengamatan radar?',
 '["Tertutup es air biasa", "Dilapisi ''salju logam'' mengilap dari timbal sulfida dan bismut sulfida", "Ditumbuhi lumut hijau", "Berisi danau air tawar"]'::jsonb, 1, 'Di ketinggian 11 km pada Maxwell Montes, uap timbal sulfida dan bismut mengembun menjadi lapisan salju logam yang memantulkan gelombang radar dengan terang.', 50),
('30000000-0000-0000-0000-000000000006', 'venus', 'Arah rotasi Venus berlawanan dengan mayoritas planet di Tata Surya (retrograde), yang menyebabkan...',
 '["Matahari tampak terbit dari arah barat dan terbenam di timur", "Venus tidak pernah mengelilingi Matahari", "Venus memiliki 10 bulan besar", "Suhu Venus menjadi sangat dingin"]'::jsonb, 0, 'Rotasi retrograde (-5.832,5 jam) berarti Venus berputar searah jarum jam dari timur ke barat.', 50),
('30000000-0000-0000-0000-000000000007', 'venus', 'Faktor utama yang membuat Venus menjadi planet terpanas di Tata Surya (465°C) adalah...',
 '["Jaraknya paling dekat ke Matahari", "Efek rumah kaca ekstrem dari atmosfer karbon dioksida tebal dan awan asam sulfat", "Gesekan cincin batu", "Pantulan cahaya Bulan"]'::jsonb, 1, 'Atmosfer Venus terdiri atas 96,5% karbon dioksida bertekanan 90 bar yang mengurung panas Matahari secara ekstrem.', 50),
('30000000-0000-0000-0000-000000000008', 'venus', 'Apa nama gunung berapi perisai tertinggi di Venus (8 km) yang menjadi bukti aktivitas vulkanik planet tersebut?',
 '["Olympus Mons", "Maat Mons", "Mauna Kea", "Gunung Everest"]'::jsonb, 1, 'Maat Mons di wilayah Atla Regio menjulang setinggi 8 km dan merupakan gunung berapi tertinggi di permukaan Venus.', 50),
('30000000-0000-0000-0000-000000000009', 'earth', 'Bagaimana fenomena cahaya aurora (seperti Aurora Borealis dan Australis) dapat terbentuk di langit kutub Bumi?',
 '["Akibat gesekan awan badai petir di lapisan troposfer rendah", "Akibat interaksi partikel bermuatan angin Matahari dengan medan magnetosfer dan gas atmosfer Bumi", "Akibat pantulan sinar Bulan pada hamparan kristal es kutub", "Akibat pembakaran gas metana yang menguap dari dasar samudra"]'::jsonb, 1, 'Medan magnetosfer Bumi membelokkan partikel bermuatan dari angin Matahari menuju wilayah kutub. Di lapisan atmosfer atas, partikel berenergi ini bertabrakan dengan atom oksigen dan nitrogen, memancarkan pendaran cahaya warna-warni yang memukau.', 50),
('30000000-0000-0000-0000-000000000010', 'earth', 'Mengapa efek rumah kaca alami di atmosfer Bumi sangat penting bagi kelangsungan hidup di Bumi?',
 '["Mencegah seluruh radiasi sinar Matahari masuk ke permukaan Bumi", "Menahan sebagian panas radiasi Matahari agar suhu rata-rata Bumi tetap hangat dan layak huni (sekitar 15°C)", "Menghentikan siklus penguapan air di seluruh samudra", "Membuat atmosfer Bumi kehilangan seluruh kandungan gas karbon dioksida"]'::jsonb, 1, 'Gas rumah kaca alami seperti uap air dan karbon dioksida memerangkap sebagian radiasi inframerah termal. Tanpa efek rumah kaca alami ini, suhu rata-rata permukaan Bumi akan anjlok hingga sekitar -18°C, membekukan seluruh perairan dan mematikan kehidupan.', 50),
('30000000-0000-0000-0000-000000000011', 'earth', 'Berapa perkiraan persentase permukaan Bumi yang tertutup oleh air, dan berapa proporsi air asin di samudra dari total seluruh air tersebut?',
 '["Sekitar 30% tertutup air, dengan 50% di antaranya berupa air asin samudra", "Sekitar 71% tertutup air, dengan sekitar 97% di antaranya berupa air asin samudra", "Sekitar 50% tertutup air, dengan 10% di antaranya berupa air asin samudra", "Sekitar 90% tertutup air, dengan seluruhnya berupa air tawar layak minum"]'::jsonb, 1, 'Sekitar 71% permukaan Bumi diselimuti perairan, dengan sekitar 97% tersimpan sebagai air asin di lautan dan samudra. Hanya sekitar 3% merupakan air tawar, yang sebagian besarnya terperangkap dalam gletser dan tudung es kutub.', 50),
('30000000-0000-0000-0000-000000000012', 'earth', 'Faktor astronomis dan fisik utama apakah yang memungkinkan planet Bumi menopang keanekaragaman hayati (biosfer) dengan jutaan spesies kehidupan?',
 '["Karena Bumi memiliki cincin es pemantul radiasi kosmik", "Letaknya di zona layak huni Matahari, memiliki air cair stabil, serta atmosfer beroksigen dan berpelindung ozon", "Karena inti Bumi sepenuhnya berhenti berotasi sehingga tidak ada getaran tektonik", "Karena Bumi tidak mengalami perubahan musim sepanjang tahun"]'::jsonb, 1, 'Bumi mengorbit di zona layak huni (Goldilocks zone) yang suhunya pas untuk mempertahankan air dalam wujud cair. Hal ini didukung oleh atmosfer pelindung kaya nitrogen dan oksigen, lapisan ozon penyaring radiasi ultraviolet berbahaya, serta siklus biogeokimia yang stabil.', 50),
('30000000-0000-0000-0000-000000000013', 'mars', 'Apa nama gunung berapi perisai tertinggi di planet Mars sekaligus gunung tertinggi di seluruh Tata Surya (21,9 km)?',
 '["Maxwell Montes", "Olympus Mons", "Mauna Kea", "Gunung Sharp"]'::jsonb, 1, 'Olympus Mons menjulang setinggi 21,9 km (hampir tiga kali tinggi Gunung Everest) dengan diameter kaki gunung mencapai 600 km.', 50),
('30000000-0000-0000-0000-000000000014', 'mars', 'Sistem ngarai patahan tektonik raksasa di ekuator Mars yang membentang sepanjang 4.000 km dan sedalam 7 km adalah...',
 '["Grand Canyon", "Valles Marineris", "Palung Mariana", "Ngarai Olduvai"]'::jsonb, 1, 'Valles Marineris membentang sepanjang 4.000 km (seperlima keliling Mars) akibat merekahnya kerak planet saat dataran vulkanik Tharsis terangkat.', 50),
('30000000-0000-0000-0000-000000000015', 'mars', 'Mengapa gunung berapi Olympus Mons di Mars bisa tumbuh jauh lebih tinggi daripada gunung berapi di Bumi?',
 '["Karena lempeng kerak Mars diam (tidak bergerak), sehingga lava terus menumpuk di satu titik selama ratusan juta tahun", "Karena Mars terbuat dari es murni", "Karena ditarik oleh cincin Saturnus", "Karena disiram hujan air setiap hari"]'::jsonb, 0, 'Tidak adanya pergerakan lempeng tektonik di Mars membuat titik panas magma terus memuntahkan lava di lokasi yang sama, didukung gravitasi Mars yang lebih rendah dari Bumi.', 50),
('30000000-0000-0000-0000-000000000016', 'mars', 'Bukti ilmiah apa yang ditemukan rover Curiosity (Kawah Gale) dan Perseverance (Kawah Jezero) tentang masa lalu Mars?',
 '["Mars dulunya adalah bintang panas", "Jejak kipas delta sungai dan endapan danau air cair purba", "Hutan pohon raksasa modern", "Lautan logam cair di permukaan"]'::jsonb, 1, 'Endapan batu lempung dan struktur delta sungai di Kawah Jezero dan Gale membuktikan bahwa miliaran tahun silam Mars memiliki danau air cair.', 50),
('30000000-0000-0000-0000-000000000017', 'jupiter', 'Apakah sebenarnya Bintik Merah Raksasa (Great Red Spot) yang tampak di belahan selatan planet Jupiter?',
 '["Gunung batu merah setinggi 50 km", "Badai antisiklon raksasa bertekanan tinggi yang ukurannya lebih besar dari planet Bumi", "Kawah tumbukan meteor besi", "Danau lava belerang"]'::jsonb, 1, 'Great Red Spot adalah pusaran badai antisiklon abadi berdiameter lebih dari 16.000 km dengan kecepatan angin mencapai 680 km/jam.', 50),
('30000000-0000-0000-0000-000000000018', 'jupiter', 'Lapisan apakah di bagian dalam Jupiter yang membangkitkan medan magnet terkuat dan memicu aurora raksasa di kutubnya?',
 '["Batu kapur kering", "Lautan hidrogen metalik cair bertekanan jutaan atmosfer", "Pasir kuarsa", "Es karbon dioksida"]'::jsonb, 1, 'Tekanan ekstrem di dalam Jupiter memampatkan gas hidrogen menjadi cairan logam penghantar listrik yang menghasilkan magnetosfer raksasa.', 50),
('30000000-0000-0000-0000-000000000019', 'jupiter', 'Manakah dari keempat bulan Galilea Jupiter yang memiliki ratusan gunung berapi belerang paling aktif di Tata Surya?',
 '["Callisto", "Io", "Ganymede", "Triton"]'::jsonb, 1, 'Gaya pasang surut gravitasi dari Jupiter, Europa, dan Ganymede terus meremas bagian dalam bulan Io hingga memicu ratusan gunung berapi aktif.', 50),
('30000000-0000-0000-0000-000000000020', 'jupiter', 'Berapa lama waktu yang dibutuhkan raksasa gas Jupiter untuk berputar satu kali penuh pada porosnya (satu hari Jupiter)?',
 '["243 hari Bumi", "Sekitar 9 jam 55 menit (rotasi tercepat di Tata Surya)", "365 hari", "58,6 hari"]'::jsonb, 1, 'Meskipun ukurannya paling besar, Jupiter berputar paling cepat pada porosnya yaitu hanya 9,93 jam per putaran.', 50),
('30000000-0000-0000-0000-000000000021', 'saturn', 'Fenomena cuaca unik apakah yang berputar di kutub utara Saturnus dengan lebar mencapai 29.000 kilometer?',
 '["Bintik Gelap Persegi", "Pusaran Badai Segi Enam Sempurna (Saturn''s Hexagon)", "Badai Debu Karat", "Awan Asam Sulfat"]'::jsonb, 1, 'Kutub utara Saturnus memiliki pola gelombang arus jet atmosfer berbentuk segi enam (heksagon) selebar dua kali diameter Bumi.', 50),
('30000000-0000-0000-0000-000000000022', 'saturn', 'Apakah materi penyusun utama cincin berkilauan Saturnus dan apa nama celah selebar 4.800 km yang memisahkan Cincin A dan B?',
 '["Debu besi panas & Celah Mariner", "Miliaran bongkahan es air murni & Celah Divisi Cassini", "Gas neon & Celah Kuiper", "Batu bara & Celah Gale"]'::jsonb, 1, 'Cincin Saturnus tersusun 99% atas es air murni, dan celah Divisi Cassini terbentuk akibat resonansi gravitasi bulan Mimas.', 50),
('30000000-0000-0000-0000-000000000023', 'saturn', 'Di bulan terbesar Saturnus, yaitu Titan, wahana Huygens menemukan sungai, hujan, dan danau cair yang tersusun dari...',
 '["Air laut asin hangat", "Hidrokarbon metana dan etana cair pada suhu -179°C", "Besi cair panas", "Asam sulfat pekat"]'::jsonb, 1, 'Pada suhu dingin -179°C di Titan, gas metana dan etana mencair membentuk siklus hujan, sungai, dan danau hidrokarbon.', 50),
('30000000-0000-0000-0000-000000000024', 'saturn', 'Bulan es milik Saturnus yang menyemburkan geyser uap air asin dari samudra bawah permukaannya di kutub selatan adalah...',
 '["Phobos", "Enceladus", "Deimos", "Io"]'::jsonb, 1, 'Wahana Cassini menemukan semburan geyser air asin dan aktivitas hidrotermal dari celah es kutub selatan bulan Enceladus.', 50),
('30000000-0000-0000-0000-000000000025', 'uranus', 'Fenomena hujan unik apakah yang terjadi di kedalaman mantel es Uranus dan Neptunus akibat tekanan 6 juta atmosfer?',
 '["Hujan air biasa", "Hujan Kristal Berlian (Diamond Rain) dari pemecahan molekul metana", "Hujan pasir besi", "Hujan debu belerang"]'::jsonb, 1, 'Tekanan jutaan atmosfer dan suhu ribuan derajat di mantel Uranus serta Neptunus memisahkan atom karbon dari metana (CH4) dan memampatkannya menjadi hujan berlian.', 50),
('30000000-0000-0000-0000-000000000026', 'uranus', 'Apa dampak dari kemiringan poros rotasi Uranus yang rebah ekstrem hingga 97,77 derajat?',
 '["Uranus tidak pernah mengelilingi Matahari", "Uranus tampak menggelinding miring di orbitnya dan kutubnya mengalami 42 tahun siang diikuti 42 tahun malam", "Suhu Uranus menjadi 500°C", "Uranus kehilangan seluruh atmosfernya"]'::jsonb, 1, 'Poros 97,77° membuat Uranus berputar miring seperti bola yang menggelinding bersama 13 cincin vertikalnya.', 50),
('30000000-0000-0000-0000-000000000027', 'uranus', 'Gas apakah di atmosfer bagian atas Uranus yang menyerap spektrum cahaya merah dan memberi warna biru-kehijauan (cyan)?',
 '["Karbon Dioksida", "Metana (CH4)", "Oksigen Murni", "Uap Besi"]'::jsonb, 1, 'Metana di atmosfer atas Uranus menyerap cahaya merah Matahari dan memantulkan cahaya biru-kehijauan kembali ke ruang angkasa.', 50),
('30000000-0000-0000-0000-000000000028', 'uranus', 'Apa nama tebing patahan es setinggi 20 km (tertinggi di Tata Surya) yang dipotret Voyager 2 di bulan Miranda milik Uranus?',
 '["Enterprise Rupes", "Verona Rupes", "Valles Marineris", "Palung Mariana"]'::jsonb, 1, 'Verona Rupes di bulan Miranda menjulang setinggi 20 km—hampir dua kali lipat kedalaman Palung Mariana di Bumi.', 50),
('30000000-0000-0000-0000-000000000029', 'neptune', 'Berapakah rekor kecepatan angin badai supersonik di atmosfer Neptunus yang menjadikannya angin tercepat di Tata Surya?',
 '["100 km/jam", "Lebih dari 2.100 km/jam (melampaui kecepatan suara)", "300 km/jam", "50 km/jam"]'::jsonb, 1, 'Panas internal Neptunus dan atmosfer es metananya yang minim gesekan memicu angin supersonik hingga 2.100 km/jam di sekitar Bintik Gelap Besar.', 50),
('30000000-0000-0000-0000-000000000030', 'neptune', 'Selain di Uranus, mengapa jatuhnya hujan kristal berlian di dalam mantel Neptunus sangat penting bagi kondisi fisik planet tersebut?',
 '["Membuat Neptunus menjadi kotak", "Gesekan jatuhnya berlian menuju inti planet menghasilkan panas internal tambahan bagi Neptunus", "Menghentikan rotasi Neptunus", "Mengubah warna Neptunus menjadi merah"]'::jsonb, 1, 'Tenggelamnya kristal berlian padat melalui mantel fluida superionik memicu gesekan gravitasi yang memanaskan bagian dalam Neptunus.', 50),
('30000000-0000-0000-0000-000000000031', 'neptune', 'Apa keunikan bulan terbesar Neptunus, yaitu Triton, yang ditemukan oleh wahana Voyager 2 pada tahun 1989?',
 '["Permukaannya berupa lautan lava pijar", "Mengorbit berlawanan arah (retrograde) dan memiliki geyser aktif yang menyemburkan nitrogen cair setinggi 8 km", "Tidak memiliki gravitasi", "Berbentuk kubus"]'::jsonb, 1, 'Triton adalah objek Sabuk Kuiper yang tertangkap gravitasi Neptunus dan memiliki gunung api es (cryovolcano) yang menyemburkan gas nitrogen cair.', 50),
('30000000-0000-0000-0000-000000000032', 'neptune', 'Mengapa penemuan planet Neptunus pada tahun 1846 menjadi tonggak sejarah besar dalam ilmu astronomi?',
 '["Karena ditemukan oleh astronot yang mendarat di sana", "Karena merupakan planet pertama yang posisinya ditemukan lewat perhitungan rumus matematika sebelum diamati teleskop", "Karena terlihat sebesar Bulan dengan mata telanjang", "Karena menabrak planet Mars"]'::jsonb, 1, 'Urbain Le Verrier dan John Couch Adams menghitung posisi Neptunus secara matematis dari gangguan gravitasi pada orbit Uranus sebelum diamati Johann Galle.', 50),

-- Seed 20 Soal Kuis 6 Bulan / Satelit Alami
('30000000-0000-0000-0000-000000000033', 'moon', 'Mengapa dari Bumi kita selalu melihat sisi permukaan Bulan yang sama sepanjang waktu?',
 '["Karena Bulan tidak berputar sama sekali", "Karena rotasi Bulan terkunci pasang surut (tidal lock) dengan periode rotasi sama persis dengan periode orbitnya", "Karena sisi belakang Bulan selalu gelap gulita", "Karena gravitasi Matahari menghentikan putaran Bulan"]'::jsonb, 1, 'Periode rotasi poros Bulan dan periode revolusinya mengitari Bumi persis sama (27,3 hari), fenomena yang dinamakan penguncian pasang surut (tidal locking).', 50),
('30000000-0000-0000-0000-000000000034', 'moon', 'Berapakah rasio perbandingan gravitasi di permukaan Bulan jika dibandingkan dengan gravitasi Bumi?',
 '["Sama persis dengan gravitasi Bumi", "Sekitar 1/6 (seperenam) dari gravitasi Bumi", "Sekitar 3 kali lebih kuat dari Bumi", "Nol (tidak ada gravitasi sama sekali)"]'::jsonb, 1, 'Gravitasi permukaan Bulan adalah sekitar 1,62 m/s² atau seperenam gravitasi Bumi, memungkinkan astronaut melompat tinggi meski mengenakan pakaian antariksa berbobot 80 kg.', 50),
('30000000-0000-0000-0000-000000000035', 'moon', 'Apakah sebutan bagi dataran luas berwarna gelap di permukaan Bulan yang terbentuk dari aliran lava basal purba?',
 '["Terrae", "Mare (Lautan Bulan)", "Rilles", "Kawah Tumbukan"]'::jsonb, 1, 'Dataran gelap di Bulan disebut Mare (bahasa Latin untuk laut). Daerah ini terbentuk ketika magma basal purba keluar dan menggenangi cekungan-cekungan kawah raksasa.', 50),
('30000000-0000-0000-0000-000000000036', 'moon', 'Misi antariksa NASA manakah yang pada Juli 1969 pertama kali berhasil mendaratkan manusia di permukaan Bulan?',
 '["Apollo 8", "Apollo 11", "Apollo 13", "Gemini 4"]'::jsonb, 1, 'Apollo 11 berhasil mendaratkan modul Lunar Module Eagle di Mare Tranquillitatis pada 20 Juli 1969, dengan Neil Armstrong dan Buzz Aldrin sebagai manusia pertama di Bulan.', 50),

('30000000-0000-0000-0000-000000000037', 'io', 'Apa faktor utama yang membuat Io menjadi benda langit paling aktif secara vulkanik di seluruh Tata Surya?',
 '["Jaraknya sangat dekat dengan panas Matahari", "Gesekan gravitasi pasang surut (tidal heating) akibat tarikan kuat Jupiter, Europa, dan Ganymede", "Reaksi fusi nuklir di permukaannya", "Tumbukan komet setiap hari"]'::jsonb, 1, 'Resonansi orbit Laplace antara Io, Europa, dan Ganymede membuat orbit Io agak lonjong, sehingga gaya gravitasi pasang surut Jupiter terus meremas dan melelehkan bagian dalamnya.', 50),
('30000000-0000-0000-0000-000000000038', 'io', 'Mineral utama apakah yang menyembur dari ratusan gunung berapi di Io dan memberi warna kuning-jingga khas pada permukaannya?',
 '["Kristal es air murni", "Belerang (sulfur) dan gas belerang dioksida", "Garam dapur", "Oksida besi karat"]'::jsonb, 1, 'Semburan vulkanik Io kaya akan senyawa belerang dan sulfur dioksida yang membeku dan melapisi seluruh permukaan Io dengan warna kuning, jingga, dan hitam.', 50),
('30000000-0000-0000-0000-000000000039', 'io', 'Mengapa di permukaan bulan Io hampir tidak ditemukan kawah tumbukan meteorit purba?',
 '["Karena Io dilindungi perisai medan magnet khusus", "Karena letusan lava vulkanik yang terus-menerus selalu melapisi dan memperbarui permukaannya", "Karena meteor selalu hancur ditarik Jupiter", "Karena permukaannya berupa cairan gas"]'::jsonb, 1, 'Aktivitas vulkanik Io yang sangat tinggi terus mengubur kawah tumbukan baru dengan lapisan lava segar, menjadikannya permukaan geologis termuda di Tata Surya.', 50),

('30000000-0000-0000-0000-000000000040', 'europa', 'Kondisi geologis istimewa apakah yang tersimpan di balik lapisan kerak es tebal bulan Europa?',
 '["Danau lava belerang cair", "Samudra air asin cair global sedalam 60–150 km", "Gurun pasir kuarsa panas", "Rongga hampa udara total"]'::jsonb, 1, 'Di bawah kerak es Europa setebal 15–25 km terdapat samudra air cair asin yang diperkirakan memiliki volume dua kali lipat seluruh samudra di Bumi.', 50),
('30000000-0000-0000-0000-000000000041', 'europa', 'Apakah yang menyebabkan garis-garis retakan kemerahan (lineae) terbentuk di seluruh permukaan es Europa?',
 '["Gaya pasang surut gravitasi Jupiter yang meregangkan dan meretakkan kerak es", "Goresan roda wahana antariksa", "Aliran sungai air tawar di permukaan", "Petir atmosferik"]'::jsonb, 0, 'Tarikan pasang surut Jupiter meregangkan kerak es Europa secara berkala, menciptakan retakan-retakan panjang tempat air bawah tanah dan mineral garam naik ke permukaan.', 50),
('30000000-0000-0000-0000-000000000042', 'europa', 'Mengapa Europa menjadi salah satu target utama para astrobiolog dalam mencari potensi kehidupan di luar Bumi?',
 '["Karena memiliki hutan tumbuhan hijau", "Karena memiliki air cair melimpah, energi hidrotermal, dan unsur kimia organik di dasar laut bawah esnya", "Karena suhunya hangat seperti khatulistiwa Bumi", "Karena atmosfernya kaya akan gas oksigen padat"]'::jsonb, 1, 'Kombinasi samudra air cair yang stabil, ventilasi hidrotermal di dasar samudra berbatu, dan garam organik menjadikan Europa lingkungan paling menjanjikan bagi mikroba ekstremofil.', 50),

('30000000-0000-0000-0000-000000000043', 'ganymede', 'Bulan manakah yang memegang rekor sebagai satelit alami terbesar di seluruh Tata Surya, bahkan mengungguli planet Merkurius?',
 '["Titan", "Ganymede", "Callisto", "Bulan (Bumi)"]'::jsonb, 1, 'Ganymede memiliki diameter 5.268 km, menjadikannya lebih besar daripada planet Merkurius (4.879 km) dan planet kerdil Pluto (2.376 km).', 50),
('30000000-0000-0000-0000-000000000044', 'ganymede', 'Keunikan magnetik langka apakah yang hanya dimiliki oleh Ganymede di antara seluruh satelit di Tata Surya?',
 '["Tidak memiliki gravitasi sama sekali", "Memiliki medan magnet internalnya sendiri berkat inti besi cair yang aktif", "Memancarkan gelombang radio radioaktif", "Membalikkan medan magnet Jupiter"]'::jsonb, 1, 'Ganymede adalah satu-satunya satelit alami yang diketahui memiliki magnetosfer sendiri yang dibangkitkan oleh konveksi inti besi cair di dalamnya.', 50),
('30000000-0000-0000-0000-000000000045', 'ganymede', 'Misi antariksa milik ESA yang diluncurkan pada tahun 2023 untuk meneliti potensi kelayakhunian Ganymede dan bulan-bulan es Jupiter adalah...',
 '["Voyager 1", "JUICE (Jupiter Icy Moons Explorer)", "New Horizons", "Cassini-Huygens"]'::jsonb, 1, 'Wahana JUICE diluncurkan pada April 2023 dan dijadwalkan tiba di sistem Jupiter pada 2031 untuk memasuki orbit khusus mengelilingi Ganymede.', 50),

('30000000-0000-0000-0000-000000000046', 'callisto', 'Mengapa permukaan bulan Callisto dijuluki sebagai salah satu bentang alam tertua di Tata Surya?',
 '["Karena terbentuk dari debu galaksi lain", "Karena permukaannya dipenuhi kawah purba yang nyaris tidak berubah selama 4 miliar tahun tanpa aktivitas tektonik", "Karena dilapisi batu bara fosil", "Karena permukaannya selalu tertutup awan gas"]'::jsonb, 1, 'Callisto tidak memiliki aktivitas geologis atau lempeng tektonik internal, sehingga kawah tumbukan purba dari masa awal Tata Surya tetap terjaga utuh tanpa terkikis.', 50),
('30000000-0000-0000-0000-000000000047', 'callisto', 'Apa nama cekungan kawah tumbukan multiring raksasa selebar 3.800 km yang membentang di permukaan Callisto?',
 '["Cekungan Caloris", "Cekungan Kawah Valhalla", "Kawah Gale", "Olympus Mons"]'::jsonb, 1, 'Cekungan Valhalla adalah salah satu struktur tumbukan multiring terbesar di Tata Surya dengan pola lingkaran cincin konsentris yang membentang hingga radius ribuan kilometer.', 50),
('30000000-0000-0000-0000-000000000048', 'callisto', 'Dibandingkan dengan 3 satelit Galileo lainnya (Io, Europa, Ganymede), keuntungan apa yang dimiliki Callisto untuk misi eksplorasi masa depan?',
 '["Memiliki atmosfer yang bisa langsung dihirup manusia", "Terletak di orbit paling luar sehingga tingkat radiasi mematikan dari Jupiter jauh lebih rendah", "Memiliki suhu permukaan yang hangat", "Memiliki lautan air terbuka di permukaan"]'::jsonb, 1, 'Karena berada di orbit terluar satelit Galilea, Callisto berada di luar sabuk radiasi intens Jupiter, menjadikannya lokasi paling aman untuk pangkalan riset masa depan.', 50),

('30000000-0000-0000-0000-000000000049', 'titan', 'Unsur gas apakah yang mendominasi sekitar 95% dari atmosfer tebal bulan Titan milik Saturnus?',
 '["Oksigen", "Nitrogen", "Karbon monoksida", "Helium"]'::jsonb, 1, 'Atmosfer tebal Titan didominasi oleh gas nitrogen (sekitar 95%) dengan tekanan permukaan 1,5 kali atmosfer Bumi, serta kandungan metana sekitar 5%.', 50),
('30000000-0000-0000-0000-000000000050', 'titan', 'Cairan apakah yang mengisi danau, sungai, dan laut alami (seperti Kraken Mare) di permukaan bulan Titan?',
 '["Air tawar murni", "Metana dan etana hidrokarbon cair", "Asam sulfat pekat", "Merkuri (raksa) cair"]'::jsonb, 1, 'Pada suhu -179°C di Titan, air membeku menjadi batu es padat, sementara gas metana dan etana mengembun menjadi cairan yang mengalir di sungai dan danau.', 50),
('30000000-0000-0000-0000-000000000051', 'titan', 'Wahana pendarat antariksa (probe) manakah yang mencatat sejarah sebagai benda buatan manusia pertama yang mendarat di permukaan Titan pada tahun 2005?',
 '["Viking 1", "Huygens (bagian misi Cassini-Huygens)", "Curiosity", "Philae"]'::jsonb, 1, 'Probe Huygens milik ESA dilepaskan dari pengorbit Cassini dan mendarat dengan parasut di dataran kerikil es Titan pada 14 Januari 2005.', 50),
('30000000-0000-0000-0000-000000000052', 'titan', 'Meskipun suhunya membeku hingga -179°C, mengapa Titan dianggap sangat mirip dengan kondisi Bumi purba?',
 '["Karena memiliki gurun pasir panas dan gunung berapi aktif", "Karena memiliki atmosfer tebal, siklus hujan fluida cuaca, dan senyawa kimia prebiotik organik kompleks", "Karena jaraknya sama ke Matahari seperti Bumi", "Karena ukuran dan massanya persis sama dengan planet Bumi"]'::jsonb, 1, 'Titan kaya akan molekul organik kompleks (tholin) dan siklus cairan aktif, menghadirkan laboratorium alami untuk mempelajari kimiawi prebiotik sebelum kehidupan muncul di Bumi.', 50)
ON CONFLICT (question_id) DO UPDATE SET
  planet_id = EXCLUDED.planet_id,
  soal = EXCLUDED.soal,
  opsi = EXCLUDED.opsi,
  kunci_jawaban = EXCLUDED.kunci_jawaban,
  pembahasan_edukatif = EXCLUDED.pembahasan_edukatif,
  bobot_poin = EXCLUDED.bobot_poin;

-- 6.5 Seed 24 Soal Mitos atau Fakta Populer (Tab Mitos atau Fakta)
INSERT INTO public.myths (
  myth_id, slug, benda_langit, pernyataan, is_fact, penjelasan, sumber_referensi, bobot_poin, is_active
) VALUES
('40000000-0000-0000-0000-000000000001', 'musim-jarak', 'bumi', 'Musim terjadi karena Bumi kadang lebih dekat ke Matahari.', false, 'Bumi justru paling dekat ke Matahari pada awal Januari. Musim terjadi karena sumbu Bumi miring 23,4°.', 'NASA Space Place', 10, true),
('40000000-0000-0000-0000-000000000002', 'planet-bintang', 'matahari', 'Planet selalu lebih besar daripada bintang.', false, 'Matahari adalah bintang, dan lebarnya 109 kali Bumi. Bintang tampak kecil hanya karena letaknya sangat jauh.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000003', 'es-merkurius', 'merkurius', 'Merkurius, planet terdekat ke Matahari, menyimpan es.', true, 'Es itu ada di dasar kawah dekat kutub yang tidak pernah terkena sinar Matahari.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000004', 'merkurius-terpanas', 'merkurius', 'Merkurius adalah planet terpanas karena paling dekat ke Matahari.', false, 'Venus lebih panas, sekitar 465 °C. Atmosfernya yang tebal memerangkap panas seperti selimut.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000005', 'senja-mars', 'mars', 'Matahari terbenam di Mars berwarna biru.', true, 'Debu halus di udara Mars meneruskan cahaya biru di sekitar Matahari saat senja.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000006', 'bulan-menjauh', 'bulan', 'Bulan perlahan menjauhi Bumi.', true, 'Sekitar 3,8 cm per tahun. Diukur dengan sinar laser yang dipantulkan cermin peninggalan astronaut Apollo.', 'NASA JPL', 10, true),
('40000000-0000-0000-0000-000000000007', 'sisi-gelap', 'bulan', 'Sisi Bulan yang tidak pernah kita lihat selalu gelap.', false, 'Sisi jauh Bulan juga mengalami siang dan malam. Kita tidak melihatnya karena Bulan berputar sekali setiap mengelilingi Bumi.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000008', 'massa-matahari', 'matahari', 'Matahari memuat hampir seluruh massa tata surya.', true, 'Sekitar 99,86%. Semua planet, bulan, dan asteroid digabung hanya sisanya.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000009', 'cincin-saturnus', 'saturnus', 'Hanya Saturnus yang punya cincin.', false, 'Jupiter, Uranus, dan Neptunus juga bercincin, hanya lebih tipis dan gelap.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000010', 'suara-angkasa', 'bumi', 'Ledakan di luar angkasa terdengar keras seperti di film.', false, 'Suara butuh udara atau benda lain untuk merambat. Ruang angkasa hampir hampa, jadi sunyi.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000011', 'venus-putar', 'venus', 'Venus butuh waktu lebih lama untuk berputar sekali daripada untuk mengelilingi Matahari.', true, 'Sekali berputar butuh 243 hari Bumi, sedangkan setahun Venus hanya 225 hari.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000012', 'lihat-gerhana', 'matahari', 'Gerhana Matahari sebagian aman dilihat langsung karena Mataharinya tertutup.', false, 'Sisa cahaya Matahari tetap bisa merusak mata. Pakai kacamata gerhana khusus atau proyeksi lubang jarum.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000013', 'bulan-hilang', 'bulan', 'Saat gerhana Bulan total, Bulan hilang dari langit.', false, 'Bulan tetap terlihat dan berwarna merah tembaga, karena cahaya Matahari dibelokkan atmosfer Bumi.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000014', 'angin-neptunus', 'neptunus', 'Angin tercepat di tata surya bertiup di Neptunus.', true, 'Lebih dari 2.000 km/jam, padahal Neptunus paling jauh dan paling sedikit menerima cahaya Matahari.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000015', 'pluto', 'neptunus', 'Pluto masih digolongkan sebagai planet.', false, 'Sejak 2006 Pluto disebut planet kerdil, karena lintasannya masih dipenuhi banyak benda lain.', 'IAU', 10, true),
('40000000-0000-0000-0000-000000000016', 'bintang-jatuh', 'bumi', 'Bintang jatuh adalah bintang yang benar-benar jatuh.', false, 'Itu meteor: butiran batu atau debu kecil yang terbakar saat masuk atmosfer Bumi.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000017', 'jupiter-hari', 'jupiter', 'Sehari di Jupiter kurang dari 10 jam.', true, 'Tepatnya 9 jam 56 menit. Jupiter berputar paling cepat, sampai bentuknya agak gepeng.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000018', 'gravitasi-bulan', 'bulan', 'Di Bulan tidak ada gravitasi, makanya astronaut melayang.', false, 'Gravitasi Bulan sekitar 1/6 gravitasi Bumi. Astronaut bisa melompat tinggi, tapi tetap jatuh kembali.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000019', 'uranus-rebah', 'uranus', 'Uranus berputar dalam posisi hampir rebah.', true, 'Sumbunya miring 98°, sehingga kutubnya bergantian menghadap Matahari selama sekitar 42 tahun.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000020', 'cahaya-8menit', 'matahari', 'Cahaya Matahari yang kita lihat berangkat sekitar 8 menit yang lalu.', true, 'Jaraknya sekitar 150 juta km. Cahaya butuh sekitar 8 menit 20 detik untuk sampai ke Bumi.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000021', 'saturnus-padat', 'saturnus', 'Saturnus kurang padat dibanding air.', true, 'Kepadatan rata-ratanya 0,69 g/cm³, lebih rendah dari air. Saturnus planet yang paling tidak padat.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000022', 'matahari-kuning', 'matahari', 'Matahari berwarna kuning.', false, 'Cahaya Matahari sebenarnya putih. Atmosfer Bumi menghamburkan warna biru, sehingga dari permukaan Bumi Matahari tampak kekuningan.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000023', 'cincin-matahari', 'matahari', 'Cincin pelangi di sekeliling Matahari (halo) terbentuk di dekat Matahari.', false, 'Halo terbentuk di langit Bumi: kristal es di awan tinggi yang tipis membelokkan cahaya Matahari sekitar 22°.', 'NASA', 10, true),
('40000000-0000-0000-0000-000000000024', 'korona-panas', 'matahari', 'Lapisan luar Matahari (korona) lebih panas daripada permukaannya.', true, 'Permukaan sekitar 5.500 °C, korona lebih dari 1 juta °C. Penyebabnya masih diteliti ilmuwan.', 'NASA', 10, true)
ON CONFLICT (myth_id) DO UPDATE SET
  slug = EXCLUDED.slug,
  benda_langit = EXCLUDED.benda_langit,
  pernyataan = EXCLUDED.pernyataan,
  is_fact = EXCLUDED.is_fact,
  penjelasan = EXCLUDED.penjelasan,
  sumber_referensi = EXCLUDED.sumber_referensi,
  bobot_poin = EXCLUDED.bobot_poin,
  is_active = EXCLUDED.is_active;

-- 6.6 Seed Kartu Fakta "Tahukah Kamu?" (16 Benda Langit dari app/data/learning.js)
INSERT INTO public.facts (
  fact_id, body_id, judul, isi_fakta, sumber_referensi, urutan, is_active
) VALUES
('50000000-0000-0000-0000-000000000001', 'matahari', '99,86%', 'Bagian massa tata surya yang dimiliki Matahari. Semua planet digabung hanya sisa sedikit.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000002', 'matahari', '1,3 juta Bumi', 'Kira-kira sebanyak itu Bumi yang muat di dalam Matahari.', 'NASA', 2, true),
('50000000-0000-0000-0000-000000000003', 'matahari', '8 menit 20 detik', 'Waktu cahaya Matahari sampai ke Bumi. Matahari yang kamu lihat adalah Matahari 8 menit yang lalu.', 'NASA', 3, true),

('50000000-0000-0000-0000-000000000004', 'merkurius', 'Menyimpan es', 'Di kawah dekat kutubnya yang tidak pernah terkena sinar Matahari, tersimpan es air.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000005', 'merkurius', '430 °C dan −180 °C', 'Siangnya sangat panas, malamnya sangat dingin, karena hampir tidak ada atmosfer yang menyimpan panas.', 'NASA', 2, true),
('50000000-0000-0000-0000-000000000006', 'merkurius', '88 hari', 'Lama setahun di Merkurius — tercepat di antara semua planet.', 'NASA', 3, true),

('50000000-0000-0000-0000-000000000007', 'venus', '465 °C', 'Venus planet terpanas, lebih panas dari Merkurius, karena atmosfernya memerangkap panas.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000008', 'venus', 'Terbit di barat', 'Venus berputar terbalik, jadi Matahari terbit di barat dan terbenam di timur.', 'NASA', 2, true),
('50000000-0000-0000-0000-000000000009', 'venus', '90 kali tekanan Bumi', 'Tekanan udara di permukaan Venus setara menyelam hampir 1 km di bawah laut.', 'NASA', 3, true),

('50000000-0000-0000-0000-000000000010', 'bumi', 'Agak gepeng', 'Lebar Bumi di khatulistiwa 43 km lebih besar daripada jarak kutub ke kutub.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000011', 'bumi', '107.000 km/jam', 'Kecepatan Bumi mengelilingi Matahari. Kita tidak merasakannya karena semuanya ikut bergerak.', 'NASA', 2, true),
('50000000-0000-0000-0000-000000000012', 'bumi', 'Terdekat di bulan Januari', 'Bumi paling dekat ke Matahari pada awal Januari. Musim terjadi karena sumbu Bumi miring, bukan karena jarak.', 'NASA Space Place', 3, true),

('50000000-0000-0000-0000-000000000013', 'mars', 'Senja berwarna biru', 'Debu halus di udara Mars meneruskan cahaya biru di sekitar Matahari saat terbenam.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000014', 'mars', '2,5 kali Everest', 'Olympus Mons di Mars adalah gunung berapi tertinggi di tata surya.', 'NASA', 2, true),
('50000000-0000-0000-0000-000000000015', 'mars', 'Merah karena karat', 'Tanah Mars mengandung besi yang teroksidasi, mirip karat.', 'NASA', 3, true),

('50000000-0000-0000-0000-000000000016', 'jupiter', '1.300 Bumi', 'Kira-kira sebanyak itu Bumi yang muat di dalam Jupiter.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000017', 'jupiter', 'Badai ratusan tahun', 'Bintik Merah Raksasa adalah badai yang lebih lebar dari Bumi dan sudah berlangsung ratusan tahun.', 'NASA', 2, true),
('50000000-0000-0000-0000-000000000018', 'jupiter', '9 jam 56 menit', 'Lama sehari di Jupiter — paling singkat di tata surya.', 'NASA', 3, true),

('50000000-0000-0000-0000-000000000019', 'saturnus', 'Kurang padat dari air', 'Saturnus planet yang paling tidak padat. Kepadatan rata-ratanya lebih rendah dari air.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000020', 'saturnus', 'Setebal 10 meter', 'Cincinnya selebar ratusan ribu km, tapi di banyak bagian tebalnya hanya sekitar 10 meter.', 'NASA', 2, true),
('50000000-0000-0000-0000-000000000021', 'saturnus', 'Es dan batu', 'Cincin Saturnus tersusun dari bongkah es dan batu, dari sekecil debu sampai sebesar rumah.', 'NASA', 3, true),

('50000000-0000-0000-0000-000000000022', 'uranus', 'Miring 98°', 'Uranus seperti berguling di orbitnya. Kutubnya bergantian disinari Matahari selama sekitar 42 tahun.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000023', 'uranus', 'Bau telur busuk', 'Awan Uranus mengandung hidrogen sulfida, gas yang baunya seperti telur busuk.', 'NASA', 2, true),
('50000000-0000-0000-0000-000000000024', 'uranus', 'Tahun 1781', 'Uranus planet pertama yang ditemukan dengan teleskop, oleh William Herschel.', 'NASA', 3, true),

('50000000-0000-0000-0000-000000000025', 'neptunus', '2.000 km/jam', 'Angin tercepat di tata surya bertiup di Neptunus, padahal letaknya paling jauh dari Matahari.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000026', 'neptunus', 'Ditemukan dengan hitungan', 'Gerak Uranus yang "aneh" membuat ilmuwan menghitung letak planet lain. Neptunus ditemukan di sana pada 1846.', 'NASA', 2, true),
('50000000-0000-0000-0000-000000000027', 'neptunus', '165 tahun', 'Lama setahun di Neptunus. Sejak ditemukan, ia baru sekali mengelilingi Matahari, tepat pada 2011.', 'NASA', 3, true),

('50000000-0000-0000-0000-000000000028', 'bulan', '3,8 cm per tahun', 'Bulan perlahan menjauhi Bumi. Diukur dengan laser yang dipantulkan cermin peninggalan astronaut Apollo.', 'NASA JPL', 1, true),
('50000000-0000-0000-0000-000000000029', 'bulan', 'Wajah yang sama', 'Bulan berputar sekali setiap mengelilingi Bumi, jadi kita selalu melihat sisi yang sama.', 'NASA', 2, true),
('50000000-0000-0000-0000-000000000030', 'bulan', 'Jejak jutaan tahun', 'Tanpa angin dan hujan, jejak kaki astronaut di Bulan bisa bertahan jutaan tahun.', 'NASA', 3, true),

('50000000-0000-0000-0000-000000000031', 'io', 'Ratusan gunung api', 'Io adalah tempat dengan gunung api paling aktif di tata surya.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000032', 'io', 'Diremas Jupiter', 'Tarikan gravitasi Jupiter terus meremas Io, sehingga bagian dalamnya sangat panas.', 'NASA', 2, true),

('50000000-0000-0000-0000-000000000033', 'europa', 'Lautan di bawah es', 'Di bawah kerak es Europa ada lautan air asin, diperkirakan berisi air dua kali lebih banyak dari semua lautan di Bumi.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000034', 'europa', 'Dicari tanda kehidupan', 'Wahana Europa Clipper diluncurkan tahun 2024 untuk menyelidiki apakah Europa bisa mendukung kehidupan.', 'NASA', 2, true),

('50000000-0000-0000-0000-000000000035', 'ganymede', 'Lebih besar dari Merkurius', 'Ganymede satelit terbesar di tata surya, bahkan lebih lebar dari planet Merkurius.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000036', 'ganymede', 'Punya aurora', 'Satu-satunya satelit yang diketahui punya medan magnet sendiri, sehingga ada auroranya.', 'NASA', 2, true),

('50000000-0000-0000-0000-000000000037', 'callisto', 'Penuh kawah', 'Permukaan Callisto termasuk yang paling banyak kawahnya di tata surya, hampir tak berubah selama miliaran tahun.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000038', 'callisto', 'Hampir sebesar Merkurius', 'Lebarnya 4.821 km, hanya sedikit lebih kecil dari Merkurius (4.879 km).', 'NASA', 2, true),

('50000000-0000-0000-0000-000000000039', 'titan', 'Hujan metana', 'Titan punya hujan, sungai, dan danau — tapi isinya metana cair, bukan air.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000040', 'titan', 'Atmosfer tebal', 'Satu-satunya satelit dengan atmosfer tebal; tekanannya sekitar 1,5 kali tekanan udara di Bumi.', 'NASA', 2, true),

('50000000-0000-0000-0000-000000000041', 'sabuk', 'Tidak sepadat di film', 'Jarak antarasteroid rata-rata ratusan ribu km. Wahana antariksa melintasinya dengan aman.', 'NASA', 1, true),
('50000000-0000-0000-0000-000000000042', 'sabuk', 'Lebih ringan dari Bulan', 'Semua asteroid di sabuk utama digabung masih lebih ringan dari Bulan kita.', 'NASA', 2, true),
('50000000-0000-0000-0000-000000000043', 'sabuk', 'Ceres', 'Benda terbesar di sabuk asteroid adalah planet kerdil Ceres, lebarnya sekitar 940 km.', 'NASA', 3, true)
ON CONFLICT (fact_id) DO UPDATE SET
  body_id = EXCLUDED.body_id,
  judul = EXCLUDED.judul,
  isi_fakta = EXCLUDED.isi_fakta,
  sumber_referensi = EXCLUDED.sumber_referensi,
  urutan = EXCLUDED.urutan,
  is_active = EXCLUDED.is_active;


-- ==============================================================================
-- 7. PENDAFTARAN AKUN ADMIN (TEMPLATE GLOBAL - TANPA KREDENSIAL NYATA)
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
