// Materi belajar berbentuk permainan.
// 1) PREDICT — "Tebak dulu": sebelum fenomena diputar pemain menebak, lalu mengamati simulasi, lalu membaca penjelasan
//    (pola prediksi → amati → jelaskan). Kunci = id planet di data/phenomena.js, atau 'gerhana-matahari' / 'gerhana-bulan'.
//    Penjelasan planet memakai PHENOMENA[id].short; gerhana memakai `why` di sini.
// 2) MYTHS — "Mitos atau Fakta?": pernyataan populer tentang tata surya, banyak di antaranya miskonsepsi yang umum.
//    Tiap pernyataan terkait satu benda (MYTH_BODY di bawah) dan baru muncul setelah benda itu ditemukan.
// Hadiah hanya sekali per butir (tebakan benar pertama / pernyataan pertama kali dijawab benar), jadi tidak bisa "digiling".
export const PREDICT_REWARD = 10;
export const MYTH_REWARD = 10;
export const MYTH_ROUND = 6;

export const PREDICT = {
  merkurius: { q: 'Di Merkurius, mana yang lebih lama?', opts: ['Satu hari (dari siang ke siang lagi)', 'Satu tahun', 'Sama panjang'], a: 0 },
  venus: { q: 'Di Venus, Matahari terbit dari arah mana?', opts: ['Timur, seperti di Bumi', 'Barat', 'Tidak pernah terbit'], a: 1 },
  mars: { q: 'Apakah Mars punya musim seperti Bumi?', opts: ['Ya, karena sumbunya miring', 'Tidak, Mars tidak punya musim', 'Hanya musim dingin sepanjang tahun'], a: 0 },
  jupiter: { q: 'Jupiter planet terbesar. Berapa lama sehari di sana?', opts: ['Kurang dari 10 jam', 'Sekitar 24 jam', 'Lebih dari 100 jam'], a: 0 },
  saturnus: { q: 'Kenapa cincin Saturnus kadang seperti menghilang?', opts: ['Cincinnya hancur lalu terbentuk lagi', 'Kita melihatnya tepat dari samping', 'Tertutup awan Saturnus'], a: 1 },
  uranus: { q: 'Seberapa miring sumbu Uranus?', opts: ['Hampir tegak', 'Miring seperti Bumi', 'Hampir rebah'], a: 2 },
  neptunus: { q: 'Sejak ditemukan tahun 1846, berapa kali Neptunus mengelilingi Matahari?', opts: ['Baru sekali', 'Sekitar 10 kali', 'Lebih dari 100 kali'], a: 0 },
  'gerhana-matahari': {
    q: 'Bulan jauh lebih kecil dari Matahari. Bisakah Bulan menutupinya penuh?',
    opts: ['Tidak mungkin', 'Bisa, karena Matahari jauh lebih jauh', 'Bisa, karena Bulan lebih dekat ke Matahari'], a: 1,
    why: 'Matahari sekitar 400 kali lebih lebar dari Bulan, tapi juga sekitar 400 kali lebih jauh. Dari Bumi keduanya tampak hampir sama besar, jadi Bulan bisa menutup Matahari.',
  },
  'gerhana-bulan': {
    q: 'Saat gerhana Bulan total, Bulan akan tampak…',
    opts: ['Hilang, gelap total', 'Merah tembaga', 'Tetap putih terang'], a: 1,
    why: 'Cahaya Matahari menembus atmosfer Bumi. Biru dihamburkan, merah dibelokkan sampai ke Bulan — seperti semua matahari terbenam di Bumi terlihat sekaligus.',
  },
};

