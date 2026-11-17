# PRD Khusus Admin Panel AstroSphere (CMS Console)

**Versi Dokumen:** 1.0 (Selaras Kode Aktual & Skema `admin_structure.sql`)  
**Target Pembaca:** Tim Desain UI/UX, Frontend Engineer, QA, dan Product Owner  
**Lokasi File:** `PRD_ADMIN_ASTROSPHERE.md` (Root Proyek — di luar folder privat `docs/`)

---

## 1. Ringkasan Eksekutif & Arsitektur Teknis Admin

**AstroSphere Admin Panel (CMS Console)** adalah aplikasi web manajemen konten internal untuk mengelola seluruh materi edukasi astronomi, sejarah peradaban & misi antariksa (POI), konfigurasi visual simulasi fenomena 3D, serta bank soal kuis formatif yang dikonsumsi langsung oleh modul eksplorasi 3D siswa AstroSphere.

### 1.1 Stack Teknologi Aktual
Berdasarkan konfigurasi proyek (`package.json`, `src/app/router.tsx`, `src/lib/supabase/client.ts`), Admin Panel dibangun dengan:
- **Build Tool & Runtime:** Vite (`^6.0.5`) + React (`^18.3.1`) + TypeScript (`~5.7.2`)
- **Routing & Code Splitting:** React Router DOM (`^7.1.1`) menggunakan `createBrowserRouter` dengan `React.lazy()` dan `<Suspense fallback={<RouteLoadingFallback />}>` per halaman
- **Styling & Ikonografi:** Tailwind CSS (`^3.4.17`) + Lucide React (`^1.70.0`)
- **Backend, Auth, Database & Storage:** Supabase (`@supabase/ssr` `createBrowserClient<Database>` + `@supabase/supabase-js`)

### 1.2 Arsitektur Peran 2-Tier (Two-Tier Role Model)
AstroSphere menerapkan model peran **2-Tier** secara ketat (tidak memiliki peran Guru/Pendidik atau Moderator terpisah):
1. **Tier 1 — Pemain / Siswa (Publik & Terautentikasi Pemain):** Mengakses kanvas 3D (`/`, `/planet/:planetSlug`, `/planet/:planetSlug/:poiSlug`), membaca konten aktif, memutar simulasi fenomena aktif, dan mengerjakan kuis.
2. **Tier 2 — Administrator / Pengelola Konten (`/admin/login` & `/admin/*`):** Memiliki akses terkelola ke CMS Console setelah lolos verifikasi **Supabase Auth + Whitelist `public.admin_users`**.
- **Tanpa Registrasi Publik Admin:** Halaman `/admin/login` hanya menyediakan form masuk (*Login*). Penambahan akun Admin baru dilakukan secara manual oleh pengelola melalui Supabase Authentication Dashboard dan tabel whitelist `public.admin_users`.

### 1.3 Prinsip Arsitektur Fail-Closed & Sumber Kebenaran Tunggal
- **Fail-Closed Verification:** Jika variabel lingkungan Supabase (`SUPABASE_URL`/`VITE_SUPABASE_URL` & `SUPABASE_ANON_KEY`/`VITE_SUPABASE_ANON_KEY`) belum dikonfigurasi, token sesi tidak valid/kedaluwarsa, RPC `is_admin()` gagal, atau akun tidak terdaftar di `public.admin_users`, sistem **menolak akses**, membersihkan storage sesi admin, memanggil `supabase.auth.signOut()`, dan mengarahkan ke `/admin/login`.
- **Langsung ke Supabase (Tanpa Fallback Data Dummy di Admin):** Seluruh halaman Admin membaca, menyaring, mengubah, mengunggah aset, mengimpor, dan mengekspor data secara langsung dari/ke PostgreSQL & Storage Supabase agar kondisi CMS selalu mencerminkan database produksi yang sesungguhnya.

### 1.4 Peta Rute Admin (`src/app/router.tsx`)
| Rute URL | Komponen Halaman | Proteksi |
| :--- | :--- | :--- |
| `/admin/login` | `AdminLoginPage` (`src/app/admin/login/page.tsx`) | Publik (auto-redirect ke `/admin` jika sesi Admin masih valid & belum idle) |
| `/admin` | `AdminDashboardLayout` + `AdminDashboardPage` (`page.tsx`) | Terproteksi Guard Admin (`verifyIsAdmin`) |
| `/admin/planets` | `AdminPlanetsPage` (`planets/page.tsx`) | Terproteksi Guard Admin |
| `/admin/history` | `AdminHistoryPage` (`history/page.tsx`) | Terproteksi Guard Admin |
| `/admin/phenomena` | `AdminPhenomenaPage` (`phenomena/page.tsx`) | Terproteksi Guard Admin |
| `/admin/quizzes` | `AdminQuizzesPage` (`quizzes/page.tsx`) | Terproteksi Guard Admin |
| `/admin/*` | `<Navigate to="/admin" replace />` | Berada di dalam `AdminDashboardLayout` (tetap melewati Guard Admin sebelum redirect) |

---

## 2. Spesifikasi Keamanan, Autentikasi & Manajemen Sesi

Seluruh logika keamanan frontend dipusatkan di `src/lib/supabase/adminAuth.ts`, `src/app/admin/login/page.tsx`, dan `src/app/admin/(dashboard)/layout.tsx`.

### 2.1 Alur Halaman Login (`/admin/login`)
1. **Pengecekan Sesi Awal (`checkExistingSession`):**
   - Saat halaman dimuat, tampilkan state loading netral (`checkingSession = true`: *"Memeriksa sesi administrator..."*).
   - Periksa query param:
     - `?error=unauthorized` → tampilkan banner error merah: *"Akses ditolak: Akun Anda tidak memiliki hak akses Administrator AstroSphere."*
     - `?reason=idle_timeout` → tampilkan banner info kuning (`Clock` icon): *"Sesi Anda telah berakhir otomatis karena tidak ada aktivitas selama 5 menit. Silakan masuk kembali untuk melanjutkan."*
   - Periksa apakah timestamp aktivitas terakhir (`localStorage` key `astrosphere_admin_last_activity_at`) telah melewati batas idle 5 menit. Jika melewati batas, bersihkan storage sesi & jalankan `signOut()`.
   - Jika `supabase.auth.getUser()` mengembalikan user dan `verifyIsAdmin(user)` bernilai `true`, catat aktivitas baru dan redirect (`replace: true`) ke `/admin`.
