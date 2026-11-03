# PRD Ringkas AstroSphere

## Ringkasan kebutuhan

Dokumen ini mencatat kebutuhan fungsional platform AstroSphere beserta prioritas dan status implementasi untuk MVP.

## Daftar kebutuhan fungsional

| ID    | Kebutuhan                                                                                                  | Prioritas | Status  |
| ----- | ---------------------------------------------------------------------------------------------------------- | --------- | ------- |
| FR-01 | Tata surya 3D dengan orbit planet yang bergerak secara real-time di browser.                               | Must      | Selesai |
| FR-02 | Kontrol kamera untuk zoom, pan, dan rotasi 360 derajat.                                                    | Must      | Selesai |
| FR-03 | Klik planet untuk memperbesar tampilan dan memunculkan penanda titik minat (POI).                          | Must      | Selesai |
| FR-04 | Panel POI yang menampilkan sejarah, dimensi, dan topografi 3D.                                             | Must      | Selesai |
| FR-05 | Animasi partikel fenomena astronomi beserta informasi proses pembentukannya.                               | Must      | Selesai |
| FR-06 | Pencarian dan daftar benda langit untuk menemukan objek dengan cepat.                                      | Should    | Selesai |
| FR-07 | Akun siswa dan guru serta kelas dengan kode gabung.                                                        | Should    | Selesai |
| FR-08 | Pembuatan dan pemutaran tur terpandu oleh guru.                                                            | Should    | Selesai |
| FR-09 | Pelacakan dan tampilan progres jelajah siswa.                                                              | Should    | Selesai |
| FR-10 | Kuis yang terhubung dengan setiap POI.                                                                     | Could     | Selesai |
| FR-11 | CMS admin untuk mengelola planet, POI, dan aset 3D beserta metadata.                                       | Must      | Selesai |
| FR-12 | Mode performa rendah untuk mengurangi detail visual, tekstur, partikel, dan gerak pada perangkat menengah. | Must      | Selesai |

## Catatan lintas kebutuhan

- Semua data awal berasal dari berkas JSON lokal melalui lapisan repository (`bodyRepository`, `poiRepository`).
- Semua fakta yang ditampilkan wajib memiliki field sumber; informasi yang belum terverifikasi ditandai `perlu verifikasi`.
- Aset 3D, tekstur, dan sumber lisensi tercatat dalam metadata aset.
- Setiap fitur yang berhubungan dengan gerak wajib menyediakan versi dengan animasi dikurangi (`prefers-reduced-motion` dan toggle manual).
- Bahasa antarmuka adalah Bahasa Indonesia dengan sentralisasi berkas string di `src/lib/i18n/id.ts`.
- Aksesibilitas: WCAG AA, navigasi penuh keyboard, skip-link, direktori non-kanvas ramah pembaca layar, pengumuman status `aria-live`, dan audit lolos tanpa pelanggaran serius `axe`.
