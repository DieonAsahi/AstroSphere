# Dokumentasi Verifikasi Konten Ilmiah & Akurasi Sains AstroSphere

Dokumen ini memuat audit akurasi fakta astronomi, daftar sumber rujukan resmi (NASA, USGS, ESA), serta daftar klaim ilmiah yang diberi label **"Perlu Verifikasi"** untuk ditinjau oleh guru dan akademisi astronomi.

---

## 1. Standar Akurasi Konten AstroSphere

1. **Prinsip Bebas Halusinasi**: Setiap angka dimensi, massa, koordinat geologi, dan parameter orbit wajib merujuk langsung ke basis data observasi lembaga sains antariksa dunia.
2. **Keterlacakan Sumber**: Komponen antarmuka (termasuk tab "Sumber" pada [`PoiPanel`](file:///c:/Users/athaw/try%20to%20do%20better/AstroSphere/src/ui/PoiPanel.tsx)) wajib menampilkan URL atau publikasi ilmiah yang dapat diakses publik.
3. **Pembedaan Fakta vs Hipotesis**: Fenomena yang belum dipahami secara konsensus (misalnya usia kepunahan vulkanisme Mars atau dinamika penyusutan Badai Merah Jupiter) secara transparan ditandai dengan label **"Perlu Verifikasi"**.

---

## 2. Inventaris Konten & Sumber Rujukan Terverifikasi

### A. Benda Langit Utama (Matahari, Planet, dan Satelit)

| Objek         | Fakta & Parameter Terverifikasi                                                                                   | Sumber Ilmiah Resmi                                     | Status Verifikasi |
| :------------ | :---------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------ | :---------------: |
| **Matahari**  | Diameter 1.392.700 km, Massa $1,9884 \times 10^{30}$ kg, Kemiringan sumbu $7,25^\circ$.                           | NASA Goddard Space Flight Center (NSSDC Sun Fact Sheet) | **Terverifikasi** |
| **Merkurius** | Diameter 4.879,4 km, Periode rotasi 1.407,6 jam (resonansi 3:2), Orbit 87,969 hari, Eksentrisitas 0,2056.         | NASA MESSENGER Mission Data Archive                     | **Terverifikasi** |
| **Venus**     | Diameter 12.103,6 km, Rotasi retrograde $-5.832,5$ jam, Kemiringan sumbu $177,36^\circ$, Tekanan atmosfer 92 bar. | NASA Magellan Radar Mapping & NSSDC Venus Fact Sheet    | **Terverifikasi** |
| **Bumi**      | Diameter 12.742,0 km, Massa $5,97237 \times 10^{24}$ kg, Rotasi 23,9345 jam, Orbit 365,256 hari.                  | NASA Earth Observatory & IERS Numerical Standards       | **Terverifikasi** |
| **Bulan**     | Diameter 3.474,8 km, Massa $7,342 \times 10^{22}$ kg, Penguncian pasang surut 27,322 hari.                        | NASA Lunar Reconnaissance Orbiter (LRO)                 | **Terverifikasi** |
| **Mars**      | Diameter 6.779,0 km, Rotasi 24,6229 jam, Kemiringan sumbu $25,19^\circ$, Sumbu semi-mayor 1,524 AU.               | NASA Mars Reconnaissance Orbiter (MRO)                  | **Terverifikasi** |
| **Jupiter**   | Diameter 139.820 km, Massa $1,8982 \times 10^{27}$ kg, Rotasi tercepat 9,925 jam, Sumbu semi-mayor 5,204 AU.      | NASA Juno Mission & NSSDC Jupiter Fact Sheet            | **Terverifikasi** |
| **Saturnus**  | Diameter 116.460 km, Massa $5,6834 \times 10^{26}$ kg, Rotasi 10,656 jam, Sistem cincin es luas.                  | NASA Cassini-Huygens Mission Data Archive               | **Terverifikasi** |
| **Uranus**    | Diameter 50.724 km, Rotasi retrograde $-17,24$ jam, Kemiringan sumbu ekstrem $97,77^\circ$.                       | NASA Voyager 2 Planetary Flyby Data                     | **Terverifikasi** |
| **Neptunus**  | Diameter 49.244 km, Orbit 60.189 hari (~165 tahun Bumi), Kecepatan angin $> 2.000$ km/jam.                        | NASA Voyager 2 Science Team & NSSDC Neptune Fact Sheet  | **Terverifikasi** |

### B. Titik Minat (Points of Interest / POI)

| Titik Minat (POI)                        | Lokasi                                                   | Parameter Terverifikasi                                                                                                                                                         | Sumber Ilmiah Resmi                                                                                                 |      Status       |
| :--------------------------------------- | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------ | :---------------: |
| **Gunung Olympus (Olympus Mons)**        | Mars ($18,65^\circ\text{ LU}, 226,20^\circ\text{ BT}$)   | - Tinggi dari datum: 21,9 km<br>- Diameter dasar: 600 km<br>- Kedalaman kaldera: 3,2 km<br>- Tinggi tebing pembatas: 8,0 km                                                     | - NASA Mars Orbiter Laser Altimeter (MOLA)<br>- USGS Astrogeology Science Center<br>- Smith et al. (2001) _Science_ | **Terverifikasi** |
| **Badai Merah Raksasa (Great Red Spot)** | Jupiter ($-22,0^\circ\text{ LS}, 270,0^\circ\text{ BT}$) | - Arah putaran: Berlawanan arah jarum jam (antisiklonik)<br>- Panjang: 16.350 km<br>- Lebar: 10.000 km<br>- Kecepatan angin tepi: 432 km/jam<br>- Kedalaman akar badai: ~300 km | - NASA Juno Microwave Radiometer (MWR)<br>- Hubble Space Telescope OPAL Program<br>- Bolton et al. (2021) _Science_ | **Terverifikasi** |

---

## 3. Daftar Fakta yang Diberi Tanda "Perlu Verifikasi" (Untuk Tinjauan Ahli/Guru)

Berikut adalah klaim ilmiah yang sengaja diberi catatan **"Perlu Verifikasi"** di antarmuka AstroSphere karena adanya perdebatan observasi atau variasi metodologi:

### 1. Rotasi Diferensial Matahari

- **Klaim di Antarmuka**: Periode rotasi Matahari dicatat rata-rata 609,12 jam (~25,38 hari).
- **Alasan Tanda Verifikasi**: Matahari bukan benda padat, melainkan bola plasma gas pijar yang mengalami rotasi diferensial: daerah khatulistiwa berotasi dalam ~25 hari, sedangkan daerah kutub berotasi lebih lambat (~34–35 hari).
- **Rekomendasi Ahli/Guru**: Tambahkan catatan penjelasan di deskripsi bahwa nilai tersebut merepresentasikan rotasi ekuator (_sidereal rotation period_ pada lintang $16^\circ$).

### 2. Status Keaktifan Vulkanisme Olympus Mons di Mars

- **Klaim di Antarmuka**: Erupsi lava terakhir diperkirakan terjadi puluhan juta tahun lalu.
- **Alasan Tanda Verifikasi**: Analisis penghitungan kawah (_crater counting_) dari instrumen HRSC (ESA Mars Express) menemukan beberapa aliran lava muda berumur 25 juta hingga 2 juta tahun yang lalu, yang mengindikasikan bahwa Olympus Mons kemungkinan tidak sepenuhnya punah melainkan berada dalam fase dorman vulkanik jangka panjang.
- **Rekomendasi Ahli/Guru**: Tinjau penyajian narasi di tab Sejarah POI agar siswa memahami konsep "gunung berapi dorman vs punah" dalam geologi planet.

### 3. Dinamika Penyusutan Ukuran Badai Merah Raksasa Jupiter

- **Klaim di Antarmuka**: Badai Merah Raksasa menyusut dari panjang ~40.000 km pada era observasi teleskop abad ke-19 menjadi ~16.350 km saat ini.
- **Alasan Tanda Verifikasi**: Para astrofisikawan masih memperdebatkan apakah Badai Merah Raksasa yang diamati oleh Giovanni Cassini dan Robert Hooke pada abad ke-17 adalah badai yang sama persis dengan yang terlihat sekarang, serta apakah penyusutan saat ini akan berlanjut hingga badai lenyap atau sekadar siklus fluktuasi jangka panjang atmosfer gas.
- **Rekomendasi Ahli/Guru**: Pertahankan tanda "Perlu Verifikasi" pada panel _Bagaimana Badai Ini Terbentuk_ untuk mendorong diskusi kritis siswa mengenai sifat fluida atmosfer planet raksasa gas.

### 4. Kedalaman Maksimum Es Bawah Permukaan di Kutub Mars

- **Klaim di Antarmuka**: Deposit es air dan karbon dioksida beku di tudung kutub Mars.
- **Alasan Tanda Verifikasi**: Data radar penembus tanah SHARAD (MRO) dan MARSIS (Mars Express) mengindikasikan keberadaan lapisan danau air asin subglasial di bawah tudung kutub selatan, namun klaim ini masih diperdebatkan oleh beberapa tim peneliti independen (kemungkinan merupakan sinyal pantulan batuan lempung beku).
- **Rekomendasi Ahli/Guru**: Menunggu data konsensus sebelum memasukkan klaim danau air cair bawah tanah Mars ke kuis siswa.

---

## 4. Alur Peninjauan Konten Baru (Untuk Admin & Guru)

Ketika guru atau admin membuat titik minat atau kuis baru melalui CMS Admin:

1. Kolom sumber (`sources`) wajib diisi (minimal satu tautan publik ilmiah valid).
2. Jika suatu nilai fakta berasal dari estimasi atau hipotesis yang belum mapan, admin wajib mencentang atau menambahkan teks `"Perlu verifikasi"` pada field sumber.
3. Teks tersebut otomatis memunculkan lencana oranye _Perlu Verifikasi_ pada panel siswa sehingga proses pembelajaran tetap mengedepankan etika ilmiah dan literasi kritis.