2. **Validasi Input Ketat Anti-SQLi (`validateAdminLoginInput`):**
   - Email di-`trim()` dan di-`toLowerCase()`.
   - Email dan kata sandi wajib terisi; panjang email maksimal `254` karakter.
   - Menolak karakter kontrol ASCII (`charCode <= 31` atau `127`).
   - Menolak payload berbahaya (`SQLI_OR_FORBIDDEN_CHARS_REGEX`: `'`, `"`, `` ` ``, `\`, `;`, `--`, `/*`, `*/`, `\b(or|and)\s+\d+\s*=\s*\d+`, `\bunion\s+select\b`).
   - Wajib cocok dengan `EMAIL_FORMAT_REGEX`.
3. **Rate-Limit Cooldown (5x Gagal → Kunci 30 Detik):**
   - State disimpan di `sessionStorage` (`astrosphere_admin_login_attempts`: `{ failedCount, lockedUntil }`).
   - Konstanta aktual: `MAX_LOGIN_ATTEMPTS = 5`, `LOGIN_COOLDOWN_MS = 30000` (30 detik).
   - Setiap kegagalan `signInWithPassword` atau kegagalan `verifyIsAdmin` (user Auth valid tapi bukan whitelist admin) atau exception menambah `failedCount`.
   - Saat `failedCount >= 5`, akses submit dikunci selama 30 detik; tombol login menjadi nonaktif dan menampilkan countdown real-time `"Tunggu {N} detik..."`.
   - Saat login Admin berhasil, state rate-limit di-reset (`resetLoginRateLimitState()`).
4. **Pesan Error Non-Enumerasi (`mapAdminAuthError`):**
   - Kegagalan koneksi/jaringan (`failed to fetch`, `network`, `timeout`) → pesan diagnostik koneksi Supabase.
   - Rate limit dari server Supabase → pesan tunggu beberapa saat.
   - Format email tidak valid → *"Format alamat email tidak valid."*
   - Seluruh kegagalan kredensial maupun user non-admin → pesan generik tunggal **`"Email atau kata sandi salah."`** agar tidak membocorkan eksistensi akun admin.
5. **Verifikasi Admin Berlapis & Terparameterisasi (`verifyIsAdmin`):**
   - Memastikan konfigurasi Supabase aktif (`getSupabaseConfigStatus().configured`).
   - Memastikan `getSession()` memiliki `access_token`, belum kedaluwarsa (`expires_at * 1000 > Date.now()`), dan `session.user.id === user.id`.
   - Memanggil RPC `supabase.rpc('is_admin')`.
   - Jika RPC belum mengembalikan `true`, melakukan query terparameterisasi `.from('admin_users').select('email').eq('user_id', user.id).maybeSingle()`, lalu fallback `.eq('email', normalizedEmail).maybeSingle()` (tanpa interpolasi string `.or(...)`).

### 2.2 Auto-Logout Idle Session 5 Menit & Sinkronisasi Antar-Tab
- **Durasi Timeout:** `ADMIN_IDLE_TIMEOUT_MS = 300.000 ms` (**5 menit**).
- **Durasi Peringatan Akhir:** `ADMIN_IDLE_WARNING_MS = 30.000 ms` (**30 detik terakhir** sebelum logout otomatis).
- **Event Aktivitas yang Dipantau:** `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`, `click` pada `window` (dengan *throttling* minimal jeda 1.000 ms agar ringan bagi performa).
- **Sinkronisasi Antar-Tab (`localStorage`):**
  - Timestamp aktivitas disimpan di `localStorage` (`astrosphere_admin_last_activity_at`).
  - Listener `window.addEventListener('storage', ...)` memantau perubahan key tersebut:
    - Jika tab lain mencatat aktivitas baru → banner peringatan idle ikut hilang di semua tab.
    - Jika tab lain menghapus key saat logout/timeout (`e.newValue === null`) → seluruh tab admin lainnya ikut melakukan `performSecureSignOut('/admin/login?reason=idle_timeout')`.
- **Proteksi Tutup/Buka Ulang Tab/Browser:** Saat `AdminDashboardLayout` atau `AdminLoginPage` pertama kali di-mount, sistem membaca `astrosphere_admin_last_activity_at`; jika selisih waktu sudah `>= 300.000 ms`, sesi langsung diputus dan diarahkan ke `/admin/login?reason=idle_timeout`.
- **Banner Peringatan 30 Detik Terakhir:** Muncul di atas area `<main>` (`role="alert"`) menampilkan sisa detik (`idleWarningSeconds`) beserta tombol **`Tetap Masuk`** yang langsung memanggil `recordAdminActivity(Date.now())` dan menutup banner.

### 2.3 Zero-Leak Route Guard pada Layout & Catch-All `/admin/*`
- Pada `AdminDashboardLayout`, state awal `loading = true`. Selama `loading === true`, komponen hanya merender layar verifikasi netral (*"AstroSphere CMS Console — Memvalidasi akses administrator..."*). Sidebar, header, data profil, maupun `<Outlet />` (halaman anak) **sama sekali tidak di-mount atau dirender** sebelum `verifyIsAdmin(user)` bernilai `true`.
- **Auth State Listener Real-Time:** `supabase.auth.onAuthStateChange` langsung memicu `performSecureSignOut('/admin/login')` jika terjadi event `SIGNED_OUT` atau `session.user` hilang, serta memvalidasi ulang admin pada `TOKEN_REFRESHED` / `USER_UPDATED`.
- **Catch-All `/admin/*`:** Rute tidak dikenal di bawah `/admin/*` diarahkan oleh `<Navigate to="/admin" replace />` di dalam nested route `AdminDashboardLayout`, sehingga tetap melewati auth guard.

---

## 3. Skema Database Admin Lengkap (`admin_structure.sql`)

Berikut adalah skema aktual PostgreSQL di `admin_structure.sql` yang disinkronkan dengan `src/types/database.ts`.

> **Catatan Penamaan Tabel Pesawat (`ships`):** Pada permintaan/dokumen awal kadang disebut sebagai `planes`, namun di `admin_structure.sql` dan `src/types/database.ts` tabel tersebut secara aktual bernama **`public.ships`**.

### 3.1 `public.admin_users` (Whitelist Administrator)
| Kolom | Tipe Data | Constraint / Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `email` | `TEXT` | `PRIMARY KEY` (serta migrasi `UNIQUE`) | Email akun Admin (lowercase) |
| `user_id` | `UUID` | `REFERENCES auth.users(id) ON DELETE SET NULL`, nullable | UUID user dari Supabase Auth |
| `password_hash` | `TEXT` | Nullable | Kolom kompatibilitas migrasi skema lama |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Waktu pendaftaran whitelist |

### 3.2 `public.planets` (Master 8 Planet Tata Surya)
| Kolom | Tipe Data | Constraint / Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `planet_id` | `TEXT` | `PRIMARY KEY` | Slug planet (`mercury`, `venus`, `earth`, `mars`, `jupiter`, `saturn`, `uranus`, `neptune`) |
| `urutan_orbit` | `INT` | `NOT NULL UNIQUE CHECK (urutan_orbit >= 1)` | Urutan posisi orbit dari Matahari |
| `nama` | `TEXT` | `NOT NULL` | Nama resmi planet dalam Bahasa Indonesia |
| `kategori_planet` | `TEXT` | `NOT NULL DEFAULT 'TERRESTRIAL' CHECK (kategori_planet IN ('TERRESTRIAL', 'GAS_GIANT', 'ICE_GIANT'))` | Klasifikasi planet |
| `diameter_km` | `NUMERIC` | `NOT NULL` | Diameter khatulistiwa (km) |
| `rotation_period_hours` | `NUMERIC` | `NOT NULL` | Periode rotasi (jam; negatif untuk retrograde) |
| `orbital_period_days` | `NUMERIC` | `NOT NULL` | Periode revolusi mengelilingi Matahari (hari) |
| `axial_tilt_deg` | `NUMERIC` | `NOT NULL DEFAULT 0` | Kemiringan sumbu rotasi (derajat) |
| `deskripsi_materi` | `TEXT` | `NOT NULL DEFAULT ''` | Penjelasan lengkap karakteristik planet |
| `ringkasan_cepat` | `TEXT` | `NOT NULL DEFAULT ''` | Teks pembuka singkat saat siswa tiba di planet |
| `sumber_referensi` | `TEXT` | `DEFAULT 'NASA Planetary Fact Sheet'`, nullable | Sumber rujukan ilmiah |
| `aset_model_url` | `TEXT` | `NOT NULL DEFAULT '/models/planets/earth.glb'` | Path/URL legacy model 3D (`.glb`/`.gltf`) |
| `tekstur_url` | `TEXT` | Nullable | Path/URL legacy tekstur permukaan planet (kini dirender Procedural 3D Shader) |
| `warna_atmosfer_hex` | `TEXT` | `NOT NULL DEFAULT '#38bdf8'` | Kode warna hex pendar atmosfer & aksen visual |
| `skala_visual` | `NUMERIC` | `NOT NULL DEFAULT 1.0` | Faktor skala 3D planet |
| `batas_zona_radius` | `NUMERIC` | `NOT NULL DEFAULT 100.0` | Radius batas zona masuk orbit planet |
| `kecepatan_jelajah_nyaman` | `NUMERIC` | `NOT NULL DEFAULT 15.0` | Kecepatan jelajah kamera/pesawat (km/s) |
| `urutan_planet` | `TEXT` | `NOT NULL DEFAULT ''` | Label urutan planet PLY-02 (misal: `"Planet ke-3 dari Matahari"`) |
| `perbandingan_bumi` | `TEXT` | `NOT NULL DEFAULT ''` | Skala perbandingan Bumi (misal: `"1.00x ukuran Bumi (Dasar Perbandingan)"`) |
| `periode_rotasi` | `TEXT` | `NOT NULL DEFAULT ''` | Format ramah periode rotasi (misal: `"23 jam 56 menit"`) |
| `subteks_rotasi` | `TEXT` | `NOT NULL DEFAULT ''` | Subteks arah rotasi (misal: `"Arah Barat ke Timur (Normal)"`) |
| `periode_orbit` | `TEXT` | `NOT NULL DEFAULT ''` | Format ramah periode orbit (misal: `"365,25 hari"`) |
| `subteks_orbit` | `TEXT` | `NOT NULL DEFAULT ''` | Subteks kecepatan orbit (misal: `"Kecepatan rata-rata 29,78 km/s"`) |
| `kemiringan_sumbu` | `TEXT` | `NOT NULL DEFAULT ''` | Kemiringan sumbu teks PLY-02 (misal: `"23,44°"`) |
| `rentang_suhu` | `TEXT` | `NOT NULL DEFAULT ''` | Rentang suhu ekstrem/rata-rata (misal: `"-88°C s/d +58°C"`) |
| `usia_planet` | `TEXT` | `NOT NULL DEFAULT ''` | Usia planet sains (misal: `"4,54 Miliar Tahun"`) |
| `subteks_usia` | `TEXT` | `NOT NULL DEFAULT ''` | Subteks stabilitas usia (misal: `"Terbentuk bersamaan dengan Tata Surya"`) |
| `judul_rotasi` | `TEXT` | `NOT NULL DEFAULT ''` | Judul dinamika rotasi PLY-02 (misal: `"Dinamika Rotasi & Pergantian Siang-Malam"`) |
| `deskripsi_rotasi` | `TEXT` | `NOT NULL DEFAULT ''` | Penjelasan dinamika rotasi & pergantian musim PLY-02 |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Status visibilitas planet di modul pemain |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Waktu pembaruan terakhir (dipakai widget Dashboard) |

### 3.3 `public.ships` (Master Pesawat Hanggar / Target Ekonomi Poin)
| Kolom | Tipe Data | Constraint / Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `ship_id` | `TEXT` | `PRIMARY KEY CHECK (ship_id IN ('astra-scout', 'orion-glider', 'nova-voyager'))` | ID pesawat reward |
| `urutan_tier` | `INT` | `NOT NULL DEFAULT 1` | Urutan tier pesawat |
| `nama` | `TEXT` | `NOT NULL` | Nama pesawat |
| `panjang_meter` | `INT` | `NOT NULL` | Dimensi panjang pesawat |
| `harga_poin` | `INT` | `NOT NULL` | Harga buka kunci pesawat (`0` Astra Scout, `300` Orion Glider, `700` Nova Voyager) |
| `kecepatan_bonus_multiplier` | `NUMERIC` | `NOT NULL DEFAULT 1.0` | Pengali kecepatan jelajah |
| `aset_model_url` | `TEXT` | `NOT NULL` | Path model 3D pesawat |
| `deskripsi` | `TEXT` | `NOT NULL` | Deskripsi pesawat |

### 3.4 `public.history_events` (Linimasa Sejarah & POI)
| Kolom | Tipe Data | Constraint / Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `event_id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID unik peristiwa |
| `planet_id` | `TEXT` | `NOT NULL REFERENCES public.planets(planet_id) ON DELETE CASCADE` | Relasi ke planet |
| `era_label` | `TEXT` | `NOT NULL DEFAULT 'Sejarah & Bentang Alam'` | 6 Zaman Baku Bumi atau topik bahasan planet lain |
| `tahun_kejadian` | `INT` | `NOT NULL` | Tahun kejadian (negatif untuk SM / prasejarah) |
| `kategori_poi` | `TEXT` | `NOT NULL DEFAULT 'Titik Observasi & Sejarah'` | Kategori pengamatan/sejarah (mendukung kategori deskriptif kaya seperti `Kawah Tumbukan & Kaldera Terbesar`, `Situs Geologi Purba`, dll.) |
| `judul` | `TEXT` | `NOT NULL` | Judul singkat kartu daftar (List Card) |
| `ringkasan_singkat` | `TEXT` | `NOT NULL DEFAULT ''` | Ringkasan 1 kalimat untuk tampilan List Card |
| `nama_wahana` | `TEXT` | Nullable | Wahana antariksa, ekspedisi, institusi, atau tokoh terkait untuk Modal Detail PLY-04 (misal: `"Mariner 10 & MESSENGER (NASA)"`, `"Sir Edmund Hillary & Tenzing Norgay"`) |
| `karakteristik_fisik` | `TEXT` | `NOT NULL DEFAULT ''` | Fakta karakteristik fisik, dimensi, ketinggian/kedalaman, atau lokasi spesifik PLY-04 (misal: `"Belahan Utara Merkurius • Diameter 1.550 km"`, `"Pegunungan Himalaya, Nepal/Tibet • Ketinggian 8.848,86 mdpl"`) |
| `deskripsi` | `TEXT` | `NOT NULL` | Penjelasan lengkap naratif untuk Modal Detail PLY-04 |
| `gambar_url` | `TEXT` | `DEFAULT ''`, nullable | URL foto/ilustrasi peristiwa |
| `koordinat_lat` | `NUMERIC` | Nullable, `DEFAULT 0`, `CHECK (koordinat_lat IS NULL OR (koordinat_lat BETWEEN -90 AND 90))` | Lintang opsional |
| `koordinat_lng` | `NUMERIC` | Nullable, `DEFAULT 0`, `CHECK (koordinat_lng IS NULL OR (koordinat_lng BETWEEN -180 AND 180))` | Bujur opsional |
| `sumber_referensi` | `TEXT` | `DEFAULT ''`, nullable | Sumber referensi ilmiah |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Timestamp pembuatan |

- **Indeks:** `idx_history_planet_year ON public.history_events (planet_id, tahun_kejadian)`

### 3.5 `public.phenomena` (Simulasi Fenomena Astronomi)
| Kolom | Tipe Data | Constraint / Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `phenomenon_id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID unik fenomena |
| `planet_id` | `TEXT` | `NOT NULL REFERENCES public.planets(planet_id) ON DELETE CASCADE` | Relasi ke planet |
| `judul` | `TEXT` | `NOT NULL` | Judul fenomena astronomi |
| `tombol_aksi_label` | `TEXT` | `NOT NULL DEFAULT 'Putar Simulasi Fenomena'` | Label tombol aksi di HUD siswa |
| `tipe_animasi` | `TEXT` | `NOT NULL CHECK (tipe_animasi IN ('SOLAR_ECLIPSE', 'LUNAR_ECLIPSE', 'MOON_PHASES', 'GALILEAN_TRANSIT', 'CUSTOM_ALIGNMENT'))` | Tipe animasi 3D (terkunci saat edit) |
| `deskripsi_edukatif` | `TEXT` | `NOT NULL` | Penjelasan fisika/astronomi fenomena |
| `konfigurasi_visual` | `JSONB` | `NOT NULL DEFAULT '{}'::jsonb` | Objek konfigurasi (`subtitle`, `secondaryObjects`, `showUmbraPenumbra`, `durationSeconds`, `cameraZoomDistance`, `educationalSteps`) |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Status aktif di HUD pemain |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Timestamp pembuatan |

### 3.6 `public.questions` (Bank Soal Kuis Formatif)
| Kolom | Tipe Data | Constraint / Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `question_id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID unik soal |
| `planet_id` | `TEXT` | `NOT NULL REFERENCES public.planets(planet_id) ON DELETE CASCADE` | Relasi ke planet |
| `soal` | `TEXT` | `NOT NULL` | Teks pertanyaan |
| `opsi` | `JSONB` | `NOT NULL` | Array berisi 4 string opsi jawaban (`[A, B, C, D]`) |
| `kunci_jawaban` | `INT` | `NOT NULL CHECK (kunci_jawaban BETWEEN 0 AND 3)` | Indeks jawaban benar (`0`=A, `1`=B, `2`=C, `3`=D) |
| `pembahasan_edukatif` | `TEXT` | `NOT NULL` | Umpan balik ilmiah suportif setelah siswa menjawab |
| `bobot_poin` | `INT` | `NOT NULL DEFAULT 50 CHECK (bobot_poin > 0)` | Hadiah poin jawaban benar (validasi UI Admin: 1–500) |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Timestamp pembuatan |

### 3.7 Fungsi Keamanan, Storage & Ringkasan RLS
1. **Fungsi `public.is_admin()` (`SECURITY DEFINER STABLE SET search_path = public`):**
   - Memastikan `auth.role() = 'authenticated' AND auth.uid() IS NOT NULL`, lalu mencocokkan `user_id = auth.uid()` atau `lower(trim(email)) = lower(trim(auth.jwt()->>'email'))` di `public.admin_users`. `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO anon, authenticated`.
2. **Fungsi `public.get_planet_max_quiz_score(p_planet_id TEXT)` (`SECURITY DEFINER STABLE SET search_path = public`):**
   - Mengembalikan `COALESCE(SUM(bobot_poin), 0)::INT` per `planet_id`.
3. **Storage Bucket `astrosphere-assets` (Publik Read, Admin Write):**
   - Bucket `public = true`; `SELECT` terbuka untuk pembacaan asset (`planets/` & `history/`); `INSERT`, `UPDATE`, dan `DELETE` pada `storage.objects` mensyaratkan `bucket_id = 'astrosphere-assets' AND public.is_admin() = true`.
4. **Ringkasan Kebijakan RLS per Tabel:**
   - `admin_users`: `REVOKE ALL FROM PUBLIC, anon; GRANT SELECT TO authenticated`. Policy `SELECT` hanya untuk pemilik `user_id`, email yang cocok saat `user_id IS NULL`, atau `is_admin() = true`. Policy `INSERT/UPDATE/DELETE` khusus `is_admin() = true`.
   - `planets`: Publik `SELECT` hanya baris `is_active = true` (Admin melihat semua). Admin `FOR ALL` (`is_admin() = true`).
   - `history_events` & `questions`: Publik `SELECT` hanya jika planet induknya berstatus `is_active = true` (Admin melihat semua). Admin `FOR ALL` (`is_admin() = true`).
   - `phenomena`: Publik `SELECT` hanya jika `phenomena.is_active = true` DAN planet induknya `is_active = true` (Admin melihat semua). Admin `FOR ALL` (`is_admin() = true`).
   - `ships`: Publik `SELECT` terbuka (`USING (true)`). Admin `FOR ALL` (`is_admin() = true`).

---

## 4. Spesifikasi Layar, Fitur, Form Field & Validasi per Halaman

### 4.1 Layout Utama: Sidebar & Top Header (`src/app/admin/(dashboard)/layout.tsx`)
- **Sidebar Navigasi (5 Menu Resmi A01–A05):**
  1. `Dashboard` → `/admin` (ikon `LayoutDashboard`)
  2. `Planet` → `/admin/planets` (ikon `Globe`)
  3. `Sejarah & POI` → `/admin/history` (ikon `Compass`)
  4. `Fenomena` → `/admin/phenomena` (ikon `Sparkles`)
  5. `Kuis` → `/admin/quizzes` (ikon `HelpCircle`)
- **Perilaku Responsif Sidebar:**
  - **Mobile (`< 768px`):** Drawer geser penuh (`w-64`), dibuka lewat tombol hamburger di header, ditutup melalui tombol `X`, klik overlay backdrop, atau tombol keyboard `Escape`.
  - **Tablet (`768px – 1023px` / `md`):** Compact sidebar (`w-20`), hanya menampilkan ikon dengan tooltip `title`, badge status titik hijau, dan avatar/logout ringkas.
  - **Desktop (`>= 1024px` / `lg`):** Full sidebar (`w-64`) dengan label teks penuh, indikator `Sistem Online` (`v3.8`), kartu profil Admin dinamis (`initials`, `adminName` dari `user_metadata.full_name`/`name` atau prefix email, serta `adminEmail`), dan tombol `LogOut`.
- **Top Header Bar:**
  - Kiri: Tombol drawer mobile + Breadcrumb dinamis (`CMS / Dashboard`, `CMS / Data Planet`, `CMS / Sejarah & POI`, `CMS / Fenomena Astronomi`, `CMS / Kuis`).
  - Kanan: Tombol toggle search mobile (`< 640px` membuka baris pencarian sekunder di bawah header), input Global Search (`"Cari konten..."`) lengkap dengan tombol clear (`X`) yang mengirim `searchQuery` via `<Outlet context={{ searchQuery }} />` ke seluruh halaman modul, tautan `"Lihat Kanvas 3D"` (`/` di tab baru), dan badge profil Admin (nama, email, avatar inisial).
- **Area Utama (`<main>`):** Menampilkan **Idle Warning Banner** di bagian paling atas saat sisa waktu idle `<= 30 detik`, lalu merender halaman anak.

### 4.2 Halaman Login (`/admin/login` — `src/app/admin/login/page.tsx`)
- **Komponen UI:** Kartu login tunggal terpusat (`max-w-md`) dengan ikon `Globe`, pill `"AstroSphere CMS Console"`, judul `"Masuk ke Panel Kontrol"`, subjudul keterangan akses khusus admin.
- **Elemen & Interaksi Form:**
  - Banner Opsional: Info Idle Timeout (kuning) dan Error Validasi/Auth/Config (merah).
  - Input **Email Administrator** (`type="email"`, placeholder `admin@astrosphere.edu`, `autoComplete="email"`).
  - Input **Kata Sandi** (`type={showPassword ? 'text' : 'password'}`, tombol ikon mata `Eye`/`EyeOff` untuk *Show/Hide Password*).
  - Tombol Submit 3 state: Normal (`"Masuk ke Konsol CMS"`), Loading (`"Memverifikasi Akses..."`), Cooldown terkunci (`"Tunggu {N} detik..."`).
  - Footer kartu: Tautan `"Kembali ke Jelajah 3D"` (`/`) dan versi `"AstroSphere v3.8"`.

### 4.3 Halaman Dashboard (`/admin` — `src/app/admin/(dashboard)/page.tsx`)
- **Header & Aksi Cepat:**
  - Tombol **`Aktifkan Semua Modul (Mode Demo)`**: Dalam 1 klik menjalankan update massal ke `planets` dan `phenomena` (`is_active = false` → `is_active = true`) beserta pengecekan RLS dan banner hasil (hijau jika sukses / merah jika gagal). Berubah warna hijau solid saat ada modul nonaktif (`hasInactiveModules`).
  - Tombol **`Segarkan Data`**: Memuat ulang metrik live dari ke-4 tabel Supabase secara paralel (`Promise.all`).
- **Quick Search Helper Banner:** Muncul saat Admin mengetik di Search Bar Header, menampilkan jumlah planet aktif yang cocok dan tautan cepat ke `/admin/planets`, `/admin/history`, serta `/admin/quizzes`.
- **Widget 1 — Validator Ekonomi Poin & Kesiapan Gamifikasi:**
  - Menghitung otomatis `SUM(bobot_poin)` dari `public.questions` **khusus untuk planet berstatus `is_active !== false`**.
  - Membandingkan nilai tersebut terhadap target **`TARGET_HANGAR_POINTS = 1.000 Poin`** (`300p Orion Glider + 700p Nova Voyager`; sedangkan Astra Scout gratis `0p`). *(Catatan: pada dataset seed penuh 8 planet aktif, total poin kuis tersedia mencapai 1.600 poin sehingga melebihi ambang minimal 1.000 poin).*
  - Status **Hijau (`>= 1.000`)**: *"Ekonomi Seimbang: Total {X} Poin tersedia di planet aktif, cukup untuk membuka seluruh pesawat Hanggar."*
  - Status **Kuning (`< 1.000`)**: *"Perhatian: Total poin di planet aktif hanya {X} Poin, kurang dari 1.000 Poin untuk membuka semua pesawat."* + tombol CTA **`Tambah Bobot Soal`** → `/admin/quizzes`.
  - Dilengkapi **Progress Bar** persentase (`0–100%`) terhadap `1.000 Poin`.
- **Widget Status Kelengkapan Konten Planet Aktif:**
  - Memeriksa apakah setiap planet aktif memiliki minimal 1 entri `history_events` dan 1 soal `questions`.
  - Jika ada yang kosong: Banner kuning berisi daftar chip nama planet dengan tag `0 Sejarah` dan/atau `0 Soal Kuis`, plus tombol cepat `Isi Sejarah` & `Isi Bank Kuis`. Jika semua lengkap: Banner hijau optimal.
- **Grid 2x2 Kartu Modul Utama (Terfilter Pencarian Header):**
  1. **Data Planet** (badge: `{Total} Terdaftar`, `{Aktif} Aktif`, `{Nonaktif} Nonaktif`) → `/admin/planets`
  2. **Sejarah & POI** (badge: `{N} Entri Riwayat`) → `/admin/history`
  3. **Fenomena Astronomi** (badge: `{Total} Skenario`, `{Aktif} Aktif`, `{Nonaktif} Nonaktif`) → `/admin/phenomena`
  4. **Kuis** (badge: `{N} Butir Soal`) → `/admin/quizzes`
- **Widget 2 — 5 Pembaruan Materi Terakhir:**
  - Menggabungkan data terbaru lintas 3 tabel (`planets.updated_at`, `history_events.created_at`, `questions.created_at`), diurutkan descending dan diambil 5 teratas. Setiap baris menampilkan badge modul (`Planet` biru, `Sejarah` indigo, `Kuis` amber), judul/nama, slug `planet_id`, dan timestamp lokal `id-ID`, serta dapat diklik menuju modul terkait.

### 4.4 Halaman Data Planet (`/admin/planets` — `src/app/admin/(dashboard)/planets/page.tsx`)
- **Batasan Fungsional Ketat:** **TIDAK ADA tombol Tambah Planet dan TIDAK ADA tombol Hapus Planet** (karena 8 struktur objek 3D planet terikat dengan kode kanvas 3D). Admin hanya dapat **Ubah Data** dan **Toggle `is_active`**.
- **Tabel Daftar Planet:**
  - Kolom: `NAMA PLANET` (lingkaran badge `urutan_orbit` + nama + tag `Home` khusus `earth`), `DIAMETER` (format `id-ID` + `km`), `PERIODE ROTASI` (format astronomis ramah siswa, mis. `Retrograde`), `STATUS` (toggle switch ON/OFF + label `Aktif`/`Nonaktif`), `AKSI` (tombol `Ubah Data`).
  - Pagination: 8 item per halaman, disaring oleh Global Search Header.
  - **Aturan Proteksi Toggle `is_active`:**
    1. Planet **Bumi (`earth`)** terkunci selalu aktif (switch disabled, tidak dapat dimatikan karena stasiun Home).
    2. Sistem menolak penonaktifan jika hanya tersisa 1 planet aktif (*"Minimal harus ada satu planet aktif di dalam sistem AstroSphere."*).
- **Modal Ubah Data Planet (`Form Edit Data` vs `Pratinjau Layar Siswa`):**
  - **Arsitektur Rendering Procedural 3D Shader:** Pada modul pemain (`PLY-02`), planet dirender secara real-time menggunakan **Procedural 3D Shader** (`ShaderMaterial` + 3D Simplex Noise pada 3 lapisan `THREE.Mesh` tanpa aset gambar `.jpg/.png`). Oleh karena itu, form Admin tidak lagi mewajibkan upload tekstur/model, melainkan menampilkan badge pendar warna atmosfer (`warna_atmosfer_hex`) + keterangan: *"Dirender otomatis dengan Procedural 3D Shader (Simplex Noise & Atmosfer Mie)"*.
  - **Tab Pratinjau Layar Siswa (`PLY-02`):**
    - Banner sambutan pembuka dinamis (`ringkasan_cepat`).
    - Badge indikator Procedural 3D Shader dengan preview warna atmosfer dinamis.
    - **Grid 6 Kotak Pengamatan Sains:**
      1. *Diameter Ekuator:* nilai `diameter_km` + `perbandingan_bumi`.
      2. *Periode Rotasi:* nilai `periode_rotasi` + `subteks_rotasi`.
      3. *Periode Orbit:* nilai `periode_orbit` + `subteks_orbit`.
      4. *Kemiringan Sumbu:* nilai `kemiringan_sumbu`.
      5. *Suhu Rata-rata:* nilai `rentang_suhu`.
      6. *Usia Planet:* nilai `usia_planet` + `subteks_usia`.
    - **Callout Dinamika Rotasi:** Judul dinamis (`judul_rotasi`) dan penjelasan komprehensif rotasi & musim (`deskripsi_rotasi`).
    - Deskripsi materi komprehensif (`deskripsi_materi`) dan rujukan ilmiah (`sumber_referensi`).
  - **Form Edit Fields & Validasi Eksplisit:**
    - Toggle `is_active` (terkunci aktif jika `planet_id === 'earth'`).
    - `planet_id` (disabled / terkunci).
    - `nama` (wajib tidak kosong).
    - `kategori_planet` (`TERRESTRIAL`, `GAS_GIANT`, `ICE_GIANT`).
    - `urutan_orbit` (integer `>= 1`, dicek di client agar tidak bentrok dengan planet lain + unique constraint DB).
    - `diameter_km` (`> 0`).
    - `rotation_period_hours` (`!== 0`, negatif diizinkan untuk retrograde).
    - `orbital_period_days` (`> 0`).
    - `axial_tilt_deg` (angka valid, boleh `0`).
    - `warna_atmosfer_hex` (color picker + input teks hex, default `#38bdf8`).
    - **12 Kolom Katalog Pengamatan & Sains (`PLY-02`):**
      - `urutan_planet`: Label urutan posisi orbit (misal: `"Planet ke-3 dari Matahari"`).
      - `perbandingan_bumi`: Rasio perbandingan ukuran terhadap Bumi (misal: `"1.00x ukuran Bumi (Dasar Perbandingan)"`).
      - `periode_rotasi`: Durasi rotasi ramah siswa (misal: `"23 jam 56 menit"`).
      - `subteks_rotasi`: Arah atau dinamika rotasi (misal: `"Arah Barat ke Timur (Normal)"`).
      - `periode_orbit`: Durasi revolusi ramah siswa (misal: `"365,25 hari"`).
      - `subteks_orbit`: Kecepatan orbit rata-rata (misal: `"Kecepatan rata-rata 29,78 km/s"`).
      - `kemiringan_sumbu`: Nilai derajat kemiringan (misal: `"23,44°"`).
      - `rentang_suhu`: Suhu minimum s/d maksimum permukaan (misal: `"-88°C s/d +58°C"`).
      - `usia_planet`: Estimasi usia astronomis (misal: `"4,54 Miliar Tahun"`).
      - `subteks_usia`: Subteks stabilitas usia (misal: `"Terbentuk bersamaan dengan Tata Surya"`).
      - `judul_rotasi`: Judul bagian rotasi `PLY-02` (misal: `"Dinamika Rotasi & Pergantian Siang-Malam"`).
      - `deskripsi_rotasi`: Penjelasan sains tentang pergantian hari & musim akibat rotasi.
    - `ringkasan_cepat` (teks sambutan pembuka saat pesawat tiba).
    - `deskripsi_materi` (penjelasan lengkap materi sains planet, wajib diisi).
    - `sumber_referensi` (rujukan ilmiah, misal: `"NASA Planetary Fact Sheet"`).
    - `skala_visual` (`> 0`).
    - `batas_zona_radius` (`> 0`).
    - `kecepatan_jelajah_nyaman` (`> 0`).

### 4.5 Halaman Sejarah & POI (`/admin/history` — `src/app/admin/(dashboard)/history/page.tsx`)
- **Hak Akses Penuh:** Tambah (`+ Tambah Peristiwa`), Ubah (`Ubah Data`), Hapus (`Trash2` di baris tabel maupun tombol `Hapus Peristiwa` di modal edit → memicu **Modal Konfirmasi Hapus Custom**), Export (CSV & JSON), dan Import Massal (`BulkImportModal`).
- **Filter Bar & Pencarian:**
  1. **Filter Planet:** `Semua Planet` atau 8 planet.
  2. **Filter 6 Zaman Baku Bumi (`EARTH_ERA_OPTIONS`):** Tampil saat `selectedPlanetFilter === 'ALL'` atau `'earth'` (otomatis di-reset ke `'ALL'` bila Admin memilih planet selain Bumi). Daftar 6 Zaman Baku:
     - `Zaman Awal Bumi & Purba`
     - `Zaman Dinosaurus & Kapur`
     - `Zaman Manusia Purba & Batu`
     - `Zaman Peradaban Kuno & Kenabian`
     - `Zaman Pertengahan & Nusantara`
     - `Zaman Modern (1500 – Sekarang)`
     *(Catatan untuk desainer: di `src/lib/constants/historyFilters.ts` juga didefinisikan `MODERN_CENTURY_OPTIONS` 1500–sekarang untuk Filter Tingkat 2 di sisi HUD Siswa, sedangkan pada CMS Admin digunakan dropdown **Zaman Bumi** + dropdown **Periode Tahun** di bawah ini).*
  3. **Filter Periode Tahun:** `ALL`, `< 1 M` (`ANCIENT`), `1 – 1899 M` (`CLASSICAL`), `1900 – 1959 M` (`EARLY_1900S`), serta per dekade (`1960s`, `1970s`, `1980s`, `1990s`, `2000s`, `2010s`, `2020s`).
  4. **Tombol `Reset`** + **Global Search Header** (mencocokkan `judul`, `ringkasan_singkat`, `era_label`, `nama_wahana`, `karakteristik_fisik`, `deskripsi`, `sumber_referensi`, `planet_id`).
- **Tabel Daftar Peristiwa (8 item/halaman):**
  - Kolom: `TAHUN` (`formatYearDisplay`: misal `66 Juta SM`, `2.560 SM`, `1969 M` + pill `era_label`), `NAMA PERISTIWA` (thumbnail 48×48px dengan fallback ikon `ImageIcon` bila URL kosong/rusak + `judul` + `ringkasan_singkat` 1 baris), `PLANET` (badge titik warna), `AKSI` (`Ubah Data` & `Hapus`).
- **Modal Tambah/Ubah & Pratinjau Layar Siswa (Alur 2-Tahap `PLY-03 List Card → PLY-04 Modal Detail`):**
  - **Segmented Tab:** `Form Edit Data` vs `Pratinjau Layar Siswa`.
  - **Step 1 Pratinjau (`PLY-03 List Card View`):** Menampilkan simulasi kartu HUD gelap berisi thumbnail, badge tahun & era, `judul`, `ringkasan_singkat` (maks 2 baris), dan tombol **`Detail →`**.
  - **Step 2 Pratinjau (`PLY-04 Modal Detail View`):** Terbuka saat tombol `Detail →` diklik; menampilkan tombol **`← Kembali ke List Card`**, gambar header full-width (`h-44`), badge tahun & era, `judul`, serta **4 Baris Metadata Terstruktur**:
    1. *Kategori POI:* `kategori_poi` (misal: `"Kawah Tumbukan & Kaldera Terbesar"` / `"Titik Observasi & Sejarah"`).
    2. *Status / Era:* `era_label` (misal: `"Zaman Dinosaurus & Kapur"` / `"Sejarah Geologi"`).
    3. *Wahana / Tokoh Terkait:* `nama_wahana` (misal: `"Mariner 10 & MESSENGER (NASA)"` / `"Sir Edmund Hillary & Tenzing Norgay"`).
    4. *Karakteristik Fisik / Lokasi:* `karakteristik_fisik` (misal: `"Belahan Utara Merkurius • Diameter 1.550 km"` / `"Pegunungan Himalaya • Ketinggian 8.848,86 mdpl"`).
    - Paragraf lengkap `deskripsi` naratif (`whitespace-pre-line`).
    - Catatan rujukan ilmiah `sumber_referensi`.
- **Form Fields & Validasi:**
  - `planet_id` (select 8 planet; saat berganti ke `earth`, `era_label` otomatis diselaraskan ke Zaman Baku jika nilai sebelumnya bukan Zaman Baku).
  - `kategori_poi`: Input teks dengan datalist suggestions (mendukung kategori deskriptif kaya maupun kode standar `OBSERVATION`, `SURFACE_LANDING`, `ORBITAL_FLYBY`).
  - `era_label`: Jika `planet_id === 'earth'` tampil sebagai `<select>` **6 Zaman Baku Bumi**; jika planet selain Bumi tampil sebagai `<input type="text">` (default saat tambah: `'Sejarah Geologi'`).
  - `tahun_kejadian` (`yearInput`): wajib bilangan bulat valid (negatif untuk SM) + live preview `formatYearDisplay`.
  - `judul`: **Wajib**.
  - `ringkasan_singkat`: **Wajib** (1 kalimat untuk tampilan List Card `PLY-03`).
  - `nama_wahana`: Opsional (Wahana, tokoh, atau ekspedisi terkait untuk baris ke-3 metadata `PLY-04`).
  - `karakteristik_fisik`: Opsional (Fakta lokasi, dimensi, ketinggian/kedalaman untuk baris ke-4 metadata `PLY-04`).
  - `gambar_url`: Opsional, input URL atau tombol `Upload Foto` ke bucket `astrosphere-assets/history/` (`.jpg`, `.jpeg`, `.png`, `.webp`, maks **5 MB**) + live thumbnail & tombol hapus gambar.
  - `deskripsi`: **Wajib** (penjelasan lengkap untuk Modal Detail `PLY-04`).
  - `sumber_referensi`: Opsional.
  - *(Catatan internal payload: `koordinat_lat` dan `koordinat_lng` tidak ditampilkan sebagai field form Admin agar fokus pada arsitektur `List → Detail`; nilai yang dikirim ke DB dijaga valid dalam rentang `-90..90` & `-180..180` atau default `0`).*
- **Export & Import Massal (`BulkImportModal`):**
  - Export CSV (UTF-8 BOM, RFC-4180) & JSON mengikuti hasil filter aktif (mencakup kolom `karakteristik_fisik`).
  - Import Massal mendukung `.csv` (delimiter `,` atau `;`) dan `.json` dengan template siap unduh; kolom: `planet_id, era_label, tahun_kejadian, kategori_poi, judul, ringkasan_singkat, nama_wahana, karakteristik_fisik, deskripsi, gambar_url, sumber_referensi, [event_id opsional]`. Mendukung alias nama planet Indonesia/Inggris; jika `event_id` UUID valid terisi → `upsert`, jika kosong → `insert`.

### 4.6 Halaman Fenomena Astronomi (`/admin/phenomena` — `src/app/admin/(dashboard)/phenomena/page.tsx`)
- **Batasan Fungsional Ketat:** **TIDAK ADA tombol Tambah Fenomena dan TIDAK ADA tombol Hapus Fenomena**. Admin hanya dapat **Ubah Data** dan **Toggle `is_active`**.
- **Filter Bar & Tabel (6 item/halaman):**
  - Filter Bar: Pencarian lokal (`"Cari nama fenomena..."`) + Dropdown Planet (`Semua Planet` / 8 planet) + counter badge terfilter. Mendukung kombinasi dengan Global Search Header.
  - Kolom Tabel: `Nama Fenomena` (`judul` + ringkasan 1 baris `deskripsi_edukatif`), `Planet`, `Tipe Animasi` (`shortCode`: `ECLIPSE`, `PHASES`, `TRANSIT`, `ALIGNMENT` + `subtitle` dari `konfigurasi_visual`), `Status` (switch `is_active`), `Aksi` (`Ubah Data`).
- **Modal Ubah Simulasi Fenomena:**
  - Toggle visibilitas `is_active`.
  - **Field Terkunci (`disabled` + ikon gembok `Lock`):** `planet_id` dan `tipe_animasi` tidak bisa diubah karena terikat pada logika shader/animasi 3D di masing-masing planet.
  - `judul` (**wajib**).
  - `tombol_aksi_label` (default `'Putar Simulasi Fenomena'`).
  - `subtitle` (disimpan ke `konfigurasi_visual.subtitle`).
  - `deskripsi_edukatif` (**wajib**).
  - **Panel Parameter Visualisasi 3D (`konfigurasi_visual` JSONB):**
    - Multi-toggle **Objek Benda Langit Sekunder** (7 chip tombol): `SUN`, `MOON`, `IO`, `EUROPA`, `GANYMEDE`, `CALLISTO`, `RINGS`.
    - Slider **Durasi Simulasi** (`5` – `60` detik, step `1`).
    - Slider **Jarak Kamera 3D** (`15` – `80` unit, step `1`).
    - Checkbox **Tampilkan Kerucut Geometri Bayangan (`showUmbraPenumbra`)**.
  - **Urutan Langkah Edukatif (`educationalSteps`):** Daftar bernomor yang bisa dihapus per baris + input tambah langkah baru via tombol `Tambah` atau tombol keyboard `Enter`.

### 4.7 Halaman Kuis (`/admin/quizzes` — `src/app/admin/(dashboard)/quizzes/page.tsx`)
- **Hak Akses Penuh:** Tambah (`+ Tambah Soal`), Ubah (`Ubah Soal`), Hapus (`Trash2` → Modal Konfirmasi Hapus Custom), Export (CSV & JSON), dan Import Massal (`BulkImportModal`).
- **Ringkasan Distribusi Soal & Total Poin per Planet:**
  - Grid 8 kartu ringkas interaktif (`Merkurius` s/d `Neptunus`) menampilkan jumlah soal dan total poin (`{N} soal` • `{P}p`). Kartu disorot kuning (`amber`) jika masih `0 soal`, dan dapat diklik langsung untuk toggle filter planet.
- **Filter Bar & Tabel (8 item/halaman):**
  - Filter Planet dropdown (`Semua Planet` / 8 planet) + Quick Search lokal (`"Cari materi soal..."`) + Global Search Header.
  - **Catatan Keselarasan Skema:** Baik tabel `public.questions` di `admin_structure.sql` maupun halaman `/admin/quizzes` saat ini **tidak memiliki kolom atau filter Tingkat Kesulitan**. Seluruh penyaringan soal dilakukan berdasarkan **Planet** dan **Kata Kunci Teks** (mencocokkan pertanyaan, opsi A–D, dan pembahasan).
  - Kolom Tabel: `Pertanyaan` (teks soal + badge `4 Opsi Jawaban` + pratinjau teks kunci benar), `Planet`, `Bobot Poin` (badge amber `{N} Poin`), `Aksi` (`Ubah Soal` & `Hapus`).
  - Di bawah tabel terdapat kartu informasi statis **`Format Pedagogis Suportif AstroSphere`**.
- **Modal Tambah/Ubah Soal (`Form Edit Soal` vs `Pratinjau Layar Siswa`):**
  - **Tab Pratinjau Layar Siswa:** Simulasi interaktif UI kuis gelap (`slate-950`) lengkap dengan badge `+Poin`, indikator kunci resmi, box soal, 4 tombol opsi `A–D` yang dapat diklik untuk menguji state jawaban Benar (hijau) / Salah (merah & sorot kunci hijau), tombol `Reset Simulasi`, dan kotak `Pembahasan Edukatif`.
  - **Form Fields & Validasi:**
    - `planet_id` (select 8 planet).
    - `bobot_poin` (bilangan bulat **`1` s/d `500`**, tanpa kelipatan kaku).
    - `soal` (**wajib**).
    - `opsi` (**4 input opsi `A`, `B`, `C`, `D` wajib terisi** dan **dilarang kembar identik secara case-insensitive**) + radio `kunci_jawaban` (`0–3`).
    - `pembahasan_edukatif` (**wajib**).
- **Export & Import Massal (`BulkImportModal`):**
  - Header CSV: `question_id, planet_id, soal, opsi_a, opsi_b, opsi_c, opsi_d, kunci_jawaban, bobot_poin, pembahasan_edukatif` (JSON memakai array `opsi`).
  - `kunci_jawaban` saat import mendukung angka `0–3` maupun huruf `A–D`. Validasi ikut menolak opsi kosong, opsi kembar identik, poin di luar `1–500`, atau `question_id` non-UUID.

---

## 5. Panduan & Batasan Desain UI/UX untuk Desainer

### 5.1 Sistem Tema & Kontras Visual
- **Area Kerja Admin (Light Mode Kontras Tinggi):**
  - Latar kanvas utama: `#F8FAFC` (`bg-slate-50`); kartu, sidebar, header, dan modal: `#FFFFFF` (`bg-white`); garis tepi: `#E2E8F0` (`border-slate-200`).
  - Tipografi utama: `#0F172A` (`text-slate-900`) untuk judul & data primer, `#64748B` (`text-slate-500`) untuk metadata, `#2563EB` (`blue-600`) untuk aksi primer & state menu aktif.
  - Semantik warna status: **Emerald** (aktif, ekonomi seimbang, sukses, valid), **Amber** (peringatan idle, kelengkapan kurang, poin kurang dari 1.000, error baris CSV dilewati), **Red** (error RLS/jaringan, konfirmasi hapus, validasi form gagal).
- **Area Pratinjau Layar Siswa (Embedded Dark HUD Preview):**
  - Khusus di dalam tab *"Pratinjau Layar Siswa"* pada modal Planet, Sejarah & POI, dan Kuis, pertahankan kanvas gelap (`bg-slate-950` / `bg-slate-900`, border `slate-800`, aksen `cyan`/`indigo`) agar Admin melihat kontras visual yang akurat sesuai kanvas 3D siswa.

### 5.2 Batasan Bisnis yang Wajib Dipatuhi di Desain Mockup
1. **Jangan mendesain tombol `+ Tambah` maupun `Hapus`** pada halaman **Data Planet (`/admin/planets`)** dan **Fenomena Astronomi (`/admin/phenomena`)**.
2. **Planet Bumi (`earth`)** wajib selalu terlihat memiliki status `Aktif` yang terkunci (switch disabled + tag `Home`).
3. Pada modal edit **Fenomena**, field `Planet Terkait` dan `Tipe Animasi Simulasi` wajib memiliki tampilan terkunci (*read-only* dengan ikon gembok).
4. Pada halaman **Login (`/admin/login`)**, **jangan menambahkan tautan Daftar/Register atau Lupa Password publik**.
5. Pada halaman **Kuis (`/admin/quizzes`)**, jangan menambahkan filter *Tingkat Kesulitan* sebelum kolom terkait tersedia di skema database `public.questions`.

### 5.3 Checklist 11 Status & State Wajib untuk Desain UI/UX
Tim desain UI/UX wajib menyediakan komponen/frame untuk seluruh state berikut:
1. **Loading Guard Netral (Zero-Leak):** Layar penuh terpusat selama pengecekan sesi auth di `/admin/login` dan `/admin/*` — tanpa menampilkan kerangka sidebar/header admin agar struktur menu internal tidak bocor.
2. **Skeleton / Loading State Konten:** Placeholder animasi *pulse* pada badge kartu Dashboard serta spinner pemuatan pada tabel Planet, Sejarah, Fenomena, dan Kuis (termasuk state loading tombol saat `saving`, `refreshing`, atau `resettingDemo`).
3. **Empty State Informatif:** Tampilan tabel saat hasil pencarian/filter kosong (disertai teks filter aktif) maupun saat 0 data terdaftar pada planet tertentu.
4. **Error State (3 Level Konteks):**
   - Level Halaman/Database (banner merah dengan tombol `Muat Ulang` saat query Supabase atau env gagal).
   - Level Modal (alert merah di dalam modal form agar tidak tertutup backdrop gelap saat validasi client atau RLS gagal).
   - Level Batch Import (`BulkImportModal`: pemisahan ringkasan **X Baris Valid** hijau vs **Y Baris Bermasalah (Dilewati)** kuning beserta daftar detail error per nomor baris).
5. **Notification / Feedback Banner:** Banner dismissible (sukses hijau / gagal merah) untuk operasi CRUD, toggle `is_active`, Reset Mode Demo, dan Export/Import.
6. **Login Cooldown & Idle Redirect Banner:** Tampilan tombol submit login terkunci dengan countdown 30 detik setelah 5x salah, serta banner kuning informasi saat tiba di `/admin/login?reason=idle_timeout`.
7. **Idle Session Warning Banner (30 Detik Terakhir):** Banner kuning persisten di atas area konten utama lengkap dengan timer detik mundur dan tombol **`Tetap Masuk`**.
8. **Modal Konfirmasi Hapus Custom:** Dialog konfirmasi modal (di `/admin/history` dan `/admin/quizzes`) lengkap dengan judul/cuplikan item yang akan dihapus dan state loading `"Menghapus..."` (tidak memakai `alert`/`confirm` native browser).
9. **Interactive Student Preview States:**
   - Planet HUD Preview (termasuk varian banner *Rotasi Retrograde Terdeteksi*).
   - History 2-Step Preview (`List Card` ↔ `Modal Detail` termasuk fallback saat gambar belum diisi atau gagal dimuat).
   - Quiz Interactive Preview (sebelum menjawab, jawaban benar hijau, jawaban salah merah + sorot jawaban benar + pembahasan suportif + tombol `Reset Simulasi`).
10. **Media Upload & Image Fallback States:** Zona upload foto/tekstur/`.glb` dengan state `Mengunggah...`, thumbnail aktif dengan tombol hapus (`X`), dan kotak fallback ikon apabila URL gambar error/broken.
11. **Responsive Layout Breakpoints:**
    - Mobile (`< 768px`): Drawer sidebar overlay + tombol search expandable di header + tabel horizontal scroll (`overflow-x-auto`).
    - Tablet (`768px – 1023px`): Sidebar kompak icon-only (`w-20`).
    - Desktop (`>= 1024px`): Sidebar penuh (`w-64`) + layout grid `max-w-7xl`.

