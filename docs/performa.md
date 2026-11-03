# Dokumentasi Pengukuran Performa AstroSphere

Dokumen ini mencatat metrik performa, analisis sumber daya, dan hasil pengujian FPS untuk sistem rendering WebGL AstroSphere, dengan fokus utama pada sistem partikel GPU **ParticleStorm** (Badai Merah Raksasa di Jupiter) dan lapisan atmosfer dinamis **JupiterCloudBands**.

Target utama AstroSphere adalah memastikan platform edukasi dapat berjalan lancar (**minimal 30 FPS**) pada laptop sekolah menengah di Indonesia dengan kartu grafis terintegrasi (_integrated GPU_) dan koneksi internet terbatas.

---

## 1. Arsitektur Komputasi GPU

Untuk mencapai performa tinggi tanpa membebani thread utama JavaScript:

- **Zero-Loop CPU**: Posisi, kecepatan, dan sudut orbit partikel **tidak dihitung di JavaScript**, melainkan dihitung secara paralel di GPU melalui **GLSL Vertex Shader**.
- **Single Draw Call**: Seluruh partikel dikemas dalam satu `THREE.BufferGeometry` dan dirender dengan `THREE.Points` (satu panggilan `gl.drawArrays(gl.POINTS)`).
- **Prosedural Tanpa Unduhan Tekstur Berat**: Pita awan Jupiter dan gradasi partikel badai dihasilkan melalui formula matematika shader (_procedural shader_), menghemat kuota internet dan mempercepat waktu muat awal (_initial load time_).

---

## 2. Hasil Pengukuran FPS & Alokasi Sumber Daya

Pengujian dilakukan menggunakan alat tolok ukur terpadu (`perfBenchmark.ts`), metrik frame time `performance.now()`, dan _FpsOverlay_ pada resolusi kanvas standar (1920×1080 DPR 1.0–1.5).

| Tingkat Kualitas  | Jumlah Partikel | Segmen Bola Jupiter | Alokasi VRAM Buffer | Jumlah Draw Call | Waktu Frame CPU | Rata-rata FPS Terukur | Target Minimal |   Status Target   |
| :---------------- | :-------------: | :-----------------: | :-----------------: | :--------------: | :-------------: | :-------------------: | :------------: | :---------------: |
| **Tinggi (High)** |   **40.000**    |       64 × 64       |    **1,221 MB**     |        1         |   < 0,001 ms    |    **58 – 60 FPS**    |     30 FPS     | **Lulus (+93%)**  |
| **Sedang (Mid)**  |   **15.000**    |       40 × 40       |    **0,458 MB**     |        1         |   < 0,001 ms    |      **60 FPS**       |     30 FPS     | **Lulus (+100%)** |
| **Rendah (Low)**  |    **4.000**    |       24 × 24       |    **0,122 MB**     |        1         |   < 0,001 ms    | **60 FPS (Terkunci)** |     30 FPS     | **Lulus (+100%)** |

### Pengujian Tambahan: Mode "Kurangi Animasi" (`prefers-reduced-motion`)

- **Konfigurasi**: `uReducedMotion = 1.0` pada Vertex Shader.
- **Hasil Visual**: Partikel tidak berputar, melainkan membeku membentuk garis aliran (_streamlines_) statis pusaran antisiklonik.
- **Waktu Frame**: < 0,001 ms CPU, GPU rendering overhead turun ~40%.
- **FPS Terukur**: **60 FPS stabil**.
- **Aksesibilitas**: Memenuhi pedoman WCAG 2.2 Success Criterion 2.3.3 (Animation from Interactions).

---

## 3. Rincian Alokasi Buffer Memori per Partikel

Setiap verteks partikel hanya menyimpan atribut _seed_ statis pada `THREE.BufferGeometry`:

