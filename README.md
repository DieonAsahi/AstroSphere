# AstroSphere — Frontend (Nuxt 4 + Three.js)

Game belajar tata surya di browser. Terbangkan pesawat, singgahi delapan planet, putar fenomena khas tiap planet,
telusuri sejarah eksplorasi, lalu kumpulkan bintang dari kuis. Antarmukanya dibuat sederhana, sedikit teks, dan
ringan — layar awal tidak memakai WebGL sama sekali.

## Menjalankan

```bash
npm install
npm run dev          # http://localhost:3000
npm run generate     # build statis (SPA) di .output/public — bisa di-hosting di Vercel/Netlify/GitHub Pages
npm run models       # (opsional) olah ulang model 3D mentah → public/models
node scripts/render-backdrops.mjs   # (opsional) buat ulang tekstur Bumi & gambar latar statis → public/img
npm run backdrops    # (opsional) olah ulang model Matahari & tabrakan galaksi (latar Masuk/Daftar) → public/models/decor
npm run guide-images # (opsional) buat ulang 12 gambar slide panduan + latar statis Daftar dari model 3D game → public/img
```

Butuh browser dengan WebGL2 untuk bagian 3D. Bila dunia 3D gagal dimuat, layar "Cara terbang" menampilkan pesan dan tombol *Coba lagi*.

## Alur

1. **Beranda** (Bumi berputar) → *Mulai bermain* / *Lanjutkan*; tombol **Masuk** (latar Matahari 3D) dan **Daftar** (latar tabrakan galaksi 3D) ada di tengah.
   Akun cukup **nama + kata sandi** (tersimpan di perangkat ini; kata sandi disimpan sebagai hash SHA-256 bergaram).
2. **Cara terbang** — penjelasan kontrol sekaligus layar muat. Mesin 3D (Three.js, ± 800 KB) baru diunduh di sini.
3. **Terbang** — dekati planet: pesawat berhenti sendiri dan menawarkan *Lihat planet ini?* (Ya → halaman planet, Tidak → lanjut terbang).

## Fitur

