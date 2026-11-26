// Lini masa sejarah per benda langit (Mode Sejarah).
// locationType: 'surface' (punya koordinat permukaan → POI di planet), 'flyby' | 'orbit' | 'observation' | 'atmosphere' | 'moon'
// (tanpa koordinat permukaan → ditampilkan sebagai lintasan/daftar, bukan titik pendaratan palsu — PRD §7.2).
// lat/lon dalam derajat (lon timur positif). Posisi POI di planet ilustratif karena tekstur planet prosedural.
// Status konten: 'demo' (konten lokal demo, belum dipublikasikan admin — PRD §11.3).

export const ERAS = [
  { id: 'semua', label: 'Semua Periode', from: -99999, to: 99999 },
  { id: 'kuno', label: 'Kuno (SM–1609)', from: -99999, to: 1609 },
  { id: 'teleskopik', label: 'Teleskopik (1610–1956)', from: 1610, to: 1956 },
  { id: 'antariksa', label: 'Antariksa (1957–kini)', from: 1957, to: 99999 },
];

const ev = (id, year, actor, kind, locationType, title, body, detail, loc) => ({ id, year, actor, kind, locationType, title, body, detail, lat: loc?.[0] ?? null, lon: loc?.[1] ?? null, status: 'demo' });
// Kenangan: awak yang gugur dalam tugas. Tanpa titik/lintasan di 3D; kartu berisi apa yang terjadi, penyebab, pelajaran, dan nama awak.
// Sumber: NASA Day of Remembrance, NASA Safety & Mission Assurance (Challenger/Columbia), Rogers Commission, CAIB.
const mem = (id, year, date, actor, title, body, cause, lesson, crew) => ({ ...ev(id, year, actor, 'Kenangan', 'memorial', title, body, cause), memorial: { date, cause, lesson, crew } });

