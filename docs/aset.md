# Panduan Manajemen dan Alur Aset AstroSphere

Dokumen ini menjelaskan alur penyiapan, optimasi, dan penerbitan aset 3D, tekstur, serta data ilmiah titik minat (Point of Interest / POI) di platform AstroSphere.

---

## 1. Spesifikasi Teknis Aset

AstroSphere dirancang untuk berjalan mulus pada laptop sekolah menengah di Indonesia dengan koneksi internet terbatas (anggaran muat awal di bawah ~3 MB).

### A. Tekstur Permukaan Benda Langit

- **Proyeksi**: Proyeksi silindris sama luas (_Equirectangular Projection_ $2:1$). Sumbu horizontal mencakup bujur $0^\circ$ hingga $360^\circ$ (atau $-180^\circ$ ke $+180^\circ$ dipusatkan di meridian utama), sumbu vertikal mencakup lintang $+90^\circ$ (Kutub Utara) hingga $-90^\circ$ (Kutub Selatan).
- **Format Sumber Mentah**: PNG atau TIFF tanpa kompresi artefak tinggi, disimpan di folder `raw-assets/textures/`.
- **Format Teroptimasi**: WebP dengan 3 tingkatan kualitas:
  - **Tinggi (`high`)**: Resolusi $4096 \times 2048$ piksel, WebP Quality 85.
  - **Sedang (`mid`)**: Resolusi $2048 \times 1024$ piksel, WebP Quality 80.
  - **Rendah (`low`)**: Resolusi $1024 \times 512$ piksel, WebP Quality 70.
- **Ukuran File Target**:
  - Kualitas Rendah: $< 15$ KB per planet.
  - Kualitas Sedang: $< 50$ KB per planet.
  - Kualitas Tinggi: $< 250$ KB per planet.

### B. Model 3D Fitur Geologi & Wahana Antariksa

- **Format**: glTF Binary (`.glb`).
- **Koordinat & Poros**:
  - Sumbu tegak: $+Y$ (_Y-up_).
  - Poros pusat rotasi (_origin_): berada di titik tengah massa dasar model $(0, 0, 0)$.
  - Skala: Satuan meter dunia nyata yang dinormalisasi.
- **Batas Poligon & Geometri**:
  - Model benda langit / penanda: $< 10.000$ segitiga (_triangles_).
  - Wahana antariksa: $< 25.000$ segitiga.
  - Teroptimasi dengan alur `prune`, `dedup`, `resample`, dan `weld` menggunakan `gltf-transform`.

### C. Topografi Medan (Heightmap)

- **Format**: Gambar grayscale 8-bit atau 16-bit PNG (putih = puncak elevasi tertinggi, hitam = datum/lembah terendah).
- **Rasio Aspek**: $1:1$ (kuadrat), ukuran disarankan $512 \times 512$ piksel untuk efisiensi komputasi _vertex displacement_ Three.js di laptop kelas menengah.

---

## 2. Cara Menambah Planet Baru

Untuk menambahkan planet atau bulan baru ke tata surya AstroSphere:

1. **Siapkan Berkas Tekstur Mentah**:
   - Letakkan berkas gambar equirectangular di folder `raw-assets/textures/{slug}_raw.png` (contoh: `raw-assets/textures/uranus_raw.png`).

2. **Jalankan Skrip Kompresi Tekstur**:

   ```bash
   npm run optimize:textures
   ```

   Skrip ini otomatis membangkitkan 3 berkas WebP di:
   - `public/assets/textures/high/{slug}.webp`
   - `public/assets/textures/mid/{slug}.webp`
   - `public/assets/textures/low/{slug}.webp`

3. **Daftarkan Data Orbit dan Fisika Ilmiah**:
   Buka `scripts/import-nasa-data.ts`, tambahkan entitas ke `NASA_PLANETARY_FACT_SHEET`:

   ```typescript
   {
     id: 'uranus',
     slug: 'uranus',
     name: 'Uranus',
     type: 'planet',
     parentId: 'sun',
     diameterKm: 50724.0,
     massKg: 8.681e25,
     rotationPeriodH: -17.24,
     axialTiltDeg: 97.77,
     semiMajorAxisAu: 19.2184,
     eccentricity: 0.0463,
     inclinationDeg: 0.773,
     orbitPeriodDays: 30685.4,
     textureUrls: {
       low: '/assets/textures/low/uranus.webp',
       mid: '/assets/textures/mid/uranus.webp',
       high: '/assets/textures/high/uranus.webp'
     },
     description: 'Raksasa es dengan sumbu rotasi yang miring hampir sejajar bidang orbit.',
     sources: [
       'https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html',
       'NASA Voyager 2 Science Team'
     ]
   }
   ```