// fact: true = Fakta, false = Mitos
export const MYTHS = [
  { id: 'musim-jarak', s: 'Musim terjadi karena Bumi kadang lebih dekat ke Matahari.', fact: false, why: 'Bumi justru paling dekat ke Matahari pada awal Januari. Musim terjadi karena sumbu Bumi miring 23,4°.', src: 'NASA Space Place' },
  { id: 'planet-bintang', s: 'Planet selalu lebih besar daripada bintang.', fact: false, why: 'Matahari adalah bintang, dan lebarnya 109 kali Bumi. Bintang tampak kecil hanya karena letaknya sangat jauh.', src: 'NASA' },
  { id: 'es-merkurius', s: 'Merkurius, planet terdekat ke Matahari, menyimpan es.', fact: true, why: 'Es itu ada di dasar kawah dekat kutub yang tidak pernah terkena sinar Matahari.', src: 'NASA' },
  { id: 'merkurius-terpanas', s: 'Merkurius adalah planet terpanas karena paling dekat ke Matahari.', fact: false, why: 'Venus lebih panas, sekitar 465 °C. Atmosfernya yang tebal memerangkap panas seperti selimut.', src: 'NASA' },
  { id: 'senja-mars', s: 'Matahari terbenam di Mars berwarna biru.', fact: true, why: 'Debu halus di udara Mars meneruskan cahaya biru di sekitar Matahari saat senja.', src: 'NASA' },
  { id: 'bulan-menjauh', s: 'Bulan perlahan menjauhi Bumi.', fact: true, why: 'Sekitar 3,8 cm per tahun. Diukur dengan sinar laser yang dipantulkan cermin peninggalan astronaut Apollo.', src: 'NASA JPL' },
  { id: 'sisi-gelap', s: 'Sisi Bulan yang tidak pernah kita lihat selalu gelap.', fact: false, why: 'Sisi jauh Bulan juga mengalami siang dan malam. Kita tidak melihatnya karena Bulan berputar sekali setiap mengelilingi Bumi.', src: 'NASA' },
  { id: 'massa-matahari', s: 'Matahari memuat hampir seluruh massa tata surya.', fact: true, why: 'Sekitar 99,86%. Semua planet, bulan, dan asteroid digabung hanya sisanya.', src: 'NASA' },
  { id: 'cincin-saturnus', s: 'Hanya Saturnus yang punya cincin.', fact: false, why: 'Jupiter, Uranus, dan Neptunus juga bercincin, hanya lebih tipis dan gelap.', src: 'NASA' },
  { id: 'suara-angkasa', s: 'Ledakan di luar angkasa terdengar keras seperti di film.', fact: false, why: 'Suara butuh udara atau benda lain untuk merambat. Ruang angkasa hampir hampa, jadi sunyi.', src: 'NASA' },
  { id: 'venus-putar', s: 'Venus butuh waktu lebih lama untuk berputar sekali daripada untuk mengelilingi Matahari.', fact: true, why: 'Sekali berputar butuh 243 hari Bumi, sedangkan setahun Venus hanya 225 hari.', src: 'NASA' },
  { id: 'lihat-gerhana', s: 'Gerhana Matahari sebagian aman dilihat langsung karena Mataharinya tertutup.', fact: false, why: 'Sisa cahaya Matahari tetap bisa merusak mata. Pakai kacamata gerhana khusus atau proyeksi lubang jarum.', src: 'NASA' },
  { id: 'bulan-hilang', s: 'Saat gerhana Bulan total, Bulan hilang dari langit.', fact: false, why: 'Bulan tetap terlihat dan berwarna merah tembaga, karena cahaya Matahari dibelokkan atmosfer Bumi.', src: 'NASA' },
  { id: 'angin-neptunus', s: 'Angin tercepat di tata surya bertiup di Neptunus.', fact: true, why: 'Lebih dari 2.000 km/jam, padahal Neptunus paling jauh dan paling sedikit menerima cahaya Matahari.', src: 'NASA' },
  { id: 'pluto', s: 'Pluto masih digolongkan sebagai planet.', fact: false, why: 'Sejak 2006 Pluto disebut planet kerdil, karena lintasannya masih dipenuhi banyak benda lain.', src: 'IAU' },
  { id: 'bintang-jatuh', s: 'Bintang jatuh adalah bintang yang benar-benar jatuh.', fact: false, why: 'Itu meteor: butiran batu atau debu kecil yang terbakar saat masuk atmosfer Bumi.', src: 'NASA' },
  { id: 'jupiter-hari', s: 'Sehari di Jupiter kurang dari 10 jam.', fact: true, why: 'Tepatnya 9 jam 56 menit. Jupiter berputar paling cepat, sampai bentuknya agak gepeng.', src: 'NASA' },
  { id: 'gravitasi-bulan', s: 'Di Bulan tidak ada gravitasi, makanya astronaut melayang.', fact: false, why: 'Gravitasi Bulan sekitar 1/6 gravitasi Bumi. Astronaut bisa melompat tinggi, tapi tetap jatuh kembali.', src: 'NASA' },
  { id: 'uranus-rebah', s: 'Uranus berputar dalam posisi hampir rebah.', fact: true, why: 'Sumbunya miring 98°, sehingga kutubnya bergantian menghadap Matahari selama sekitar 42 tahun.', src: 'NASA' },
  { id: 'cahaya-8menit', s: 'Cahaya Matahari yang kita lihat berangkat sekitar 8 menit yang lalu.', fact: true, why: 'Jaraknya sekitar 150 juta km. Cahaya butuh sekitar 8 menit 20 detik untuk sampai ke Bumi.', src: 'NASA' },
  { id: 'saturnus-padat', s: 'Saturnus kurang padat dibanding air.', fact: true, why: 'Kepadatan rata-ratanya 0,69 g/cm³, lebih rendah dari air. Saturnus planet yang paling tidak padat.', src: 'NASA' },
  { id: 'matahari-kuning', s: 'Matahari berwarna kuning.', fact: false, why: 'Cahaya Matahari sebenarnya putih. Atmosfer Bumi menghamburkan warna biru, sehingga dari permukaan Bumi Matahari tampak kekuningan.', src: 'NASA' },
  { id: 'cincin-matahari', s: 'Cincin pelangi di sekeliling Matahari (halo) terbentuk di dekat Matahari.', fact: false, why: 'Halo terbentuk di langit Bumi: kristal es di awan tinggi yang tipis membelokkan cahaya Matahari sekitar 22°.', src: 'NASA' },
  { id: 'korona-panas', s: 'Lapisan luar Matahari (korona) lebih panas daripada permukaannya.', fact: true, why: 'Permukaan sekitar 5.500 °C, korona lebih dari 1 juta °C. Penyebabnya masih diteliti ilmuwan.', src: 'NASA' },
];
// Pernyataan baru terbuka setelah benda terkaitnya ditemukan (menjelajah dulu, baru bermain).
const MYTH_BODY = {
  'musim-jarak': 'bumi', 'planet-bintang': 'matahari', 'es-merkurius': 'merkurius', 'merkurius-terpanas': 'merkurius', 'senja-mars': 'mars',
  'bulan-menjauh': 'bulan', 'sisi-gelap': 'bulan', 'massa-matahari': 'matahari', 'cincin-saturnus': 'saturnus', 'suara-angkasa': 'bumi',
  'venus-putar': 'venus', 'lihat-gerhana': 'matahari', 'bulan-hilang': 'bulan', 'angin-neptunus': 'neptunus', pluto: 'neptunus',
  'bintang-jatuh': 'bumi', 'jupiter-hari': 'jupiter', 'gravitasi-bulan': 'bulan', 'uranus-rebah': 'uranus', 'cahaya-8menit': 'matahari',
  'saturnus-padat': 'saturnus', 'matahari-kuning': 'matahari', 'cincin-matahari': 'matahari', 'korona-panas': 'matahari',
};
for (const m of MYTHS) m.body = MYTH_BODY[m.id] || 'bumi';
export const MYTH_IDS = new Set(MYTHS.map((m) => m.id));