| Bagian | Isi |
|---|---|
| **Terbang** | HUD minimal: kompas + **Tujuan** (klik untuk memilih dari daftar Matahari, planet, Bulan beserta jaraknya; `T` = ganti cepat; tombol *Terbang otomatis*), kecepatan, planet terdekat. Tanpa dock bawah |
| **Peristiwa antariksa** | `game/hazards.js`. **Badai Matahari** (± 2,5 menit terbang pertama, lalu tiap 5–8 menit): peringatan 30 dtk + penanda "Bayangan …" di sisi malam planet/satelit terdekat → badai 22 dtk; aman bila di bayangan, kalau tidak perisai terkuras. **Sampah antariksa** di sekitar orbit Bumi: serpihan satelit melintas & mengarah ke pesawat selama 18 dtk, hindari dengan A/D, Q/E, ↑/↓. Perisai 0 → turbo mati & gas maks 60% sampai mendekati planet/satelit. Kartu hasil berisi fakta nyata (Carrington 1859, Starlink 2022, Iridium–Kosmos 2009, manuver ISS); selamat +10 bintang. Bisa dimatikan di Pengaturan. Uji cepat (mode dev): `__astro.engine.hazard('badai')` |
| **Misi kisah nyata: Apollo 13** | Dari menu jeda. Adegan 3D sendiri (`game/mission.js`): Bumi & Bulan, lintasan "angka 8" (memutari Bulan lalu pulang), wahana Apollo sederhana, ledakan tangki oksigen + kebocoran, kamera sinematik, jam misi T+ & tanggal 1970, meter O₂/listrik/CO₂. 5 tugas (`panels/MissionPanel.vue`): pilih rencana pulang, matikan sistem tak penting, koreksi arah (tahan-lepas di zona hijau), rakit "kotak surat" CO₂ dari barang di kabin, jaga sudut masuk atmosfer 5,5–7,5°. Di balik Bulan: radio terputus + rekor 400.171 km (dipecahkan Artemis II, 2026). 1–3 bintang dari tugas yang berhasil pada percobaan pertama; tamat pertama +30 bintang. Naskah: `data/missions.js` |
| **Misi kisah nyata: Mars Climate Orbiter** | Dari menu jeda. Tiga babak (`game/missionMco.js`, `panels/McoPanel.vue`): **kisah** — 9 bulan perjalanan (pendorong kecil berkali-kali meluruskan wahana yang panel suryanya di satu sisi), tiba ± 57 km (rencana ± 226 km), dibalik & mengerem, tertutup Mars, sinyal tak kembali; **investigasi** — buka 3 petunjuk lalu pilih penyebab (satuan pound-gaya·detik vs newton·detik); **ulangi sejarah** — ubah 3 paket data ke N·s (× 4,45), pengukur prakiraan ketinggian naik ke 226 km, wahana masuk orbit. 1–3 bintang, tamat pertama +30 |
| **Planet** | Ringkasan singkat, 4 fakta (hari, tahun, ukuran, satelit), tombol **Fenomena**, Sejarah, Kuis; kontrol waktu 1×/10×/100×, garis orbit & sumbu |
| **Matahari** | Bisa didekati seperti planet. Halaman sendiri: 4 fakta, 6 topik yang jarang diketahui (cincin Matahari/halo 22°, gerhana cincin + tautan lab, korona yang lebih panas & Parker Solar Probe, bintik, badai Matahari/Starlink 2022, rotasi tidak serempak), pengingat keselamatan mata |
| **Fenomena per planet** | Merkurius: sehari > setahun · Venus: Matahari terbit di barat · Bumi: gerhana Matahari & Bulan (lab) · Mars: musim · Jupiter: hari tersingkat · Saturnus: cincin "menghilang" · Uranus: planet menggelinding · Neptunus: setahun = 165 tahun |
| **Lab gerhana** | Diagram langsung (penampang bayangan Bumi / cakram Matahari), tahap berwarna di bilah waktu (penumbra · sebagian · total), satu fakta "kenapa". Bulan saat gerhana total tetap bertekstur dengan cahaya tembaga dari atmosfer Bumi (lebih terang di tepi umbra, pinggiran kebiruan ozon) |
| **Sejarah** | Lini masa per planet, filter era, titik lokasi di permukaan (ikut rotasi), lintasan flyby/orbit. Seluruh kartu bisa digulir. Bumi juga memuat **kartu kenangan** Apollo 1 (1967), Challenger (1986), dan Columbia (2003): apa yang terjadi, penyebab, pelajaran keselamatan, dan nama awak — bahasa hormat & ramah anak, tanpa titik/lintasan di 3D |
| **Kuis** | Terbuka per planet setelah planet itu ditemukan (yang belum: terkunci + tombol *Terbang ke …*). 4 soal per planet, jawaban langsung dinilai, urutan pilihan diacak, hasil berupa 0–4 bintang. Hadiah = maks(0, skor baru − skor terbaik) |
| **Tebak dulu** | Sebelum fenomena diputar, pemain menebak (3 pilihan) → mengamati simulasi → jawaban & penjelasan dibuka (planet: setelah ± 6 detik pengamatan; gerhana: saat mencapai fase total). Judul fenomena yang belum ditebak tampil sebagai pertanyaan supaya jawabannya tidak bocor. Tebakan benar +10 bintang (satu kesempatan per fenomena) |
| **Mitos atau Fakta?** | Di panel Kuis: 6 pernyataan per ronde dari 24 (miskonsepsi umum & fakta yang jarang diketahui, dengan sumber); tiap pernyataan terbuka setelah benda terkaitnya ditemukan. Jawab dengan tombol, geser kartu (kiri Mitos, kanan Fakta), atau ← / →. Pernyataan baru yang dijawab benar +10 bintang |
| **Tahukah kamu?** | Kartu koleksi per benda langit (16 benda, 2–3 kartu: judul singkat + satu kalimat + sumber) di **Jurnal**, terbuka setelah benda ditemukan. Lencana angka di tombol menu & ubin Jurnal untuk kartu yang belum dibaca; pintasan dari halaman Planet. Kartu baru +5 bintang |
| **Peta** | *Lihat planet* hanya untuk planet yang sudah ditemukan. Skema tampak atas (skala akar, planet dalam tidak bertumpuk); desktop: daftar · peta · detail; ponsel: peta + lembar bawah. *Terbang ke sini* = terbang otomatis |
| **Hanggar** | Astra Scout (gratis), Orion Glider (300 bintang), Nova Voyager (700 bintang), model 3D berputar |
| **Profil** | Riwayat kuis, inventaris pesawat, pengaturan kontrol (tombol bisa diubah), FAQ & kredit |
| **Menu jeda** | Lanjutkan · Kuis · Peta · Hanggar · Jurnal · Kontrol · Pengaturan · Keluar ke beranda |

