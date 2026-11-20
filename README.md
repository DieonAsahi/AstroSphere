# AstroSphere — Frontend (Nuxt 4 + Three.js)

Game edukasi tata surya 3D berbasis browser. Tampilan dan mesin 3D-nya dikembangkan dari **Jelajah Antariksa**
(nebula, bintang, kendali terbang, HUD), lalu diperluas mengikuti **PRD AstroSphere v2.0**.
Planet, Bulan, dan ketiga pesawat memakai **model 3D GLB** dari Sketchfab (lihat [Model 3D](#model-3d)).

## Menjalankan

```bash
npm install
npm run dev          # http://localhost:3000
npm run generate     # build statis (SPA) di .output/public — bisa di-hosting di Vercel/Netlify/GitHub Pages
npm run models       # (opsional) olah ulang model 3D mentah → public/models
```

Butuh browser dengan WebGL2. Bila WebGL tidak tersedia, layar awal menampilkan pesan *Pratinjau UI · WebGL tidak tersedia* (PRD §4.5).

## Fitur

| Mode | Isi |
|---|---|
| **Pembuka** | Saat web dibuka: kamera mengitari **lubang hitam** di luar tata surya (± 17.000 satuan dari Matahari, di luar batas navigasi), lalu terbang melengkung ke pesawat. Bisa dilewati (klik/tombol apa pun); dengan *kurangi gerakan* langsung dipotong |
| **Beranda** | Ruang 3D tetap terlihat, judul di kiri, *Mulai sebagai Tamu* / *Lanjutkan Petualangan*, pilih pesawat yang dimiliki |
| **Jelajah** | Terbang bebas; HUD target navigasi, kompas arah/elevasi, kecepatan + dorongan, planet terdekat + koordinat X/Y/Z, penanda planet, panah target, batas navigasi lembut (peringatan 80% R, rem progresif), tombol **Berhenti** |
| **Peta** | Tampak atas tata surya; klik planet untuk menjadikannya target |
| **Planet** | Pesawat disembunyikan; kamera mengikuti planet yang **berevolusi** (orbit Kepler) dan **berotasi** pada sumbunya; ringkasan orbit, jejak orbit, garis sumbu, kontrol waktu 1x/10x/100x |
| **Sejarah** | Lini masa per benda (8 planet + Bulan), filter era, POI permukaan yang menempel di planet (ikut rotasi) dan jatuh di lokasi yang benar pada peta tekstur, lintasan untuk flyby/orbit, status *di sisi jauh* |
| **Fenomena** | Lab gerhana Matahari & Bulan dengan Bumi & Bulan bertekstur: peneduhan permukaan dihitung per piksel dari tumpang-tindih cakram sudut (PRD §8.3), volume umbra/penumbra, POV Ikhtisar/Depan/Samping/Atas/Bebas/Pengamat Bumi, timeline play/scrub |
| **Kuis** | 3 soal × 50 poin per planet, pembahasan, hadiah = maks(0, skor baru − skor terbaik), tanpa penalti |
| **Hanggar** | Astra Scout (gratis), Orion Glider (300 poin), Nova Voyager (700 poin) — model 3D GLB dengan api/pijar mesin yang mengikuti gas |
| **Profil** | Riwayat kuis + catatan transaksi poin, inventaris pesawat, FAQ + kredit model 3D, pengaturan kontrol |

Kontrol: `W/S` dorong, mouse atau `A D ↑ ↓` kemudi, `Q/E` guling, `Space/C` naik/turun, `Shift` boost, `X` berhenti,
`T` target, tahan `G` arahkan, tahan klik kanan / `L` pandangan bebas, `V` kamera, `M` peta, `J` jurnal, `O` orbit, `H` HUD, `Esc` jeda.
Layar sentuh: joystick kiri, tuas dorongan kanan, tombol aksi.

## Model 3D

Model mentah disimpan di `3D Planet/` dan `3D Pesawat/` (±250 MB, tidak ikut git). `npm run models`
(`scripts/optimize-models.mjs`) mengolahnya menjadi `public/models/**.glb` (± 23 MB total):

- **Planet**: material *spec-gloss* lama dikonversi ke metal-rough; transform dipanggang; inti diproyeksikan ke bola satuan dan
  diorientasikan dari UV teksturnya — kutub utara → +Y, bujur 0° → +X, timur → −Z — sehingga sumbu rotasi, kemiringan, dan POI sejarah
  (lintang/bujur) cocok dengan peta permukaan. Cincin disejajarkan ke ekuator; partikel cincin Uranus & Neptunus digabung dan dijarangkan;
  satelit kecil bawaan model Saturnus/Uranus dibuang. Di game, planet tetap diterangi shader Matahari sendiri (sisi malam, bayangan cincin,
  pendar atmosfer), bukan material bawaan model.
- **Pesawat**: hidung → −Z, ukuran dinormalkan, mesh padat disederhanakan; titik mesin, semburan api, dan cakram pijar diberi peran
  agar bisa dianimasikan sesuai gas.
- **Lubang hitam** (dekorasi pembuka): piringan akresi disejajarkan ke bidang XZ dan dinormalkan; material emisifnya dipertahankan.
  Di game ia dirender pada lapisan latar bersama langit & bintang (kamera ber-near jauh agar depth tetap presisi pada jarak ± 17.000),
  lalu tata surya digambar di atasnya.
- Tekstur WebP ≤ 2048 px (dekorasi ≤ 1024 px), kompresi geometri `EXT_meshopt_compression` (didekode di browser oleh `MeshoptDecoder` Three.js).
- Bila sebuah model gagal dimuat, game memakai planet/pesawat prosedural lama sebagai cadangan.

Untuk mengganti model: taruh GLB baru di folder sumber dengan nama yang sama, lalu jalankan `npm run models`
(atau sebagian saja, mis. `npm run models -- mars nova`). Pemetaan nama file ada di bagian atas skrip.

| Di game | Model | Pembuat | Lisensi |
|---|---|---|---|
| Astra Scout | [Space Shuttle Discovery](https://sketchfab.com/3d-models/space-shuttle-discovery-240467f6626c4686a48eb71e0a7cf083) | Kevin Love SketchFab | CC BY 4.0 |
| Orion Glider | [Stealthy Space Tato](https://sketchfab.com/3d-models/stealthy-space-tato-1908274f339f412a85afe1b8f1fcc413) | jah3d | CC BY 4.0 |
| Nova Voyager | [SA-23 Starfury](https://sketchfab.com/3d-models/sa-23-starfury-8d8d8c27abc24165a390940358aea60d) | Hangar.b.productions | CC BY 4.0 |
| Merkurius | [Mercury](https://sketchfab.com/3d-models/mercury-0a7a8958d49944f1aef057951daa8fd3) | Anthony Yanez | CC BY 4.0 |
| Venus | [Venus](https://sketchfab.com/3d-models/venus-b306aaadbf2b4fcea1afa2db5ed75b4f) | kongle | CC BY-SA 4.0 |
| Bumi | [Earth](https://sketchfab.com/3d-models/earth-41fc80d85dfd480281f21b74b2de2faa) | Akshat | CC BY 4.0 |
| Bulan | [Moon](https://sketchfab.com/3d-models/moon-e6d36bb905ed42049a234e7be571d8a3) | Nestaeric | CC BY 4.0 |
| Mars | [Mars](https://sketchfab.com/3d-models/mars-2b46962637ee4311af8f0d1d0709fbb2) | Mieke Roth | CC BY 4.0 |
| Jupiter | [jupiter](https://sketchfab.com/3d-models/jupiter-c5275eb96af245e4a8453837ac728a62) | Mieke Roth | CC BY 4.0 |
| Saturnus | [Saturn (planet)](https://sketchfab.com/3d-models/saturn-planet-9ab1eb3bb97f4e4a9305c0aae2d280a6) | SebastianSosnowski | CC BY 4.0 |
| Uranus | [Uranus](https://sketchfab.com/3d-models/uranus-0009a69dbace44608c0bd09af9ba20db) | NestaEric | CC BY 4.0 |
| Neptunus | [Neptune](https://sketchfab.com/3d-models/neptune-2a6f9ccc5c724a709912774caa197b77) | Nestaeric | CC BY 4.0 |
| Adegan pembuka | [Black Hole](https://sketchfab.com/3d-models/black-hole-e410da98b1e5445eae2acafaaa53587d) | NestaEric | CC BY 4.0 |

Semua model di atas **diubah** (dikonversi, diorientasikan ulang, disederhanakan, tekstur dikompres). Hasil olahan model Venus
tetap berlisensi **CC BY-SA 4.0**. Kredit yang sama tampil di game: *Profil → FAQ → Kredit model 3D*.

## Struktur

```
app/
  pages/index.vue          cangkang game (satu kanvas WebGL, UI berganti per fase/mode)
  components/              Vue: LoaderScreen, MenuScreen, GameHeader, hud/*, panels/*, ui/*
  composables/useGame.js   state bersama UI ↔ mesin, simpan lokal, ekonomi poin
  game/
    engine.js              mesin: renderer, kamera, fisika terbang, mode & snapshot, HUD, input, loop
    models.js              pemuat GLB (meshopt + WebP) dengan cadangan prosedural
    system.js              tata surya: orbit Kepler, rotasi sumbu, planet bertekstur, satelit, cincin, sabuk asteroid, POI
    ships.js               pesawat dari model GLB (+ versi prosedural cadangan), api & pijar mesin
    lab.js                 laboratorium gerhana
    shaders.js             shader GLSL (dari Jelajah Antariksa + shader planet/cincin bertekstur)
    audio.js, util.js
  data/                    solarSystem.js, ships.js, history.js, quiz.js, credits.js
public/models/             planets/*.glb, ships/*.glb, decor/black_hole.glb (hasil npm run models)
scripts/optimize-models.mjs
```

## Data & skala

- Radius, rotasi sideris, dan periode orbit: tabel NASA JPL (PRD §6.4). Ukuran planet **berskala nyata relatif satu sama lain**
  (1 satuan dunia ≈ 398 km). **Jarak antarplanet dipadatkan** dan Matahari tidak berskala — diberi label di UI.
- Orbit: elemen Kepler rata-rata J2000 yang dibulatkan, Matahari di fokus elips. Model edukasi, bukan ephemeris.
- Rotasi retrograd Venus & Uranus berasal dari kemiringan sumbu (177,4° dan 97,8°) dengan periode positif — tanpa pembalikan ganda.
- Waktu simulasi dimulai dari tanggal hari ini; 1 hari simulasi = 50 detik pada 1x (satu faktor untuk rotasi & revolusi).
- Satelit terkunci pasang surut: bujur 0° (sisi dekat) selalu menghadap planet induk.

## Belum tersedia / catatan jujur

- **Akun & cloud save**: form login/daftar hanya UI; belum ada backend (target PRD: Supabase). Progres tersimpan di `localStorage`.
- **Admin/CMS**: belum dibuat (konteks terpisah, butuh otorisasi server). Konten sejarah diberi label *Demo lokal*.
- **Pengamat Bulan** (POV lanjutan) belum ada. POV Pengamat Bumi memakai geometri lab yang tidak berskala.
- **Model 3D**: Matahari serta Io, Europa, Ganymede, Callisto, dan Titan masih prosedural (tidak ada modelnya). Lubang hitam hanya
  dekorasi pembuka — diberi keterangan di layar bahwa ia bukan bagian tata surya. Tekstur Bumi tidak punya lampu kota di sisi malam.
  Tekstur Bulan berupa atlas, sehingga bujur 0°-nya diperkirakan dari pusat maria (sisi dekat) — POI Bulan perkiraan.
  Cincin Uranus pada model jauh lebih lebar (2,4–3,5 R) daripada aslinya (± 1,6–2,0 R); dipertahankan sesuai model.
- PRD §12.1 menyarankan tetap memakai HTML/JS murni; frontend ini memakai **Nuxt** atas permintaan langsung pengguna.