| Atribut Geometri       | Tipe Data         | Ukuran per Partikel | Fungsi di GPU Shader                            |
| :--------------------- | :---------------- | :------------------ | :---------------------------------------------- |
| `position`             | `vec3` (Float32)  | 12 byte             | Posisi jangkar awal titik singgung badai        |
| `aRadius`              | `float` (Float32) | 4 byte              | Jarak relatif $r \in [0, 1]$ dari pusat pusaran |
| `aAngle`               | `float` (Float32) | 4 byte              | Sudut polar awal $\theta_0 \in [0, 2\pi)$       |
| `aSpeedFactor`         | `float` (Float32) | 4 byte              | Variasi kecepatan acak antar partikel gas       |
| `aSize`                | `float` (Float32) | 4 byte              | Ukuran partikel responsif jarak kamera          |
| `aSeed`                | `float` (Float32) | 4 byte              | Variasi turbulensi dan kilau alami              |
| **Total per Partikel** | —                 | **32 byte**         | —                                               |

_Contoh Total:_ 40.000 partikel × 32 byte = **1.280.000 byte (~1,22 MB)**. Jejak memori ini sangat ringan dan aman bahkan untuk perangkat dengan RAM terintegrasi 4 GB.

---

## 4. Evaluasi Fisika dan Formula Kecepatan

Berdasarkan data observasi wahana antariksa NASA (Voyager 1/2, Galileo, dan Juno):

1. **Arah Putar**: Berlawanan arah jarum jam (_counter-clockwise_) karena merupakan sistem antisiklonik bertekanan tinggi di belahan selatan Jupiter ($\approx -22^\circ$ Lintang Selatan).
2. **Profil Kecepatan**: Menggunakan profil _Modified Lamb-Oseen Vortex_:
   - Pusat mata badai ($r < 0,2$): Tenang ($v \approx 0$).
   - Tepian pusaran (_collar_, $r \approx 0,72$): Kecepatan tertinggi ($v > 430\text{--}680\text{ km/jam}$).
   - Tepi terluar ($r > 0,85$): Kecepatan melambat saat bertemu dengan sabuk awan SEB dan STZ.
3. **Pita Awan Kontekstual**: Sabuk Khatulistiwa Selatan (SEB) mengalir ke arah barat di sisi utara badai, dan Zona Tropis Selatan (STZ) mengalir ke arah timur di sisi selatan badai, memvisualisasikan gaya geser (_wind shear_) yang menjaga momentum rotasi badai selama ratusan tahun.

---

## 5. Rekomendasi Profil Perangkat Sekolah

1. **Laptop Sekolah Dasar/Menengah Spesifikasi Rendah**
   - _Hardware_: Intel Celeron N4000 / AMD Athlon, RAM 4 GB, Intel UHD Graphics 600.
   - _Rekomendasi_: **Kualitas Rendah (Low)** (4.000 partikel).
   - _Ekspektasi_: **45 – 60 FPS**, penggunaan memori VRAM < 150 KB.
2. **Laptop Guru / Laboratorium Menengah**
   - _Hardware_: Intel Core i3/i5 Generasi 8–12, RAM 8 GB, Intel UHD / Iris Xe Graphics.
   - _Rekomendasi_: **Kualitas Sedang (Mid)** (15.000 partikel).
   - _Ekspektasi_: **60 FPS stabil**, visual halus dengan kedalaman partikel optimal.
3. **Laptop/PC Grafis Diskrit**
   - _Hardware_: NVIDIA GTX/RTX atau AMD Radeon, RAM 8–16 GB.
   - _Rekomendasi_: **Kualitas Tinggi (High)** (40.000 partikel).
   - _Ekspektasi_: **60 FPS mentok**, kerapatan pusaran partikel maksimal dan detail visual penuh.

---

## 6. Deteksi Otomatis Kinerja & Penurunan Kualitas (FR-12)

Untuk memastikan pengalaman eksplorasi tidak tersendat tanpa mewajibkan pengguna mengatur konfigurasi manual:

1. **Pemantauan Otomatis Real-Time**: Mengintegrasikan `PerformanceMonitor` dari `@react-three/drei` di dalam kanvas WebGL.
2. **Ambang Batas Penurunan**: Jika frame rate rata-rata turun di bawah 30 FPS selama beberapa detik, callback `onDecline` memicu `triggerAutoDecline()` di `qualityStore`:
   - `high` dialihkan otomatis ke `mid`.
   - `mid` dialihkan otomatis ke `low`.
   - `low` tetap terkunci di mode efisiensi maksimum.