## Kontrol

Keyboard (bisa diubah di **Profil → Kontrol**): `Enter` gas / maju, `Ctrl` rem, `Alt` turbo, `W`/`S` hidung naik/turun (pitch),
`A`/`D` belok kiri/kanan (yaw tanpa geser samping), `Spasi` berhenti, `V` ganti kamera belakang/kokpit, `M` peta, `T` ganti target, `Esc` menu jeda.
Kursor: **Klik Kiri 1×** untuk masuk Kamera Bebas (melihat sekeliling bebas 360°), **Klik Kanan 1×** atau **Klik Kiri 2×** untuk keluar & luruskan kamera. Roda mouse untuk zoom.

Layar sentuh: joystick analog kemudi di sisi kiri bawah; tuas dorong kokpit & speedometer di kanan bawah (geser tuas untuk gas, turbo, atau rem);
geser layar untuk melihat sekeliling.

Karena `Ctrl` dipakai sebagai rem, browser akan bertanya dulu sebelum tab ditutup saat sedang terbang (mencegah `Ctrl+W` tak sengaja).

## Desain

- Tipografi 100% konsisten memakai font **Poppins** (bobot 400, 500, maksimal 600).
- Desain modern antariksa: tata letak terstruktur elegan, kartu kompak dengan sudut melengkung proporsional (bukan pil oval mainan), dan palet kosmik gelap (`#060a1a`, `#0e1533`) berpadu dengan aksen biru dan cyan (`#38bdf8`, `#3b82f6`).
- Panel padat dengan pencahayaan dan kontras tajam. Rasio piksel maksimum 1,5. Saat jeda/kuis/peta/profil, dunia dirender ± 20 fps.
- Token warna & komponen dasar ada di `app/assets/css/main.css`.

## Latar layar awal

**Beranda** digambar hidup oleh satu kanvas WebGL 1 kecil tanpa Three.js (`app/utils/liveBackdrop.js`, shader di `backdropShaders.js`,
± 15 KB, dimuat setelah halaman tampil): Bumi berputar (1 putaran / 3 menit).

**Masuk** dan **Daftar** memakai model 3D yang disiapkan (`app/utils/splash3d.js`, Three.js diunduh saat layar dibuka atau saat kursor
mendekati tombolnya):
- *Masuk* — Matahari (`public/models/decor/sun.glb`, 0,6 MB) berputar ± 4 menit/putaran, dengan **granulasi** seluler yang "mendidih",
  **spikula** di tepi, empat **prominensa** (busur plasma yang mengalir), dan siklus 16 detik: **suar (solar flare)** → **CME**
  (gelembung plasma yang meluas lalu memudar), ditambah korona.
- *Daftar* — tabrakan galaksi Bima Sakti × Andromeda (`galaxy_collision.glb`, 12.000 bintang, 22 morph target, 1,5 MB). Bidang
  tabrakan dihadapkan ke kamera dengan PCA, satu siklus ± 44 detik lalu memudar dan diulang.

Hemat: maks 30 fps, resolusi diperkecil, berhenti saat tab tersembunyi, turun kualitas otomatis lalu kembali ke gambar statis bila
perangkat lambat, dan konteks GPU dilepas saat game dimulai. Tidak dijalankan pada "Kurangi gerakan" / hemat data (gambar statis).

`scripts/render-backdrops.mjs` membuat `earth-band-{4k,2k}.webp` (tekstur Bumi pita lintang ±62°, 850/240 KB) dan
`bg-{earth,sun}.webp` (frame pertama yang sama, ± 35–85 KB) sebagai gambar instan & cadangan. `bg-galaxy.webp` (cadangan
halaman Daftar) dibuat oleh `npm run guide-images` dari bingkai awal model galaksi. Fungsi pikselnya
adalah padanan JS dari shader — ubah keduanya bersamaan; `node scripts/render-backdrops.mjs preview sun 390 844 30 out.png` untuk cek komposisi ponsel.

## Model 3D

Model mentah disimpan di `3D Planet/` dan `3D Pesawat/` (± 250 MB, tidak ikut git). `npm run models`
(`scripts/optimize-models.mjs`) mengolahnya menjadi `public/models/**.glb` (± 23 MB total):