// 4) Halaman Matahari: topik yang jarang diketahui (dibuka satu per satu seperti akordeon).
//    art: ilustrasi kecil di kartu ('halo' | 'cincin'); lab: tombol ke laboratorium gerhana.
export const SUN_TOPICS = [
  { id: 'halo', title: 'Cincin Matahari (halo 22°)', art: 'halo',
    t: 'Lingkaran pucat berwarna pelangi di sekeliling Matahari. Cincin ini tidak ada di Matahari, tetapi di langit Bumi: jutaan kristal es berbentuk segi enam di awan tinggi yang tipis membelokkan cahaya Matahari sekitar 22°. Fenomena ini beberapa kali viral di kota-kota Indonesia dan tidak berbahaya — tapi jangan menatap Matahari langsung.' },
  { id: 'cincin', title: 'Gerhana cincin ("cincin api")', art: 'cincin', lab: true,
    t: 'Lintasan Bulan berbentuk lonjong. Saat berada di titik terjauh, Bulan tampak sedikit lebih kecil dari Matahari, sehingga tepi Matahari tetap bersinar seperti cincin api. Indonesia pernah dilintasi gerhana cincin pada 26 Desember 2019, antara lain di Riau dan Kalimantan Barat.' },
  { id: 'korona', title: 'Korona yang lebih panas', t: 'Permukaan Matahari sekitar 5.500 °C, tetapi korona di atasnya lebih dari 1 juta °C. Kenapa lapisan yang lebih jauh justru lebih panas masih menjadi misteri. Wahana Parker Solar Probe menembus korona untuk menelitinya — dan menjadi benda buatan manusia tercepat, sekitar 690.000 km/jam (Desember 2024).' },
  { id: 'bintik', title: 'Bintik Matahari', t: 'Bercak gelap ini sekitar 1.500–2.000 °C lebih dingin dari sekitarnya, karena medan magnet yang kuat menghambat aliran panas. Jumlahnya naik-turun dalam siklus sekitar 11 tahun.' },
  { id: 'badai', title: 'Badai Matahari', t: 'Ledakan besar di Matahari bisa melontarkan miliaran ton gas bermuatan. Jika mengenai Bumi, satelit, GPS, dan jaringan listrik bisa terganggu. Februari 2022, sekitar 38 satelit Starlink jatuh kembali ke Bumi setelah badai geomagnetik. Sisi indahnya: aurora.' },
  { id: 'rotasi', title: 'Berputar tidak serempak', t: 'Matahari bukan benda padat. Bagian khatulistiwanya berputar sekali sekitar 25 hari, sedangkan bagian dekat kutub sekitar 35 hari.' },
];

