# Panduan Pelindungan Data Pribadi & Kepatuhan UU PDP (AstroSphere)

Dokumen ini menguraikan arsitektur privasi, analisis kepatuhan hukum, dan rekomendasi operasional platform edukasi **AstroSphere** berdasarkan **Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)**, dengan fokus khusus pada pelindungan pengguna anak di bawah umur (siswa sekolah dasar dan menengah).

---

## 1. Konteks Pengguna & Karakteristik Data

AstroSphere digunakan di lingkungan sekolah Indonesia:

- **Mayoritas Pengguna adalah Anak di Bawah Umur**: Siswa berusia 7–18 tahun yang menjelajahi tata surya 3D dan mengerjakan modul bimbingan guru.
- **Kategori Data yang Diproses**:
  - **Data Pribadi Umum (Pasal 4 Ayat 3 UU PDP)**: Nama lengkap pengguna dan alamat surat elektronik (email).
  - **Data Pembelajaran Edukasi**: Catatan progres penjelajahan titik minat (POI), skor kuis sains, dan keanggotaan kelas.
  - **Data Telemetri Performa Agregat**: Durasi sesi, rata-rata frame rate (FPS), dan tingkat kualitas grafis (tanpa korelasi pengenal pribadi).
- **Prinsip Bebas Komersialisasi**: Platform tidak menampilkan iklan pihak ketiga (_third-party ad networks_), tidak memperjualbelikan data siswa, dan tidak menyematkan pelacak perilaku lintas situs (_cross-site behavioral trackers_).

---

## 2. Kepatuhan Khusus: Pelindungan Data Anak (Pasal 25 UU PDP)

Pasal 25 UU PDP menyatakan:

> _(1) Pemrosesan Data Pribadi anak diselenggarakan secara khusus._
> _(2) Pemrosesan Data Pribadi anak sebagaimana dimaksud pada ayat (1) wajib mendapat persetujuan dari orang tua anak dan/atau wali anak._

### Implementasi AstroSphere:

1. **Dasar Hukum Pemrosesan Edukasional (_Educational Legitimate Interest_)**:
   - Pendaftaran siswa difasilitasi oleh guru atau institusi sekolah melalui modul ruang kelas berlisensi edukasi.
   - Pengguna siswa baru secara default terdaftar dengan peran `'siswa'` tanpa akses administrasi.
2. **Bahasa Antarmuka yang Ramah Anak**:
   - Seluruh teks kebijakan privasi dan petunjuk kelas disusun dalam **Bahasa Indonesia yang jelas, ringkas, dan bebas jargon hukum rumit** sehingga siswa memahami data apa yang dicatat.
3. **Kerahasiaan Alamat Email Siswa di Lingkungan Kelas**:
   - Di dalam tabel basis data `class_members` dan antarmuka UI `ClassesPage`, alamat email siswa **sama sekali tidak diekspos kepada siswa lain**.
   - Sesama siswa di kelas hanya dapat melihat nama atau nama panggilan siswa. Guru pengajar dapat melihat nama dan tanggal bergabung.
   - Hal ini mencegah risiko kontak tanpa izin, _phishing_, perundungan siber (_cyberbullying_), atau kebocoran kontak anak.

---

## 3. Penerapan Prinsip Minimisasi Data (_Data Minimization_)

Sesuai Pasal 16 Ayat 2 Huruf e UU PDP, pemrosesan data pribadi harus dibatasi hanya pada data yang memadai, relevan, dan diperlukan sesuai tujuan:

| Data                               | Diperlukan? | Justifikasi Teknis                                                                                                                                         |
| :--------------------------------- | :---------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alamat Email**                   |     Ya      | Digunakan semata-mata sebagai pengenal unik login dan pemulihan kata sandi (Supabase Auth).                                                                |
| **Nama Lengkap**                   |     Ya      | Ditampilkan pada sertifikat progres penjelajahan dan daftar siswa guru.                                                                                    |
| **Nomor Induk Kependudukan (NIK)** |  **TIDAK**  | **Dilarang dikumpulkan.** Identifikasi siswa cukup menggunakan kode kelas 6 karakter.                                                                      |
| **Nomor Telepon / WhatsApp**       |  **TIDAK**  | **Dilarang dikumpulkan.** Komunikasi antar-siswa dan guru dilakukan lewat platform sekolah resmi.                                                          |
| **Lokasi Presisi GPS Real-Time**   |  **TIDAK**  | **Dilarang dikumpulkan.** Koordinat lintang/bujur pada basis data hanya merujuk pada permukaan planet Mars atau Jupiter, bukan lokasi fisik siswa di Bumi. |
| **Foto Wajah / Kamera Pengguna**   |  **TIDAK**  | **Dilarang dikumpulkan.** Profil pengguna menggunakan avatar ikon ilustrasi observatorium.                                                                 |

---

## 4. Pemenuhan Hak-Hak Subjek Data (Pasal 5 s/d 13 UU PDP)

AstroSphere menyediakan mekanisme swalayan (_self-service_) langsung pada antarmuka:

1. **Hak untuk Mengakses Data (Pasal 5)**:
   - Siswa dan guru dapat melihat seluruh riwayat kelas yang diikutinya di `/kelas`.
2. **Hak Memperbarui Data (Pasal 6)**:
   - Pengguna dapat mengubah nama tampilan atau institusi sekolah sewaktu-waktu.
3. **Hak untuk Menghapus Data / _Right to Erasure_ (Pasal 8)**:
   - Pada halaman `/kebijakan-privasi`, disediakan tombol interaktif **"Hapus Akun Saya"**.
   - Ketika dikonfirmasi, sistem secara permanen menghapus data profil pengguna, keanggotaan kelas, riwayat progres POI, dan catatan kuis dari basis data (_hard delete / anonymization_).
4. **Hak Menarik Persetujuan (Pasal 9)**:
   - Siswa bebas meninggalkan kelas guru kapan saja lewat tombol _"Tinggalkan Kelas"_.

---

## 5. Keamanan Teknis & Isolasi Data (Pasal 35 UU PDP)

1. **Row Level Security (RLS) di Supabase PostgreSQL**:
   - Seluruh tabel relasional menerapkan RLS aktif 100%.
   - Kueri dari klien siswa dibatasi secara matematis oleh PostgreSQL (`user_id = auth.uid()`), sehingga mustahil bagi siswa untuk menyuntikkan kueri guna membaca kelas milik guru lain atau progres siswa dari sekolah lain.
2. **Enkripsi Transit & Penyimpanan**:
   - Seluruh lalu lintas data dienkripsi menggunakan TLS 1.3 (HTTPS).
   - Kata sandi disimpan oleh Supabase Auth menggunakan algoritma hashing standar industri (bcrypt/Argon2).
3. **Kode Gabung Acak Aman (_Join Code_)**:
   - Kode gabung kelas 6 karakter acak diekstrak dari kumpulan karakter aman tanpa huruf/angka rancu (`0`, `O`, `1`, `I`), dengan masa kedaluwarsa dan kemampuan regenerasi oleh guru.

---

## 6. Rekomendasi Operasional untuk Sekolah & Guru

1. **Pemberitahuan kepada Orang Tua**: Sekolah disarankan menyertakan tautan Kebijakan Privasi AstroSphere (`/kebijakan-privasi`) dalam modul pembelajaran digital tahun ajaran baru.
2. **Pengelolaan Kode Kelas**: Guru diimbau membagikan kode gabung 6 karakter hanya kepada siswa di rombel terkait dan menonaktifkan kode setelah seluruh siswa bergabung.
3. **Penyimpanan Luring untuk Sekolah Daerah**: Pada perangkat sekolah dengan koneksi internet terbatas, eksplorasi 3D dapat berjalan sepenuhnya secara luring (JSON lokal) tanpa mewajibkan siswa melakukan login atau mengirimkan data ke awan.