- **Planet**: material *spec-gloss* dikonversi ke metal-rough; transform dipanggang; inti diproyeksikan ke bola satuan dan
  diorientasikan dari UV teksturnya — kutub utara → +Y, bujur 0° → +X, timur → −Z — sehingga sumbu rotasi, kemiringan, dan titik sejarah
  (lintang/bujur) cocok dengan peta permukaan. Cincin disejajarkan ke ekuator; partikel cincin Uranus & Neptunus digabung dan dijarangkan.
  Di game, planet diterangi shader Matahari sendiri (sisi malam, bayangan cincin, pendar atmosfer).
- **Pesawat**: hidung → −Z, ukuran dinormalkan; mesin, semburan api, dan pijar diberi peran agar bisa dianimasikan sesuai gas.
- **Lubang hitam**: dekorasi langit di luar tata surya (± 17.000 satuan, di luar batas navigasi). Dimuat ± 3 detik setelah permainan
  dimulai dan shader-nya dikompilasi asinkron, jadi tidak membebani layar awal maupun pemuatan.
- Tekstur WebP ≤ 2048 px, geometri `EXT_meshopt_compression`. Saat di beranda, model planet & pesawat diunduh di latar (prefetch, prioritas rendah; dilewati pada mode hemat data).
- Bila model planet gagal dimuat, game memakai planet prosedural sebagai cadangan. Pesawat **hanya** memakai model GLB
  (model prosedural lama sudah dihapus): selama unduhan berjalan pesawat belum tampil, lalu muncul begitu siap — tidak pernah dua model sekaligus.
- **Api mesin** (`app/game/ships.js`): dua lapis kerucut ber-shader (inti panas + selubung) yang bergoyang, berdenyut, dan
  bergolak oleh derau; panjangnya mengikuti gas, berlian kejut muncul saat turbo.

## Gambar panduan

Slide 1–4 panduan menampilkan slider 3 gambar (`public/img/guide/slide-N-M-*.webp`, 1280×800, ± 25–70 KB) yang selaras dengan poin
01/02/03 di kanan. Gambar dibuat oleh `npm run guide-images` (`scripts/render-guide.mjs`): perender perangkat lunak kecil
(`scripts/lib/raster.mjs`) menggambar planet & pesawat langsung dari model GLB game, lalu menambah latar nebula dan lapisan SVG.