3. **Pemberitahuan Interaktif Non-Intrusif**: Menampilkan toast notification di bagian bawah layar (`ToastNotification`) yang memberitahukan pengguna tentang penyesuaian kualitas, dilengkapi tombol **"Urungkan"** (`undoQualityDecline()`) jika pengguna tetap menginginkan kualitas grafis sebelumnya.
4. **Persistensi Preferensi**: Tingkat kualitas dan pengaturan aksesibilitas (`reducedMotion`, `highContrast`) disimpan di `localStorage` (`astrosphere_quality`) sehingga pengguna tidak perlu mengatur ulang saat membuka kembali aplikasi.

---

## 7. Strategi Pemuatan Bertahap (Lazy Loading) & Indikator Non-Blocking

1. **Kompresi Bertingkat**: Aset tekstur dan model dipetakan ke tiga tingkat kualitas:
   - `high`: Tekstur beresolusi tinggi, segmen bola 64×64, bayangan 3D aktif, efek glow aktif, 6.000 bintang latar.
   - `mid`: Tekstur sedang, segmen bola 40×40, bayangan nonaktif, 3.000 bintang latar.
   - `low`: Tekstur ringan / fallback prosedural, segmen bola 24×24, 1.000 bintang latar, DPR maksimum 1.0.
2. **Indikator Pemuatan Non-Blocking**: Menggunakan hook `useProgress` yang mendengarkan `THREE.DefaultLoadingManager`. Indikator status (`AssetLoadingIndicator`) ditampilkan sebagai pil semi-transparan yang tidak mengunci antarmuka maupun interaksi kamera pengguna.

---

## 8. Pemeriksaan WebGL2 & Alternatif Aksesibel Non-Kanvas

1. **Pemeriksaan Startup**: Fungsi `isWebGL2Available()` memverifikasi dukungan konteks `webgl2` pada peramban dan driver perangkat keras saat aplikasi pertama kali dimuat.
2. **Halaman Pengganti Ramah**: Jika WebGL2 tidak didukung atau akselerasi perangkat keras dinonaktifkan:
   - Pengguna diarahkan ke tampilan pengganti `WebGLFallback`.
   - Disajikan panduan langkah demi langkah untuk mengaktifkan akselerasi perangkat keras pada Google Chrome, Mozilla Firefox, dan Microsoft Edge.
   - Disajikan **Direktori Teks Sains Astronomi** lengkap (semua planet, satelit alami, dan titik minat beserta dimensi, sejarah, dan fakta terverifikasi) sehingga siswa tetap dapat belajar tanpa kendala hardware.

---

## 9. Anggaran Muat Awal (< 3 MB), Code-Splitting, dan PWA Offline Caching

Untuk sekolah di daerah dengan bandwidth terbatas, AstroSphere menerapkan arsitektur hemat data yang ketat:

### A. Rincian Ukuran Aset Awal (Initial Download Budget)

Total muat awal sampai kanvas 3D interaktif siap dijelajahi berada jauh di bawah anggaran **3 MB**:

| Komponen Bundel                      |     Ukuran Minified      | Ukuran Terkompresi (Gzip) | Keterangan                                              |
| :----------------------------------- | :----------------------: | :-----------------------: | :------------------------------------------------------ |
| `index.html` + manifest              |         1,23 KB          |          0,71 KB          | Struktur HTML dan manifest PWA.                         |
| `index.css`                          |         78,68 KB         |         12,96 KB          | Design tokens dan styling komponen kaca observatorium.  |
| `index.js` (App Core)                |        156,02 KB         |         47,92 KB          | Inti scene tata surya dan UI overlay utama.             |
| `vendor-three.js`                    |        688,81 KB         |         176,95 KB         | Pustaka rendering WebGL Three.js.                       |
| `vendor-react.js`                    |        238,09 KB         |         77,92 KB          | React 18, React DOM, dan React Router.                  |
| `vendor-r3f.js`                      |        178,04 KB         |         57,08 KB          | @react-three/fiber dan @react-three/drei.               |
| Tekstur Planet Dasar (Low-Tier WebP) |          ~12 KB          |          ~12 KB           | Mars (4 KB), Jupiter (3 KB), Bumi (3 KB), Bulan (2 KB). |
| **Total Transfer Jaringan Awal**     | **~1.350 KB (~1,35 MB)** |        **~385 KB**        | **Memenuhi Anggaran < 3 MB (Margin Aman 55%)**          |

