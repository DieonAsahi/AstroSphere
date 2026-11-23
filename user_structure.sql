-- ============================================================================
-- ASTROSPHERE — SKEMA BASIS DATA PROGRES PEMAIN (USER CLOUD SAVE & AUTH)
-- ============================================================================
-- Berkas: user_structure.sql (dan salinan di supabase/user/structure.sql)
-- Deskripsi:
--   Skema tabel progres pemain yang terhubung ke sistem autentikasi Supabase
--   (auth.users), fungsi pengecekan username aman, Row Level Security (RLS)
--   ketat, serta izin akses per-role.
-- ============================================================================

-- 1. TABEL UTAMA: public.player_progress
CREATE TABLE IF NOT EXISTS public.player_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name TEXT NOT NULL DEFAULT '',
  points INT NOT NULL DEFAULT 0 CHECK (points >= 0),
  earned INT NOT NULL DEFAULT 0 CHECK (earned >= 0),
  selected_ship TEXT NOT NULL DEFAULT 'astra',
  owned_ships JSONB NOT NULL DEFAULT '["astra"]'::jsonb,
  progress_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeks pencarian cepat username (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_player_progress_username_lower 
  ON public.player_progress (LOWER(username));

-- Indeks pencarian poin & peringkat penjelajah
CREATE INDEX IF NOT EXISTS idx_player_progress_points 
  ON public.player_progress (points DESC);

-- Komentar dokumentasi tabel & kolom
COMMENT ON TABLE public.player_progress IS 'Menyimpan progres penjelajahan, ekonomi bintang, pesawat, dan preferensi pemain terdaftar.';
COMMENT ON COLUMN public.player_progress.user_id IS 'ID pengguna unik yang terikat ke auth.users(id).';
COMMENT ON COLUMN public.player_progress.username IS 'Nama pengguna unik penjelajah (3-20 karakter alfanumerik dan garis bawah).';
COMMENT ON COLUMN public.player_progress.display_name IS 'Nama tampilan yang terlihat di profil penjelajah.';
COMMENT ON COLUMN public.player_progress.points IS 'Saldo bintang/poin aktif pemain untuk membuka pesawat baru.';
COMMENT ON COLUMN public.player_progress.earned IS 'Total kumulatif bintang yang pernah diperoleh pemain sepanjang masa.';
COMMENT ON COLUMN public.player_progress.selected_ship IS 'Pesawat aktif yang sedang dipakai terbang (misal: astra, orion, nova).';
COMMENT ON COLUMN public.player_progress.owned_ships IS 'Daftar armada pesawat yang telah dimiliki pemain dalam format array JSON.';
COMMENT ON COLUMN public.player_progress.progress_data IS 'Data rekam jejak kuis, tebakan fenomena, mitos/fakta, kartu jurnal, dan misi.';
COMMENT ON COLUMN public.player_progress.game_state IS 'Posisi koordinat 3D, rotasi, penemuan terakhir, dan status pesawat di ruang angkasa.';
COMMENT ON COLUMN public.player_progress.settings_data IS 'Pengaturan preferensi pemain (audio, sensitivitas, tombol kontrol, kualitas grafis).';

-- ----------------------------------------------------------------------------
-- 2. TRIGGER PEMBARUAN WAKTU OTOMATIS (updated_at)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_player_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_player_progress_updated_at ON public.player_progress;
CREATE TRIGGER trg_player_progress_updated_at
  BEFORE UPDATE ON public.player_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_player_progress_updated_at();

-- ----------------------------------------------------------------------------
-- 3. TRIGGER VALIDASI INTEGRITAS DATA & ANTI-TAMPERING (public.player_progress)
-- ----------------------------------------------------------------------------
-- Menahan manipulasi poin, eksploitasi armada pesawat, dan serangan payload flooding
-- langsung di tingkat engine database PostgreSQL (kebal bypass PostgREST / REST API)
CREATE OR REPLACE FUNCTION public.validate_player_progress_tamper()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Larang perubahan user_id (mencegah pemalsuan identitas/pencurian akun)
  IF TG_OP = 'UPDATE' AND NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'ID pemain (user_id) bersifat tetap dan tidak dapat diubah.';
  END IF;

  -- 2. Validasi batas nilai poin dan total bintang yang masuk akal
  IF NEW.points < 0 OR NEW.earned < 0 THEN
    RAISE EXCEPTION 'Jumlah poin atau bintang perolehan tidak boleh bernilai negatif.';
  END IF;

  IF NEW.earned > 50000 THEN
    RAISE EXCEPTION 'Total perolehan bintang melebihi batas wajar sistem permainan (50.000).';
  END IF;

  IF NEW.points > 50000 THEN
    RAISE EXCEPTION 'Saldo bintang aktif melebihi batas wajar sistem permainan (50.000).';
  END IF;

  IF NEW.points > NEW.earned THEN
    RAISE EXCEPTION 'Saldo bintang aktif (%) tidak boleh melebihi total bintang perolehan (%).', NEW.points, NEW.earned;
  END IF;

  -- 3. Validasi pesawat yang dipilih
  IF NEW.selected_ship NOT IN ('astra', 'orion', 'nova') THEN
    RAISE EXCEPTION 'Pesawat "%" tidak terdaftar dalam armada resmi AstroSphere.', NEW.selected_ship;
  END IF;

  IF jsonb_typeof(NEW.owned_ships) <> 'array' THEN
    RAISE EXCEPTION 'owned_ships harus berupa array JSON.';
  END IF;

  IF NOT (NEW.owned_ships ? NEW.selected_ship) THEN
    RAISE EXCEPTION 'Pesawat "%" belum dimiliki oleh pemain dan tidak dapat dipilih.', NEW.selected_ship;
  END IF;

  -- 4. Validasi batas ukuran muatan data JSONB (Anti-DoS / Payload Flooding)
  IF pg_column_size(NEW.progress_data) > 65536 THEN
    RAISE EXCEPTION 'Ukuran data progres (progress_data) melebihi batas aman 64 KB.';
  END IF;

  IF pg_column_size(NEW.game_state) > 16384 THEN
    RAISE EXCEPTION 'Ukuran data posisi 3D (game_state) melebihi batas aman 16 KB.';
  END IF;

  IF pg_column_size(NEW.settings_data) > 16384 THEN
    RAISE EXCEPTION 'Ukuran preferensi pemain (settings_data) melebihi batas aman 16 KB.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_player_progress_tamper ON public.player_progress;
CREATE TRIGGER trg_player_progress_tamper
  BEFORE INSERT OR UPDATE ON public.player_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_player_progress_tamper();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) KETAT