export const HISTORY = {
  merkurius: [
    ev('mer-1631', 1631, 'Pierre Gassendi', 'Pengamatan', 'observation', 'Transit Merkurius Pertama yang Diamati', 'Gassendi menyaksikan Merkurius melintas di depan Matahari, seperti yang diprediksi Johannes Kepler.', 'Pengamatan ini membuktikan bahwa planet bisa diprediksi posisinya dengan hukum gerak Kepler.'),
    ev('mer-1974', 1974, 'Mariner 10 (NASA)', 'Lintas terbang', 'flyby', 'Wahana Pertama yang Mengunjungi Merkurius', 'Mariner 10 melintas tiga kali dan memotret hampir separuh permukaan Merkurius.', 'Foto-fotonya memperlihatkan permukaan berkawah mirip Bulan dan mengungkap adanya medan magnet.'),
    ev('mer-2011', 2011, 'MESSENGER (NASA)', 'Orbit', 'orbit', 'Wahana Pertama yang Mengorbit Merkurius', 'MESSENGER memetakan seluruh permukaan dan menemukan petunjuk es air di kawah kutub yang selalu gelap.', 'Misi berakhir pada 2015 saat wahana sengaja ditabrakkan ke permukaan.'),
    ev('mer-2018', 2018, 'BepiColombo (ESA/JAXA)', 'Peluncuran', 'flyby', 'Misi Bersama Eropa–Jepang Diluncurkan', 'BepiColombo membawa dua pengorbit untuk mempelajari permukaan dan magnetosfer Merkurius.', 'Dalam perjalanan, wahana melakukan beberapa lintas terbang dekat Merkurius.'),
  ],
  venus: [
    ev('ven-1610', 1610, 'Galileo Galilei', 'Pengamatan', 'observation', 'Penemuan Fase-Fase Venus', 'Galileo melihat Venus memiliki fase seperti Bulan.', 'Fase lengkap Venus hanya mungkin jika Venus mengelilingi Matahari — bukti kuat model heliosentris.'),
    ev('ven-1962', 1962, 'Mariner 2 (NASA)', 'Lintas terbang', 'flyby', 'Lintas Terbang Planet Pertama yang Berhasil', 'Mariner 2 mengukur suhu Venus yang sangat panas dari jarak dekat.', 'Ini adalah misi antarplanet pertama yang berhasil mengirim data ilmiah.'),
    ev('ven-1970', 1970, 'Venera 7 (Uni Soviet)', 'Pendaratan', 'surface', 'Data Pertama dari Permukaan Planet Lain', 'Venera 7 mendarat dan mengirim sinyal sekitar 20 menit dari permukaan Venus.', 'Wahana mengukur suhu sekitar 475 °C di permukaan.', [-5, 351]),
    ev('ven-1975', 1975, 'Venera 9 (Uni Soviet)', 'Pendaratan', 'surface', 'Foto Pertama dari Permukaan Venus', 'Venera 9 mengirim foto hitam-putih pertama dari daratan planet lain.', 'Foto menunjukkan batuan pipih bersudut tajam di bawah langit yang suram.', [31.01, 291.64]),
    ev('ven-1990', 1990, 'Magellan (NASA)', 'Orbit', 'orbit', 'Peta Radar Permukaan Venus', 'Magellan memakai radar untuk menembus awan dan memetakan sekitar 98% permukaan.', 'Peta ini memperlihatkan dataran vulkanik luas dan ribuan gunung api.'),
  ],
  bumi: [
    ev('bum-1957', 1957, 'Sputnik 1 (Uni Soviet)', 'Orbit', 'orbit', 'Satelit Buatan Pertama', 'Sputnik 1 mengorbit Bumi dan memancarkan sinyal radio sederhana.', 'Peluncuran ini menandai dimulainya Era Antariksa.'),
    ev('bum-1961', 1961, 'Vostok 1 · Yuri Gagarin', 'Orbit', 'orbit', 'Manusia Pertama di Orbit', 'Yuri Gagarin mengelilingi Bumi satu kali dalam sekitar 108 menit.', 'Penerbangan ini membuktikan manusia dapat bertahan di luar angkasa.'),
    mem('bum-1967', 1967, '27 Januari 1967', 'Apollo 1 (NASA)', 'Kenangan: Awak Apollo 1',
      'Saat latihan peluncuran di landasan, api tiba-tiba muncul di dalam kabin. Ketiga astronaut gugur sebelum sempat keluar.',
      'Kabin berisi oksigen murni sehingga api menyebar sangat cepat, dan pintunya tidak bisa dibuka dengan cepat.',
      'Pesawat Apollo dirancang ulang: pintu yang bisa dibuka cepat, bahan yang sulit terbakar, dan udara kabin yang lebih aman saat di darat. Perbaikan ini ikut membawa manusia ke Bulan dua tahun kemudian.',
      ['Virgil "Gus" Grissom', 'Edward White', 'Roger Chaffee']),
    ev('bum-1968', 1968, 'Apollo 8 (NASA)', 'Pengamatan', 'observation', 'Foto "Earthrise"', 'Kru Apollo 8 memotret Bumi terbit di atas cakrawala Bulan.', 'Foto ini menjadi salah satu gambar paling berpengaruh tentang rapuhnya planet kita.'),
    mem('bum-1986', 1986, '28 Januari 1986', 'Pesawat ulang-alik Challenger (NASA)', 'Kenangan: Awak Challenger',
      'Pesawat ulang-alik Challenger hancur 73 detik setelah lepas landas. Ketujuh awaknya gugur, termasuk Christa McAuliffe, guru yang akan mengajar dari luar angkasa.',
      'Pagi itu sangat dingin. Cincin karet penyekat (O-ring) di roket pendorong menjadi kaku sehingga gas panas bocor. Para insinyur sebenarnya sudah memperingatkan bahaya suhu dingin.',
      'Penerbangan dihentikan lebih dari dua tahun untuk perbaikan. Pelajaran terpentingnya: peringatan soal keselamatan harus didengar, sekecil apa pun.',
      ['Dick Scobee', 'Michael J. Smith', 'Judith Resnik', 'Ellison Onizuka', 'Ronald McNair', 'Gregory Jarvis', 'Christa McAuliffe']),
    ev('bum-1990', 1990, 'Voyager 1 (NASA)', 'Pengamatan', 'observation', '"Pale Blue Dot"', 'Voyager 1 memotret Bumi sebagai titik kecil dari jarak sekitar 6 miliar km.', 'Foto ini diambil atas usul Carl Sagan.'),
    ev('bum-1998', 1998, 'Stasiun Antariksa Internasional', 'Orbit', 'orbit', 'Modul Pertama ISS Diluncurkan', 'Modul Zarya menjadi bagian pertama Stasiun Antariksa Internasional.', 'Sejak 2000, ISS dihuni manusia secara terus-menerus.'),
    mem('bum-2003', 2003, '1 Februari 2003', 'Pesawat ulang-alik Columbia (NASA)', 'Kenangan: Awak Columbia',
      'Saat pulang ke Bumi, 16 menit sebelum mendarat, pesawat ulang-alik Columbia pecah di langit Texas. Ketujuh awaknya gugur.',
      'Saat peluncuran, sebongkah busa isolasi dari tangki bahan bakar menghantam sayap kiri dan merusak pelindung panasnya. Ketika masuk atmosfer, udara yang sangat panas masuk ke dalam sayap.',
      'Sejak itu, pelindung panas pesawat ulang-alik diperiksa selama di orbit sebelum pulang. Masalah kecil yang sering terjadi tidak boleh dianggap biasa.',
      ['Rick Husband', 'William McCool', 'Michael Anderson', 'Kalpana Chawla', 'David Brown', 'Laurel Clark', 'Ilan Ramon']),
  ],
  bulan: [
    ev('bul-1959', 1959, 'Luna 2 (Uni Soviet)', 'Tumbukan', 'observation', 'Benda Buatan Pertama yang Mencapai Bulan', 'Luna 2 sengaja ditumbukkan ke permukaan Bulan.', 'Lokasi tumbukan tidak ditandai sebagai pendaratan.'),
    ev('bul-1966', 1966, 'Luna 9 (Uni Soviet)', 'Pendaratan', 'surface', 'Pendaratan Lunak Pertama di Bulan', 'Luna 9 mendarat di Oceanus Procellarum dan mengirim foto panorama.', 'Foto membuktikan permukaan Bulan cukup keras untuk didarati.', [7.08, 295.63]),
    ev('bul-1969', 1969, 'Apollo 11 (NASA)', 'Pendaratan', 'surface', 'Manusia Pertama Menginjak Bulan', 'Neil Armstrong dan Buzz Aldrin mendarat di Mare Tranquillitatis.', 'Mereka membawa pulang sekitar 21,5 kg sampel batuan.', [0.674, 23.473]),
    ev('bul-2019', 2019, "Chang'e 4 (Tiongkok)", 'Pendaratan', 'surface', 'Pendaratan Pertama di Sisi Jauh', "Chang'e 4 mendarat di kawah Von Kármán di sisi Bulan yang tak terlihat dari Bumi.", 'Komunikasi dilakukan lewat satelit relai Queqiao.', [-45.44, 177.6]),
    ev('bul-2023', 2023, 'Chandrayaan-3 (India)', 'Pendaratan', 'surface', 'Pendaratan Dekat Kutub Selatan', 'Chandrayaan-3 mendarat di wilayah kutub selatan Bulan.', 'Wahana penjelajah Pragyan menganalisis komposisi tanah di sekitarnya.', [-69.37, 32.32]),
  ],
  mars: [
    ev('mar-1610', 1610, 'Galileo Galilei', 'Pengamatan', 'observation', 'Pengamatan Teleskopik Pertama', 'Galileo mengamati Mars dengan teleskop sederhana dan mencatat bentuk piringannya.', 'Teleskopnya belum cukup kuat untuk melihat detail permukaan.'),
    ev('mar-1659', 1659, 'Christiaan Huygens', 'Pengamatan', 'observation', 'Sketsa Pertama Syrtis Major', 'Huygens menggambar fitur gelap di permukaan Mars dan memperkirakan rotasinya sekitar 24 jam.', 'Ini salah satu peta permukaan planet paling awal.'),
    ev('mar-1877', 1877, 'Asaph Hall', 'Penemuan', 'observation', 'Penemuan Phobos dan Deimos', 'Dua bulan kecil Mars ditemukan dengan teleskop refraktor di US Naval Observatory.', 'Keduanya kemungkinan asteroid yang tertangkap gravitasi Mars.'),
    ev('mar-1965', 1965, 'Mariner 4 (NASA)', 'Lintas terbang', 'flyby', 'Flyby Pertama dan Foto Jarak Dekat', 'Wahana pertama yang berhasil melintas dekat Mars, pada jarak terdekat 9.846 km dari permukaan.', 'Mengirim 21 foto hitam-putih yang memperlihatkan permukaan berkawah dan atmosfer sangat tipis — mematahkan anggapan lama tentang "kanal" buatan.'),
    ev('mar-1971', 1971, 'Mariner 9 (NASA)', 'Orbit', 'orbit', 'Wahana Pertama yang Mengorbit Planet Lain', 'Memetakan sebagian besar permukaan Mars, termasuk Olympus Mons dan Valles Marineris.', 'Saat tiba, Mars sedang diselimuti badai debu global.'),
    ev('mar-1976', 1976, 'Viking 1 Lander (NASA)', 'Pendaratan', 'surface', 'Foto Pertama dari Permukaan Mars', 'Mendarat di Chryse Planitia dan mengirim foto panorama dari daratan Mars.', 'Viking membawa eksperimen biologi pertama untuk mencari tanda kehidupan.', [22.27, 312.05]),
    ev('mar-1997', 1997, 'Mars Pathfinder & Sojourner', 'Pendaratan', 'surface', 'Rover Pertama di Mars', 'Sojourner menjelajahi Ares Vallis dan menganalisis komposisi batuan.', 'Pathfinder mendarat memakai kantong udara yang memantul.', [19.13, 326.78]),
    ev('mar-2012', 2012, 'Curiosity (NASA)', 'Pendaratan', 'surface', 'Mendarat di Kawah Gale', 'Rover menyelidiki apakah Mars pernah memiliki lingkungan yang layak bagi kehidupan mikroba.', 'Curiosity menemukan bukti danau purba di dasar Kawah Gale.', [-4.59, 137.44]),
    ev('mar-2021', 2021, 'Perseverance & Ingenuity', 'Pendaratan', 'surface', 'Eksplorasi Kawah Jezero', 'Perseverance mengumpulkan sampel batuan; Ingenuity melakukan terbang bertenaga pertama di planet lain.', 'Kawah Jezero diduga dulunya delta sungai.', [18.44, 77.45]),
  ],
  jupiter: [
    ev('jup-1610', 1610, 'Galileo Galilei', 'Penemuan', 'observation', 'Penemuan Empat Satelit Besar', 'Galileo menemukan Io, Europa, Ganymede, dan Callisto mengelilingi Jupiter.', 'Bukti bahwa tidak semua benda langit mengelilingi Bumi.'),
    ev('jup-1973', 1973, 'Pioneer 10 (NASA)', 'Lintas terbang', 'flyby', 'Lintas Terbang Pertama di Jupiter', 'Pioneer 10 melewati sabuk asteroid dan memotret Jupiter dari dekat.', 'Wahana ini kemudian menuju luar tata surya.'),
    ev('jup-1979', 1979, 'Voyager 1 (NASA)', 'Lintas terbang', 'flyby', 'Cincin Tipis dan Gunung Api di Io', 'Voyager 1 menemukan cincin tipis Jupiter dan gunung api aktif di Io.', 'Ini pertama kalinya vulkanisme aktif terlihat di luar Bumi.'),
    ev('jup-1995', 1995, 'Galileo (NASA)', 'Orbit', 'atmosphere', 'Pengorbit Pertama dan Probe Atmosfer', 'Wahana Galileo mengorbit Jupiter dan menjatuhkan probe ke dalam atmosfernya.', 'Probe tidak punya titik pendaratan karena Jupiter tidak memiliki permukaan padat.'),
    ev('jup-2016', 2016, 'Juno (NASA)', 'Orbit', 'orbit', 'Mengorbit Kutub Jupiter', 'Juno mempelajari struktur dalam, medan magnet, dan aurora Jupiter.', 'Juno memotret badai-badai siklon raksasa di kutub.'),
  ],
  saturnus: [
    ev('sat-1610', 1610, 'Galileo Galilei', 'Pengamatan', 'observation', '"Telinga" Saturnus', 'Galileo melihat tonjolan di kedua sisi Saturnus tanpa memahami bahwa itu cincin.', 'Teleskopnya belum cukup tajam.'),
    ev('sat-1655', 1655, 'Christiaan Huygens', 'Penemuan', 'observation', 'Penemuan Titan dan Penjelasan Cincin', 'Huygens menemukan Titan dan menjelaskan bahwa Saturnus dikelilingi cincin tipis.', 'Penjelasan cincin diterbitkan pada 1659.'),
    ev('sat-1979', 1979, 'Pioneer 11 (NASA)', 'Lintas terbang', 'flyby', 'Lintas Terbang Pertama di Saturnus', 'Pioneer 11 melintas di bawah bidang cincin Saturnus.', 'Data misi membantu merencanakan lintasan Voyager.'),
    ev('sat-2004', 2004, 'Cassini (NASA/ESA/ASI)', 'Orbit', 'orbit', 'Pengorbit Pertama Saturnus', 'Cassini mengorbit Saturnus selama 13 tahun.', 'Menemukan semburan air dari bulan Enceladus.'),
    ev('sat-2005', 2005, 'Huygens (ESA)', 'Pendaratan di satelit', 'moon', 'Pendaratan di Titan', 'Probe Huygens mendarat di Titan, satelit terbesar Saturnus.', 'Lokasinya di Titan, bukan di Saturnus, sehingga tidak ditandai pada planet.'),
    ev('sat-2017', 2017, 'Cassini Grand Finale', 'Atmosfer', 'atmosphere', 'Menukik ke Atmosfer Saturnus', 'Cassini sengaja diakhiri dengan menukik ke atmosfer Saturnus.', 'Tujuannya agar wahana tidak mencemari bulan-bulan yang mungkin layak huni.'),
  ],
  uranus: [
    ev('ura-1781', 1781, 'William Herschel', 'Penemuan', 'observation', 'Planet Pertama yang Ditemukan dengan Teleskop', 'Herschel awalnya mengira Uranus sebuah komet.', 'Penemuan ini memperluas batas tata surya yang dikenal.'),
    ev('ura-1977', 1977, 'Observatorium Udara Kuiper', 'Penemuan', 'observation', 'Penemuan Cincin Uranus', 'Cincin Uranus ditemukan saat planet melintas di depan sebuah bintang.', 'Cahaya bintang berkedip beberapa kali sebelum dan sesudah tertutup planet.'),
    ev('ura-1986', 1986, 'Voyager 2 (NASA)', 'Lintas terbang', 'flyby', 'Satu-Satunya Kunjungan Wahana', 'Voyager 2 melintasi Uranus dan menemukan 10 satelit baru.', 'Hingga kini belum ada wahana lain yang mengunjungi Uranus.'),
  ],
  neptunus: [
    ev('nep-1846a', 1846, 'Le Verrier & Galle', 'Penemuan', 'observation', 'Ditemukan Lewat Perhitungan Matematika', 'Posisi Neptunus diprediksi dari gangguan orbit Uranus, lalu diamati oleh Johann Galle.', 'Kemenangan besar mekanika langit Newton.'),
    ev('nep-1846b', 1846, 'William Lassell', 'Penemuan', 'observation', 'Penemuan Triton', 'Triton, satelit terbesar Neptunus, ditemukan beberapa minggu setelah Neptunus.', 'Triton mengorbit berlawanan arah rotasi Neptunus.'),
    ev('nep-1989', 1989, 'Voyager 2 (NASA)', 'Lintas terbang', 'flyby', 'Lintas Terbang dan Bintik Gelap Besar', 'Voyager 2 memotret badai Bintik Gelap Besar dan geiser nitrogen di Triton.', 'Satu-satunya wahana yang pernah mengunjungi Neptunus.'),
  ],
  io: [
    ev('io-1610', 1610, 'Galileo Galilei', 'Penemuan', 'observation', 'Penemuan Satelit Io', 'Galileo menemukan Io mengitari Jupiter dengan teleskop buatannya.', 'Membuktikan tidak semua benda langit berputar mengitari Bumi.'),
    ev('io-1979', 1979, 'Voyager 1 (NASA)', 'Lintas terbang', 'flyby', 'Letusan Vulkanik Gunung Api Pele', 'Voyager 1 memotret semburan gas dan belerang setinggi 300 km dari gunung api Pele.', 'Bukti pertama vulkanisme aktif di luar planet Bumi.'),
  ],
  europa: [
    ev('eur-1979', 1979, 'Voyager 2 (NASA)', 'Lintas terbang', 'flyby', 'Pemetaan Retakan Lineae Europa', 'Voyager 2 memotret jaringan fraktur garis kemerahan pada kerak es Europa.', 'Mengindikasikan adanya kerak es dinamis yang terapung di atas cairan.'),
    ev('eur-1997', 1997, 'Galileo (NASA)', 'Orbit', 'orbit', 'Deteksi Samudra Air Asin Cair Bawah Es', 'Pengorbit Galileo mendeteksi medan magnet induksi dari samudra air asin cair global.', 'Samudra Europa diperkirakan memiliki volume dua kali lipat seluruh lautan Bumi.'),
  ],
  ganymede: [
    ev('gan-1996', 1996, 'Galileo (NASA)', 'Orbit', 'orbit', 'Penemuan Medan Magnetik Intrinsik', 'Wahana Galileo mencatat Ganymede memiliki medan magnet internal dan magnetosfer sendiri.', 'Satu-satunya bulan di Tata Surya yang membangkitkan medan magnet dipol mandiri.'),
    ev('gan-2023', 2023, 'JUICE (ESA)', 'Peluncuran', 'orbit', 'Peluncuran Misi Penjelajah JUICE', 'Badan Antariksa Eropa meluncurkan wahana JUICE menuju orbit Ganymede.', 'Dirancang untuk meneliti kelayakhunian samudra bawah tanah Ganymede.'),
  ],
  callisto: [
    ev('cal-1979', 1979, 'Voyager 1 (NASA)', 'Lintas terbang', 'flyby', 'Pemetaan Cekungan Kawah Valhalla', 'Voyager 1 memotret kawah multiring raksasa Valhalla selebar 3.800 km.', 'Pola cincin konsentris dari tumbukan asteroid purba 4 miliar tahun lalu.'),
    ev('cal-1998', 1998, 'Galileo (NASA)', 'Orbit', 'orbit', 'Konfirmasi Kerak Fosil Purba', 'Wahana Galileo mengonfirmasi permukaan Callisto tidak pernah mengalami pembaharuan tektonik.', 'Menjadi fosil geologis Tata Surya paling utuh.'),
  ],
  titan: [
    ev('tit-1655', 1655, 'Christiaan Huygens', 'Penemuan', 'observation', 'Penemuan Satelit Berkabut Titan', 'Huygens menemukan satelit terbesar Saturnus yang berotasi setiap 16 hari.', 'Satu-satunya satelit di Tata Surya dengan atmosfer tebal.'),
    ev('tit-2005', 2005, 'Huygens (ESA)', 'Pendaratan', 'surface', 'Pendaratan Bersejarah Probe Huygens', 'Probe Huygens mendarat dengan parasut menembus awan tebal Titan ke hamparan kerikil es.', 'Pendaratan terjauh di Tata Surya luar, membuktikan adanya sungai dan danau metana.'),
    ev('tit-2007', 2007, 'Cassini (NASA/ESA)', 'Orbit', 'orbit', 'Pemetaan Lautan Metana Kraken Mare', 'Radar Cassini memetakan laut hidrokarbon cair Kraken Mare seluas 400.000 km².', 'Menyingkap siklus hidrologis berbasis metana cair yang mirip dengan air di Bumi.'),
  ],
};

export const HISTORY_BODIES = ['merkurius', 'venus', 'bumi', 'bulan', 'mars', 'jupiter', 'saturnus', 'uranus', 'neptunus', 'io', 'europa', 'ganymede', 'callisto', 'titan'];
export const LOCATION_LABEL = { surface: 'Permukaan', flyby: 'Lintas terbang', orbit: 'Orbit', observation: 'Pengamatan', atmosphere: 'Atmosfer', moon: 'Di satelit', memorial: 'Kenangan' };