4. **Sinkronkan JSON Lokal dan Seed Supabase**:
   ```bash
   npm run import:nasa
   npm run build:seed
   ```

---

## 3. Cara Menambah Titik Minat (POI) Baru

1. **Tentukan Koordinat Permukaan (Latitude & Longitude)**:
   - Gunakan fitur **Penentu Koordinat Visual 3D** di CMS Admin (`/admin` -> tab Titik Minat -> Tambah POI). Admin cukup mengklik permukaan bola 3D planet untuk menghitung nilai lat/lon secara presisi.
   - Atau cari koordinat resmi pada katalog USGS Astrogeology:
     - Lintang: $-90^\circ$ (Kutub Selatan) s.d. $+90^\circ$ (Kutub Utara).
     - Bujur: $0^\circ$ s.d. $360^\circ$ (arah timur).

2. **Siapkan Aset Pendukung (Opsional)**:
   - Jika POI berupa fitur topografi bergunung/kawah: letakkan heightmap di `public/assets/terrain/{slug}_heightmap.png`.
   - Jika POI berupa badai atmosfer: buat konfigurasi `particleConfig` (tipe pusaran, kecepatan aliran, radius vortex, gradasi warna).

3. **Daftarkan ke `scripts/import-nasa-data.ts`**:
   Tambahkan entitas ke array `NASA_POI_FACT_SHEET`:

   ```typescript
   {
     id: 'mars-valles-marineris',
     bodyId: 'mars',
     slug: 'valles-marineris',
     name: 'Lembah Marineris (Valles Marineris)',
     type: 'lembah',
     lat: -14.0,
     lon: 301.0,
     historyText: 'Sistem ngarai terbesar di Tata Surya...',
     dimensions: [
       { label: 'Panjang total', nilai: 4000, satuan: 'km', sumber: 'NASA MRO' },
       { label: 'Lebar maksimum', nilai: 200, satuan: 'km', sumber: 'USGS Astrogeology' },
       { label: 'Kedalaman', nilai: 7, satuan: 'km', sumber: 'ESA Mars Express' }
     ],
     sources: [
       'https://astrogeology.usgs.gov/search/map/Mars/VallesMarineris',
       'NASA Mars Exploration Program'
     ]
   }
   ```

4. **Terapkan Pembaruan**:
   ```bash
   npm run import:nasa
   npm run build:seed
   ```

---

## 4. Alur Otomasi Skrip CLI

| Perintah                    | Berkas Sumber                  | Fungsi                                                                                                                                            |
| --------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run optimize:textures` | `scripts/optimize-textures.ts` | Mengompres gambar mentah menjadi WebP 3 resolusi (`high`, `mid`, `low`).                                                                          |
| `npm run optimize:models`   | `scripts/optimize-models.ts`   | Mengoptimasi model glTF/GLB menggunakan `gltf-transform`.                                                                                         |
| `npm run import:nasa`       | `scripts/import-nasa-data.ts`  | Mengimpor data ilmiah NASA Planetary Fact Sheet ke berkas JSON lokal. **Tidak memanggil API eksternal saat aplikasi dijalankan oleh siswa/guru.** |
| `npm run build:seed`        | `scripts/build-seed.ts`        | Menghasilkan berkas SQL seed Supabase dari master JSON.                                                                                           |

---

## 5. Lisensi dan Atribusi Aset

Setiap aset yang dimasukkan ke repositori AstroSphere wajib mencantumkan metadata lisensi terbuka:

- Sumber domain publik: NASA Open Data Policy (semua citra dan data misi NASA bebas digunakan untuk edukasi).
- Lisensi Creative Commons: CC0, CC-BY 4.0, atau CC-BY-SA.
- Hak cipta institusi mitra harus dicatat pada field `sources` atau metadata aset Supabase.