| Di game | Model | Pembuat | Lisensi |
|---|---|---|---|
| Astra Scout | [Space Shuttle Discovery](https://sketchfab.com/3d-models/space-shuttle-discovery-240467f6626c4686a48eb71e0a7cf083) | Kevin Love SketchFab | CC BY 4.0 |
| Orion Glider | [Stealthy Space Tato](https://sketchfab.com/3d-models/stealthy-space-tato-1908274f339f412a85afe1b8f1fcc413) | jah3d | CC BY 4.0 |
| Nova Voyager | [SA-23 Starfury](https://sketchfab.com/3d-models/sa-23-starfury-8d8d8c27abc24165a390940358aea60d) | Hangar.b.productions | CC BY 4.0 |
| Merkurius | [Mercury](https://sketchfab.com/3d-models/mercury-0a7a8958d49944f1aef057951daa8fd3) | Anthony Yanez | CC BY 4.0 |
| Venus | [Venus](https://sketchfab.com/3d-models/venus-b306aaadbf2b4fcea1afa2db5ed75b4f) | kongle | CC BY-SA 4.0 |
| Bumi & latar beranda | [Earth](https://sketchfab.com/3d-models/earth-41fc80d85dfd480281f21b74b2de2faa) | Akshat | CC BY 4.0 |
| Bulan | [Moon](https://sketchfab.com/3d-models/moon-e6d36bb905ed42049a234e7be571d8a3) | Nestaeric | CC BY 4.0 |
| Mars | [Mars](https://sketchfab.com/3d-models/mars-2b46962637ee4311af8f0d1d0709fbb2) | Mieke Roth | CC BY 4.0 |
| Jupiter | [jupiter](https://sketchfab.com/3d-models/jupiter-c5275eb96af245e4a8453837ac728a62) | Mieke Roth | CC BY 4.0 |
| Saturnus | [Saturn (planet)](https://sketchfab.com/3d-models/saturn-planet-9ab1eb3bb97f4e4a9305c0aae2d280a6) | SebastianSosnowski | CC BY 4.0 |
| Uranus | [Uranus](https://sketchfab.com/3d-models/uranus-0009a69dbace44608c0bd09af9ba20db) | NestaEric | CC BY 4.0 |
| Neptunus | [Neptune](https://sketchfab.com/3d-models/neptune-2a6f9ccc5c724a709912774caa197b77) | Nestaeric | CC BY 4.0 |
| Lubang hitam di langit | [Black Hole](https://sketchfab.com/3d-models/black-hole-e410da98b1e5445eae2acafaaa53587d) | NestaEric | CC BY 4.0 |
| Latar halaman Masuk | [Sun](https://sketchfab.com/3d-models/sun-9ef1c68fbb944147bcfcc891d3912645) | SebastianSosnowski | CC BY 4.0 |
| Latar halaman Daftar | [Galaxy Collision 1- Milky Way x Andromeda](https://sketchfab.com/3d-models/galaxy-collision-1-milky-way-x-andromeda-0ec6b1f811684bfca7abe3ea78221fe5) | aditya299792 | CC BY 4.0 |

Semua model di atas **diubah** (dikonversi, diorientasikan ulang, disederhanakan, tekstur dikompres). Hasil olahan model Venus
tetap berlisensi **CC BY-SA 4.0**. Kredit yang sama tampil di game: *Profil → FAQ*.

## Struktur

```
app/
  pages/index.vue          cangkang: Splash → Guide → permainan; mesin 3D di-import dinamis saat Guide dibuka
  components/              Splash, Guide, TopBar, hud/* (GameHud, ApproachCard, TouchControls), panels/*, ui/* (Icon, KeyGuide, …)
  composables/useGame.js   state bersama UI ↔ mesin, simpan lokal, ekonomi bintang
  game/
    engine.js              mesin: renderer, kamera, terbang & terbang otomatis, tiba di planet, fenomena planet, HUD, input, loop
    models.js              pemuat GLB (meshopt + WebP) + dekorasi yang dimuat belakangan
    system.js              tata surya: orbit Kepler, rotasi sumbu, planet bertekstur, satelit, cincin, sabuk asteroid
    ships.js, lab.js, shaders.js, audio.js, util.js
  data/                    solarSystem, ships, history, quiz, phenomena (fenomena per planet), keymap (tombol), credits
public/img/                earth-band-*.webp, bg-earth.webp, bg-sun.webp, bg-blackhole.webp (hasil render-backdrops)
public/models/             planets/*.glb, ships/*.glb, decor/black_hole.glb (hasil npm run models), decor/{sun,galaxy_collision}.glb (npm run backdrops)
scripts/                   optimize-models.mjs, render-backdrops.mjs
```

## Data & skala

- Radius, rotasi sideris, dan periode orbit: tabel NASA JPL (PRD §6.4). Ukuran planet **berskala nyata relatif satu sama lain**
  (1 satuan dunia ≈ 398 km). **Jarak antarplanet dipadatkan** dan Matahari tidak berskala.
- Orbit: elemen Kepler rata-rata J2000 yang dibulatkan, Matahari di fokus elips. Model edukasi, bukan ephemeris.
- Waktu simulasi dimulai dari tanggal hari ini; 1 hari simulasi = 50 detik pada 1×.
- Fenomena mempercepat waktu (12× – 60.000×). Rotasi yang terlalu cepat untuk dilihat diperlambat khusus tampilan (≤ 0,6 putaran/detik);
  posisi orbit dan arah cahaya Matahari tetap mengikuti waktu yang dipercepat.

## Belum tersedia / catatan jujur

- **Akun & cloud save**: Masuk/Daftar memakai nama + kata sandi yang hanya tersimpan di perangkat ini (bukan keamanan sungguhan); belum ada backend (target PRD: Supabase).
- **Admin/CMS**: konteks terpisah, belum dibuat. Konten sejarah adalah contoh data lokal.
- **Model 3D**: Matahari serta Io, Europa, Ganymede, Callisto, dan Titan masih prosedural. Tekstur Bumi tidak punya lampu kota.
  Tekstur Bulan berupa atlas, sehingga bujur 0°-nya diperkirakan dari pusat maria. Cincin Uranus pada model lebih lebar dari aslinya.
- Fenomena Mars/Uranus menghitung "musim di belahan utara" dari kemiringan sumbu terhadap arah Matahari (ilustrasi, tanpa atmosfer/iklim).