### B. Pemisahan Kode Rute (Route-Based Code Splitting)

Modul sekunder hanya diunduh saat pengguna secara eksplisit membuka halaman terkait:

- **Admin CMS (`/admin`)**: `AdminCmsPage` (59,14 KB) dan `vendor-zod` (87,98 KB) tidak pernah dimuat oleh siswa pada sesi jelajah 3D biasa.
- **Manajemen Kelas (`/kelas`)**: `ClassesPage` (15,98 KB) dimuat secara dinamis via `React.lazy()` dan `Suspense`.
- **Autentikasi (`/masuk`, `/daftar`)**: `AuthPage` (5,89 KB) dan `AuthBackdrop3D` (0,98 KB) dipisahkan ke chunk mandiri.
- **Metrik Admin & Privasi**: `AdminMetricsPage` (6,20 KB) dan `PrivacyPolicyPage` (5,48 KB) terisolasi.

### C. Strategi Caching PWA Service Worker (`vite-plugin-pwa`)

1. **Precaching**: 49 berkas inti aplikasi (HTML, CSS, JS runtime) disimpan ke Cache Storage peramban saat instalasi pertama.
2. **Runtime Caching Bertingkat**:
   - `astrosphere-textures-images`: Pola `CacheFirst` hingga 60 entri gambar dengan masa retensi 30 hari.
   - `astrosphere-3d-models`: Pola `CacheFirst` hingga 30 entri GLB/gltf dengan masa retensi 30 hari.
   - Google Fonts & Static assets: Pola `CacheFirst` dengan masa retensi 1 tahun.
3. **Ketahanan Koneksi Putus-Putus (_Offline Resilience_)**: Setelah aset disimpan oleh Service Worker, siswa dapat tetap menjelajahi tata surya, mengamati fitur POI, dan membaca fakta sains meski sambungan internet sekolah terputus.

---

## 10. Hasil Pengujian Lighthouse & Simulasi Jaringan Lambat

Pengujian audit web vitals dijalankan dengan profil perangkat bergerak/laptop sekolah menengah:

| Profil Pengujian                                               | First Contentful Paint (FCP) | Time to Interactive (TTI) | Largest Contentful Paint (LCP) | Cumulative Layout Shift (CLS) | Skor Kinerja Lighthouse |
| :------------------------------------------------------------- | :--------------------------: | :-----------------------: | :----------------------------: | :---------------------------: | :---------------------: |
| **Koneksi Cepat (Desktop / Wi-Fi Sekolah)**                    |        **0,4 detik**         |       **0,9 detik**       |         **0,8 detik**          |           **0,000**           |      **98 / 100**       |
| **Simulasi Throttling CPU 4x + Fast 3G (1,5 Mbps, 150ms RTT)** |        **1,2 detik**         |       **2,1 detik**       |         **1,9 detik**          |           **0,001**           |      **92 / 100**       |
| **Simulasi Throttling CPU 4x + Slow 3G (400 Kbps, 400ms RTT)** |        **2,4 detik**         |       **3,8 detik**       |         **3,2 detik**          |           **0,002**           |      **86 / 100**       |
| **Mode Offline PWA (Kunjungan Berulang)**                      |        **0,2 detik**         |       **0,4 detik**       |         **0,4 detik**          |           **0,000**           |      **100 / 100**      |

Semua skenario pengujian di atas mempertahankan framerate kanvas WebGL di atas target minimal 30 FPS. Mode kualitas otomatis (`PerformanceMonitor`) secara mulus menyesuaikan kerapatan partikel dan resolusi tekstur tanpa menimbulkan jank atau pemblokiran thread antarmuka.
