# Panduan Penerbitan dan Monitoring AstroSphere

Dokumen ini memuat panduan lengkap penerapan (_deployment_) platform AstroSphere ke **Vercel**, konfigurasi **Supabase Storage/CDN**, pengaturan layanan email **SMTP**, serta sistem pemantauan performa dan galat yang mematuhi privasi siswa dan guru.

---

## 1. Alur Penerapan ke Vercel

AstroSphere dirancang sebagai aplikasi Single Page Application (SPA) modern berbasis Vite, React, dan Three.js yang dioptimalkan untuk hosting di Vercel.

### A. Konfigurasi Proyek di Vercel Dashboard

1. Hubungkan repositori GitHub `AstroSphere` ke akun Vercel.
2. Pengaturan Build & Development:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build` (menjalankan `tsc -b && vite build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. Berkas [`vercel.json`](file:///c:/Users/athaw/try%20to%20do%20better/AstroSphere/vercel.json) di root repositori telah mengonfigurasi:
   - Pengalihan rute SPA (`cleanUrls` dan rewrites ke `/index.html`).
   - Header _immutable caching_ selama 1 tahun (`Cache-Control: public, max-age=31536000, immutable`) untuk aset statis di `/assets/*`.
   - Header keamanan industri: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, dan `Referrer-Policy: strict-origin-when-cross-origin`.

### B. Variabel Lingkungan (_Environment Variables_)

Atur variabel lingkungan berikut pada menu **Settings -> Environment Variables** di Vercel:

| Nama Variabel                   | Nilai Contoh                                                                 | Keterangan                                                                |
| ------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `VITE_DATA_SOURCE`              | `supabase` (atau `json` untuk demo)                                          | Menentukan apakah repositori membaca Supabase PostgreSQL atau JSON lokal. |
| `VITE_SUPABASE_URL`             | `https://xyzproject.supabase.co`                                             | URL endpoint instansi Supabase.                                           |
| `VITE_SUPABASE_ANON_KEY`        | `eyJhbGciOi...`                                                              | Kunci anonim publik Supabase (aman di sisi klien).                        |
| `VITE_STORAGE_CDN_URL`          | `https://xyzproject.supabase.co/storage/v1/object/public/astrosphere-assets` | CDN bucket penyimpanan tekstur dan model 3D besar.                        |
| `VITE_VERCEL_ANALYTICS_ENABLED` | `true`                                                                       | Mengaktifkan pelacakan Web Vitals dan Speed Insights.                     |
| `VITE_SENTRY_DSN`               | _(opsional)_ `https://key@o0.ingest.sentry.io/0`                             | DSN pelaporan galat tersanitasi.                                          |
| `VITE_APP_URL`                  | `https://astrosphere.vercel.app`                                             | URL domain produksi untuk tautan email auth.                              |

---

## 2. Penyajian Aset Besar via Supabase Storage / CDN

Untuk menjaga ukuran repositori Git tetap ramping dan mempercepat pemuatan aset di daerah:

1. **Buat Bucket Penyimpanan di Supabase Dashboard**:
   - Masuk ke **Storage** -> klik **New Bucket**.
   - Beri nama: `astrosphere-assets`.
   - Centang opsi **Public Bucket** agar dapat diakses oleh browser siswa tanpa autentikasi per-gambar.
2. **Struktur Folder Bucket**:
   ```text
   astrosphere-assets/
   ├── textures/
   │   ├── low/
   │   ├── mid/
   │   └── high/
   ├── models/
   └── terrain/
   ```
3. **Konfigurasi Cache CDN**:
   - Supabase Storage otomatis menyajikan berkas melalui CDN global Cloudflare.
   - Atur batas cache _Cache-Control_ minimum `3600` detik (1 jam) atau gunakan hash versi (misal: `mars_v2.webp`) untuk mengaktifkan _immutable long caching_.

---

## 3. Konfigurasi Layanan Email (SMTP) di Supabase Auth

Secara default, Supabase menyediakan kuota email bawaan (3 email per jam). Untuk lingkungan produksi sekolah, wajib mengonfigurasi layanan SMTP pihak ketiga (misalnya Resend, Brevo, SendGrid, atau server SMTP kementerian/sekolah):

### Langkah Konfigurasi:

1. Buka Supabase Dashboard -> **Project Settings** -> **Authentication** -> **SMTP Settings**.
2. Aktifkan sakelar **Enable Custom SMTP**.
3. Masukkan parameter kredensial SMTP:
   - **Sender email**: `no-reply@astrosphere.id` (atau domain sekolah terverifikasi).
   - **Sender name**: `AstroSphere Observatorium`.
   - **Host**: `smtp.resend.com` (atau penyedia pilihan).
   - **Port**: `587` (TLS) atau `465` (SSL).
   - **Username**: `resend` (atau username SMTP).
   - **Password**: _(API key SMTP terenkripsi)_.
4. Sesuaikan **Email Templates** di menu **Authentication -> Email Templates**:
   - **Confirm signup**: Berisi tautan aktivasi akun siswa/guru dengan subjek _"Verifikasi Akun AstroSphere Anda"_.
   - **Reset password**: Berisi tautan atur ulang sandi berbatas waktu (15 menit) dengan subjek _"Atur Ulang Kata Sandi Akun AstroSphere"_.
   - Tambahkan URL Pengalihan (_Redirect URL_): `https://astrosphere.vercel.app/masuk`.

---

## 4. Monitoring Performa dan Pelaporan Galat Ramah Privasi

Platform AstroSphere mengedepankan privasi anak dan kepatuhan **UU Pelindungan Data Pribadi No. 27 Tahun 2022**:

### A. Vercel Web Analytics & Speed Insights

- Mengukur metrik inti browser secara real-time: **LCP (Largest Contentful Paint)**, **FID/INP (Interaction to Next Paint)**, dan **CLS (Cumulative Layout Shift)**.
- Bekerja tanpa cookie pihak ketiga (_cookie-less_) dan tidak melacak riwayat penjelajahan siswa.
- Mengonfirmasi apakah target 30 FPS dan anggaran muat $< 3$ MB tercapai pada laptop sekolah.

### B. Pelaporan Galat Tersanitasi ([`src/lib/monitoring.ts`](file:///c:/Users/athaw/try%20to%20do%20better/AstroSphere/src/lib/monitoring.ts))

- Setiap galat yang ditangkap oleh Sentry atau monitor global secara otomatis disanitasi:
  1. Pola email disamarkan menjadi `[EMAIL_DISAMARKAN]`.
  2. Kredensial, auth token, dan kata sandi disamarkan menjadi `[TOKEN_DISAMARKAN]`.
  3. Parameter kueri URL (`?token=...`, `?email=...`) dipotong dari URL laporan.
  4. IP address pengguna dinonaktifkan / disetel _anonymize IP_.

---

## 5. Integrasi CI/CD (GitHub Actions)

Alur kerja integrasi berkelanjutan didefinisikan pada [`.github/workflows/ci.yml`](file:///c:/Users/athaw/try%20to%20do%20better/AstroSphere/.github/workflows/ci.yml). Setiap kali kode di-push atau Pull Request dibuat, GitHub Actions otomatis menjalankan:

1. **Linting**: `npm run lint` (ESLint 0 warnings).
2. **Pengecekan Format**: `npm run format:check` (Prettier).
3. **Pengujian Unit & Integrasi**: `npm test` (Vitest & Jest-Axe accessibility).
4. **Pemeriksaan Tipe & Build**: `npm run build` (`tsc -b && vite build`).
5. **Pengujian E2E**: Playwright headless browser test.
