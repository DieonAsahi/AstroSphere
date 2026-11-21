// Misi kisah nyata. Apollo 13 (1970): "kegagalan yang berhasil" — tangki oksigen meledak dalam perjalanan ke Bulan,
// pendaratan dibatalkan, dan kru pulang selamat dengan memutari Bulan. Alur: game/mission.js + panels/MissionPanel.vue.
// Sumber utama: NASA Apollo 13 Flight Journal, Smithsonian NASM, Britannica (lihat README).
export const MISSION_REWARD = 30;

export const APOLLO13 = {
  id: 'apollo13',
  title: 'Apollo 13',
  tag: 'Kisah nyata · 1970',
  quote: 'Houston, we’ve had a problem.',
  crew: [
    { name: 'Jim Lovell', role: 'Komandan' },
    { name: 'Jack Swigert', role: 'Pilot modul komando' },
    { name: 'Fred Haise', role: 'Pilot modul pendarat' },
  ],
  brief: 'Tiga astronaut berangkat menuju Bulan. Pesawatnya terdiri dari modul komando "Odyssey" dan modul pendarat "Aquarius". Bantu mereka sampai tujuan.',
  // jam misi (sejak peluncuran) untuk tiap peristiwa, dipakai jam & tanggal di panel
  clock: { boom: 55.9, burn: 61.5, far: 77.1, co2: 83, reentry: 142.6, splash: 142.9 },
  launchUTC: Date.UTC(1970, 3, 11, 19, 13), // 11 April 1970, 13.13 waktu Houston
  steps: {
    boom: {
      title: 'Ledakan!',
      text: 'Tangki oksigen nomor 2 di modul layanan meledak. Oksigen dan listrik bocor ke angkasa. Pesawat berada lebih dari 320.000 km dari Bumi.',
    },
    decide: {
      title: 'Apa yang harus dilakukan?',
      text: 'Pendaratan di Bulan dibatalkan. Sekarang yang penting: pulang dengan selamat.',
      options: [
        { t: 'Putar balik langsung ke Bumi', ok: false, why: 'Mesin utama di modul layanan mungkin ikut rusak, dan berbalik arah di tengah jalan butuh bahan bakar sangat banyak.' },
        { t: 'Memutari Bulan, lalu meluncur pulang', ok: true, why: 'Benar! Gravitasi Bulan dipakai seperti ketapel untuk membelokkan pesawat kembali ke Bumi. Hemat bahan bakar.' },
        { t: 'Tetap mendarat di Bulan', ok: false, why: 'Modul layanan rusak parah. Keselamatan kru jauh lebih penting daripada pendaratan.' },
      ],
    },
    power: {
      title: 'Pindah ke sekoci "Aquarius"',
      text: 'Modul komando harus dimatikan agar baterainya tersisa untuk pulang. Kru pindah ke modul pendarat. Matikan semua yang tidak penting.',
      switches: [
        { id: 'udara', t: 'Udara & oksigen', keep: true, why: 'Tanpa udara, kru tidak bisa bernapas!' },
        { id: 'radio', t: 'Radio ke Houston', keep: true, why: 'Kru butuh petunjuk dari Houston untuk pulang.' },
        { id: 'pemanas', t: 'Pemanas kabin', keep: false, why: 'Pemanas boros listrik. Kru memilih kedinginan demi menghemat daya.' },
        { id: 'lampu', t: 'Lampu & layar', keep: false, why: 'Lampu dan layar ikut menghabiskan listrik.' },
        { id: 'komputer', t: 'Komputer modul komando', keep: false, why: 'Komputer ini dimatikan agar baterai modul komando tersisa untuk masuk atmosfer.' },
      ],
    },
    burn: {
      title: 'Koreksi arah',
      text: 'Agar bisa memutari Bulan dan pulang, arah pesawat dibetulkan dengan mesin modul pendarat. Tahan tombol, lepaskan saat jarum di zona hijau.',
      zone: [0.46, 0.58],
    },
    far: {
      title: 'Di balik Bulan',
      text: 'Kontak radio dengan Bumi terputus selama di balik Bulan. Pada saat ini kru Apollo 13 berada 400.171 km dari Bumi — rekor jarak terjauh manusia yang bertahan 56 tahun, sampai dipecahkan misi Artemis II pada 2026.',
    },
    co2: {
      title: 'Udara makin beracun',
      text: 'Karbon dioksida (CO₂) dari napas kru menumpuk. Saringan cadangan berbentuk kotak, padahal lubang di Aquarius bulat. Rakit "kotak surat" dari barang di kabin.',
      items: [
        { id: 'lakban', t: 'Lakban', ok: true },
        { id: 'plastik', t: 'Kantong plastik', ok: true },
        { id: 'karton', t: 'Karton sampul buku panduan', ok: true },
        { id: 'selang', t: 'Selang baju antariksa', ok: true },
        { id: 'senter', t: 'Senter', ok: false },
        { id: 'permen', t: 'Permen karet', ok: false },
        { id: 'gunting', t: 'Gunting', ok: false },
        { id: 'lem', t: 'Lem super', ok: false },
      ],
      done: 'Berhasil! Insinyur di Houston merancang adaptor ini dari barang yang ada di pesawat, lalu membacakan langkahnya lewat radio.',
    },
    reentry: {
      title: 'Masuk atmosfer',
      text: 'Jaga sudut masuk di jalur hijau. Terlalu curam: kapsul terlalu panas. Terlalu landai: kapsul memantul kembali ke angkasa. Pakai ↑/↓ atau tombol di layar.',
      band: [5.5, 7.5], // derajat (koridor masuk Apollo)
      seconds: 9,
    },
    splash: {
      title: 'Selamat sampai di Bumi!',
      text: '17 April 1970, kapsul Odyssey mendarat di Samudra Pasifik dekat Samoa. Ketiga astronaut dijemput kapal USS Iwo Jima dalam keadaan selamat.',
    },
  },
  facts: [
    'Modul pendarat Aquarius dirancang untuk 2 orang dan waktu singkat, tetapi harus menampung 3 orang hampir 4 hari.',
    'Apollo 13 dijuluki "kegagalan yang berhasil": tujuannya gagal, tetapi semua kru selamat.',
    'Kerusakan berasal dari kabel pemanas di dalam tangki oksigen yang rusak saat pengujian sebelum peluncuran.',
  ],
};
// Mars Climate Orbiter (1998–1999): hilang di Mars karena dua tim memakai satuan berbeda. Tiga babak: kisah nyata →
// investigasi (cari penyebab) → ulangi sejarah (konversi satuan dengan benar). Alur: game/missionMco.js + panels/McoPanel.vue.
// Sumber: NASA/JPL (berita 1999), laporan Mishap Investigation Board fase I (10 Nov 1999), IEEE Spectrum.
export const MCO = {
  id: 'mco',
  title: 'Mars Climate Orbiter',
  tag: 'Kisah nyata · 1999',
  launchUTC: Date.UTC(1998, 11, 11, 18, 45), // 11 Desember 1998
  arriveDay: 286, // 23 September 1999
  plannedKm: 226, actualKm: 57,
  brief: 'Wahana ini dikirim untuk mempelajari cuaca dan air di Mars. Setelah 9 bulan perjalanan, ia harus menyalakan mesin tepat di dekat Mars agar tertangkap ke orbit, sekitar 226 km di atas permukaan.',
  lost: 'Mesin menyala, lalu wahana bergerak ke balik Mars dan sinyal tertutup — sesuai rencana. Tetapi sinyal tidak pernah kembali. Wahana kemungkinan hancur di atmosfer Mars.',
  clues: [
    { t: 'Jejak terakhir', d: 'Data pelacakan menunjukkan wahana lewat hanya sekitar 57 km di atas Mars, padahal rencananya sekitar 226 km. Terlalu dekat dengan atmosfer.' },
    { t: 'Dorongan kecil', d: 'Panel surya hanya ada di satu sisi, jadi cahaya Matahari terus memutar wahana sedikit demi sedikit. Pendorong kecil berkali-kali dinyalakan untuk meluruskannya.' },
    { t: 'Dua program', d: 'Program tim pembuat wahana menulis besar dorongan dalam pound-gaya·detik. Program tim navigasi membaca angka itu sebagai newton·detik.' },
  ],
  question: 'Apa penyebab utama wahana terlalu rendah?',
  options: [
    { t: 'Mesin utama rusak', ok: false, why: 'Mesin menyala sesuai jadwal. Masalahnya sudah ada sebelum mesin dinyalakan.' },
    { t: 'Tertabrak meteor', ok: false, why: 'Tidak ada tanda tabrakan. Jalurnya melenceng perlahan selama berbulan-bulan.' },
    { t: 'Dua tim memakai satuan berbeda', ok: true, why: '1 pound-gaya = 4,45 newton. Tiap dorongan kecil dihitung 4,45 kali lebih lemah dari kenyataan. Kesalahannya kecil, tapi menumpuk selama 9 bulan — dan tidak ada yang memeriksa ulang.' },
    { t: 'Badai debu Mars', ok: false, why: 'Badai debu tidak bisa menggeser jalur wahana sejauh ratusan kilometer sebelum tiba.' },
  ],
  factor: 4.45,
  packets: [
    { v: 2.0, opts: [2.0, 8.9, 0.45, 20], a: 8.9 },
    { v: 0.8, opts: [0.8, 3.56, 0.18, 8], a: 3.56 },
    { v: 3.0, opts: [13.35, 3.0, 0.67, 30], a: 13.35 },
  ],
  success: 'Mesin menyala tepat 226 km di atas Mars, dan wahana tertangkap ke orbit. Kali ini satuannya benar!',
  lessons: [
    'Selalu tulis satuan di samping angka.',
    'Kalau data terasa aneh, tanyakan dan periksa ulang — kesalahan kecil bisa menumpuk.',
    'Hampir semua negara, termasuk Indonesia, memakai satuan SI: meter, kilogram, detik, newton.',
  ],
  facts: [
    'Wahananya bernilai sekitar 125 juta dolar AS.',
    'Laporan tim penyelidik NASA keluar pada 10 November 1999, tujuh minggu setelah wahana hilang.',
  ],
};
export const MISSIONS = { apollo13: APOLLO13, mco: MCO };