-- ----------------------------------------------------------------------------
ALTER TABLE public.player_progress ENABLE ROW LEVEL SECURITY;

-- Pengguna terautentikasi HANYA bisa membaca baris miliknya sendiri
DROP POLICY IF EXISTS "player_select_own" ON public.player_progress;
CREATE POLICY "player_select_own" ON public.player_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Pengguna terautentikasi HANYA bisa menyisipkan baris untuk dirinya sendiri
DROP POLICY IF EXISTS "player_insert_own" ON public.player_progress;
CREATE POLICY "player_insert_own" ON public.player_progress
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Pengguna terautentikasi HANYA bisa memperbarui baris miliknya sendiri
DROP POLICY IF EXISTS "player_update_own" ON public.player_progress;
CREATE POLICY "player_update_own" ON public.player_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Larang penghapusan baris progres langsung dari REST API klien
DROP POLICY IF EXISTS "player_delete_own" ON public.player_progress;

-- Batasi hak akses hak istimewa: anon dilarang akses langsung; authenticated dilarang DELETE
REVOKE ALL ON public.player_progress FROM anon, PUBLIC;
REVOKE DELETE ON public.player_progress FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.player_progress TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. FUNGSI AMAN: PENGECEKAN KETERSEDIAAN USERNAME
-- ----------------------------------------------------------------------------
-- Fungsi ini berjalan dengan hak SECURITY DEFINER dengan search_path terkunci ke public,
-- mengembalikan BOOLEAN agar formulir pendaftaran pemain dapat memvalidasi nama pengguna
-- tanpa mengekspos daftar pemain atau membocorkan data pribadi pemain lain.
CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  clean_username TEXT;
BEGIN
  -- Bersihkan spasi dan ubah ke huruf kecil
  clean_username := LOWER(TRIM(COALESCE(p_username, '')));

  -- Validasi pola karakter: huruf kecil, angka, atau garis bawah, panjang 3-20
  IF clean_username !~ '^[a-z0-9_]{3,20}$' THEN
    RETURN FALSE;
  END IF;

  -- Periksa apakah username sudah terdaftar
  RETURN NOT EXISTS (
    SELECT 1 FROM public.player_progress
    WHERE LOWER(username) = clean_username
  );
END;
$$;

-- Izin eksekusi fungsi publik untuk pengunjung anonim dan pemain terdaftar
REVOKE ALL ON FUNCTION public.is_username_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. FUNGSI RPC: HAPUS AKUN SENDIRI SECARA PERMANEN (Zero-Residual User Deletion)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: pengguna belum masuk.';
  END IF;

  -- Tolak jika akun adalah administrator whitelist
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'Forbidden: akun administrator tidak dapat dihapus lewat jalur pemain.';
  END IF;

  DELETE FROM public.player_progress WHERE user_id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. REFRESH SCHEMA CACHE POSTGREST
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