// 3) FACTS — kartu "Tahukah kamu?" per benda langit, terbuka di Jurnal setelah benda itu ditemukan.
//    h = judul singkat yang mengejutkan (angka/frasa), t = satu kalimat penjelasan.
export const CARD_REWARD = 5;
export const FACTS = {
  matahari: [
    { h: '99,86%', t: 'Bagian massa tata surya yang dimiliki Matahari. Semua planet digabung hanya sisa sedikit.', src: 'NASA' },
    { h: '1,3 juta Bumi', t: 'Kira-kira sebanyak itu Bumi yang muat di dalam Matahari.', src: 'NASA' },
    { h: '8 menit 20 detik', t: 'Waktu cahaya Matahari sampai ke Bumi. Matahari yang kamu lihat adalah Matahari 8 menit yang lalu.', src: 'NASA' },
  ],
  merkurius: [
    { h: 'Menyimpan es', t: 'Di kawah dekat kutubnya yang tidak pernah terkena sinar Matahari, tersimpan es air.', src: 'NASA' },
    { h: '430 °C dan −180 °C', t: 'Siangnya sangat panas, malamnya sangat dingin, karena hampir tidak ada atmosfer yang menyimpan panas.', src: 'NASA' },
    { h: '88 hari', t: 'Lama setahun di Merkurius — tercepat di antara semua planet.', src: 'NASA' },
  ],
  venus: [
    { h: '465 °C', t: 'Venus planet terpanas, lebih panas dari Merkurius, karena atmosfernya memerangkap panas.', src: 'NASA' },
    { h: 'Terbit di barat', t: 'Venus berputar terbalik, jadi Matahari terbit di barat dan terbenam di timur.', src: 'NASA' },
    { h: '90 kali tekanan Bumi', t: 'Tekanan udara di permukaan Venus setara menyelam hampir 1 km di bawah laut.', src: 'NASA' },
  ],
  bumi: [
    { h: 'Agak gepeng', t: 'Lebar Bumi di khatulistiwa 43 km lebih besar daripada jarak kutub ke kutub.', src: 'NASA' },
    { h: '107.000 km/jam', t: 'Kecepatan Bumi mengelilingi Matahari. Kita tidak merasakannya karena semuanya ikut bergerak.', src: 'NASA' },
    { h: 'Terdekat di bulan Januari', t: 'Bumi paling dekat ke Matahari pada awal Januari. Musim terjadi karena sumbu Bumi miring, bukan karena jarak.', src: 'NASA Space Place' },
  ],
  mars: [
    { h: 'Senja berwarna biru', t: 'Debu halus di udara Mars meneruskan cahaya biru di sekitar Matahari saat terbenam.', src: 'NASA' },
    { h: '2,5 kali Everest', t: 'Olympus Mons di Mars adalah gunung berapi tertinggi di tata surya.', src: 'NASA' },
    { h: 'Merah karena karat', t: 'Tanah Mars mengandung besi yang teroksidasi, mirip karat.', src: 'NASA' },
  ],
  jupiter: [
    { h: '1.300 Bumi', t: 'Kira-kira sebanyak itu Bumi yang muat di dalam Jupiter.', src: 'NASA' },
    { h: 'Badai ratusan tahun', t: 'Bintik Merah Raksasa adalah badai yang lebih lebar dari Bumi dan sudah berlangsung ratusan tahun.', src: 'NASA' },
    { h: '9 jam 56 menit', t: 'Lama sehari di Jupiter — paling singkat di tata surya.', src: 'NASA' },
  ],
  saturnus: [
    { h: 'Kurang padat dari air', t: 'Saturnus planet yang paling tidak padat. Kepadatan rata-ratanya lebih rendah dari air.', src: 'NASA' },
    { h: 'Setebal 10 meter', t: 'Cincinnya selebar ratusan ribu km, tapi di banyak bagian tebalnya hanya sekitar 10 meter.', src: 'NASA' },
    { h: 'Es dan batu', t: 'Cincin Saturnus tersusun dari bongkah es dan batu, dari sekecil debu sampai sebesar rumah.', src: 'NASA' },
  ],
  uranus: [
    { h: 'Miring 98°', t: 'Uranus seperti berguling di orbitnya. Kutubnya bergantian disinari Matahari selama sekitar 42 tahun.', src: 'NASA' },
    { h: 'Bau telur busuk', t: 'Awan Uranus mengandung hidrogen sulfida, gas yang baunya seperti telur busuk.', src: 'NASA' },
    { h: 'Tahun 1781', t: 'Uranus planet pertama yang ditemukan dengan teleskop, oleh William Herschel.', src: 'NASA' },
  ],
  neptunus: [
    { h: '2.000 km/jam', t: 'Angin tercepat di tata surya bertiup di Neptunus, padahal letaknya paling jauh dari Matahari.', src: 'NASA' },
    { h: 'Ditemukan dengan hitungan', t: 'Gerak Uranus yang "aneh" membuat ilmuwan menghitung letak planet lain. Neptunus ditemukan di sana pada 1846.', src: 'NASA' },
    { h: '165 tahun', t: 'Lama setahun di Neptunus. Sejak ditemukan, ia baru sekali mengelilingi Matahari, tepat pada 2011.', src: 'NASA' },
  ],
  bulan: [
    { h: '3,8 cm per tahun', t: 'Bulan perlahan menjauhi Bumi. Diukur dengan laser yang dipantulkan cermin peninggalan astronaut Apollo.', src: 'NASA JPL' },
    { h: 'Wajah yang sama', t: 'Bulan berputar sekali setiap mengelilingi Bumi, jadi kita selalu melihat sisi yang sama.', src: 'NASA' },
    { h: 'Jejak jutaan tahun', t: 'Tanpa angin dan hujan, jejak kaki astronaut di Bulan bisa bertahan jutaan tahun.', src: 'NASA' },
  ],
  io: [
    { h: 'Ratusan gunung api', t: 'Io adalah tempat dengan gunung api paling aktif di tata surya.', src: 'NASA' },
    { h: 'Diremas Jupiter', t: 'Tarikan gravitasi Jupiter terus meremas Io, sehingga bagian dalamnya sangat panas.', src: 'NASA' },
  ],
  europa: [
    { h: 'Lautan di bawah es', t: 'Di bawah kerak es Europa ada lautan air asin, diperkirakan berisi air dua kali lebih banyak dari semua lautan di Bumi.', src: 'NASA' },
    { h: 'Dicari tanda kehidupan', t: 'Wahana Europa Clipper diluncurkan tahun 2024 untuk menyelidiki apakah Europa bisa mendukung kehidupan.', src: 'NASA' },
  ],
  ganymede: [
    { h: 'Lebih besar dari Merkurius', t: 'Ganymede satelit terbesar di tata surya, bahkan lebih lebar dari planet Merkurius.', src: 'NASA' },
    { h: 'Punya aurora', t: 'Satu-satunya satelit yang diketahui punya medan magnet sendiri, sehingga ada auroranya.', src: 'NASA' },
  ],
  callisto: [
    { h: 'Penuh kawah', t: 'Permukaan Callisto termasuk yang paling banyak kawahnya di tata surya, hampir tak berubah selama miliaran tahun.', src: 'NASA' },
    { h: 'Hampir sebesar Merkurius', t: 'Lebarnya 4.821 km, hanya sedikit lebih kecil dari Merkurius (4.879 km).', src: 'NASA' },
  ],
  titan: [
    { h: 'Hujan metana', t: 'Titan punya hujan, sungai, dan danau — tapi isinya metana cair, bukan air.', src: 'NASA' },
    { h: 'Atmosfer tebal', t: 'Satu-satunya satelit dengan atmosfer tebal; tekanannya sekitar 1,5 kali tekanan udara di Bumi.', src: 'NASA' },
  ],
  sabuk: [
    { h: 'Tidak sepadat di film', t: 'Jarak antarasteroid rata-rata ratusan ribu km. Wahana antariksa melintasinya dengan aman.', src: 'NASA' },
    { h: 'Lebih ringan dari Bulan', t: 'Semua asteroid di sabuk utama digabung masih lebih ringan dari Bulan kita.', src: 'NASA' },
    { h: 'Ceres', t: 'Benda terbesar di sabuk asteroid adalah planet kerdil Ceres, lebarnya sekitar 940 km.', src: 'NASA' },
  ],
};
