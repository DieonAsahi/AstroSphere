// Kuis per planet (PRD §11.2): 3 soal × 50 poin, maksimum 150 per planet.
// Hadiah = maks(0, skor baru − skor terbaik). Jawaban salah tidak mengurangi poin.
export const QUIZ_VERSION = '1.0';
export const POINTS_PER_QUESTION = 50;

const q = (text, options, answer, explanation) => ({ text, options, answer, explanation });

export const QUIZ = {
  merkurius: { topic: 'Planet terdekat dari Matahari', questions: [
    q('Mengapa Merkurius sangat panas di siang hari tetapi sangat dingin di malam hari?', ['Hampir tidak memiliki atmosfer untuk menahan panas', 'Letaknya paling jauh dari Matahari', 'Berotasi sangat cepat', 'Permukaannya tertutup es'], 0,
      'Tanpa atmosfer berarti, panas Matahari langsung lepas kembali ke luar angkasa saat malam. Suhu bisa berkisar dari sekitar 430 °C hingga −180 °C.'),
    q('Berapa lama Merkurius mengelilingi Matahari (satu revolusi)?', ['Sekitar 88 hari', 'Sekitar 225 hari', 'Sekitar 365 hari', 'Sekitar 687 hari'], 0,
      'Periode orbit Merkurius 0,241 tahun atau sekitar 88 hari — tercepat di antara semua planet.'),
    q('Wahana apa yang pertama kali mengorbit Merkurius?', ['MESSENGER', 'Voyager 1', 'Cassini', 'Juno'], 0,
      'MESSENGER (NASA) mengorbit Merkurius sejak 2011 dan memetakan seluruh permukaannya.'),
  ] },
  venus: { topic: 'Planet terpanas dan atmosfernya', questions: [
    q('Mengapa Venus menjadi planet terpanas, padahal Merkurius lebih dekat ke Matahari?', ['Efek rumah kaca dari atmosfer karbon dioksida yang sangat tebal', 'Inti Venus jauh lebih panas', 'Venus sama sekali tidak berotasi', 'Venus memantulkan sangat sedikit cahaya'], 0,
      'Atmosfer CO₂ yang sangat tebal memerangkap panas sehingga suhu permukaan sekitar 465 °C, siang maupun malam.'),
    q('Ke arah mana Venus berotasi dibandingkan kebanyakan planet?', ['Berlawanan arah (retrograd)', 'Searah, tetapi lebih cepat', 'Tidak berotasi', 'Bergantian setiap tahun'], 0,
      'Sumbu Venus miring sekitar 177°, sehingga rotasinya terlihat berlawanan arah. Satu rotasinya juga sangat lambat: 243 hari.'),
    q('Wahana apa yang pertama kali mengirim foto dari permukaan Venus?', ['Venera 9', 'Mariner 2', 'Magellan', 'Pioneer 10'], 0,
      'Venera 9 milik Uni Soviet mengirim foto permukaan Venus pada 1975.'),
  ] },
  bumi: { topic: 'Rotasi, revolusi & musim', questions: [
    q('Berapa lama Bumi menyelesaikan satu rotasi sideris pada sumbunya?', ['Tepat 24 jam', 'Sekitar 23 jam 56 menit', 'Sekitar 365 hari', 'Sekitar 12 jam'], 1,
      'Rotasi sideris Bumi 0,997 hari ≈ 23 jam 56 menit. Hari matahari (24 jam) sedikit lebih panjang karena Bumi juga bergerak di orbitnya.'),
    q('Mengapa Bumi mengalami pergantian musim?', ['Jarak Bumi ke Matahari berubah sangat jauh', 'Sumbu rotasi Bumi miring sekitar 23,4° terhadap bidang orbit', 'Kecepatan rotasi Bumi berubah sepanjang tahun', 'Bulan menutupi sebagian cahaya Matahari'], 1,
      'Karena sumbu miring, belahan utara dan selatan bergantian lebih condong ke Matahari selama revolusi. Sudut datang cahaya dan lama siang berubah.'),
    q('Apa yang menyebabkan terjadinya siang dan malam?', ['Revolusi Bumi mengelilingi Matahari', 'Rotasi Bumi pada sumbunya', 'Perubahan jarak Bumi–Matahari', 'Gerhana Matahari'], 1,
      'Rotasi membuat setiap tempat di Bumi bergantian menghadap dan membelakangi Matahari.'),
  ] },
  mars: { topic: 'Geologi & atmosfer', questions: [
    q('Apa yang membuat permukaan Mars berwarna kemerahan?', ['Debu dan batuan yang mengandung oksida besi', 'Lava pijar yang masih mengalir', 'Pantulan cahaya Matahari yang merah', 'Tumbuhan berwarna merah'], 0,
      'Mineral besi di batuan Mars teroksidasi — mirip karat — sehingga debunya berwarna jingga kemerahan.'),
    q('Gunung api terbesar di tata surya berada di Mars. Apa namanya?', ['Olympus Mons', 'Valles Marineris', 'Mauna Kea', 'Kawah Gale'], 0,
      'Olympus Mons tingginya sekitar 22 km, hampir 2,5 kali Gunung Everest. Valles Marineris adalah ngarai, bukan gunung.'),
    q('Berapa satelit alami yang dimiliki Mars?', ['Tidak ada', 'Satu', 'Dua: Phobos dan Deimos', 'Empat'], 2,
      'Mars memiliki dua satelit kecil, Phobos dan Deimos, yang ditemukan Asaph Hall pada 1877.'),
  ] },
  jupiter: { topic: 'Raksasa gas & satelitnya', questions: [
    q('Apa itu Bintik Merah Besar di Jupiter?', ['Badai raksasa yang bertahan ratusan tahun', 'Gunung api aktif', 'Danau metana', 'Bayangan salah satu bulannya'], 0,
      'Bintik Merah Besar adalah badai antisiklon yang lebih lebar dari Bumi dan sudah teramati sejak abad ke-19 atau lebih awal.'),
    q('Siapa yang menemukan empat satelit besar Jupiter pada 1610?', ['Isaac Newton', 'Galileo Galilei', 'Johannes Kepler', 'Nicolaus Copernicus'], 1,
      'Galileo menemukan Io, Europa, Ganymede, dan Callisto — kini disebut satelit Galilean.'),
    q('Jupiter tergolong planet jenis apa?', ['Planet kebumian (batuan)', 'Planet kerdil', 'Raksasa gas', 'Satelit alami'], 2,
      'Jupiter sebagian besar tersusun dari hidrogen dan helium, tanpa permukaan padat.'),
  ] },
  saturnus: { topic: 'Cincin & Titan', questions: [
    q('Cincin Saturnus terutama tersusun dari apa?', ['Gas panas', 'Bongkahan es dan batuan', 'Logam cair', 'Cahaya pantulan atmosfer'], 1,
      'Cincin Saturnus berisi miliaran partikel es air dan batuan, dari sebesar butir debu hingga sebesar rumah.'),
    q('Wahana apa yang mengorbit Saturnus selama 13 tahun (2004–2017)?', ['Juno', 'Voyager 2', 'Cassini', 'Galileo'], 2,
      'Cassini mengorbit Saturnus dari 2004 hingga 2017 dan mengakhiri misinya dengan menukik ke atmosfer planet.'),
    q('Satelit terbesar Saturnus yang memiliki atmosfer tebal adalah …', ['Titan', 'Europa', 'Ganymede', 'Triton'], 0,
      'Titan memiliki atmosfer nitrogen tebal serta danau metana dan etana cair.'),
  ] },
  uranus: { topic: 'Raksasa es yang berguling', questions: [
    q('Apa keunikan sumbu rotasi Uranus?', ['Tegak lurus sempurna', 'Miring hampir 98° sehingga seperti berguling', 'Berubah arah setiap hari', 'Uranus tidak berotasi'], 1,
      'Kemiringan sumbu Uranus 97,77°, sehingga kutubnya bergantian menghadap Matahari selama orbit 84 tahun.'),
    q('Siapa yang menemukan Uranus pada 1781?', ['William Herschel', 'Galileo Galilei', 'Urbain Le Verrier', 'Christiaan Huygens'], 0,
      'Uranus adalah planet pertama yang ditemukan dengan teleskop, oleh William Herschel.'),
    q('Wahana apa yang pernah melintas dekat Uranus?', ['Cassini', 'Juno', 'Voyager 2', 'New Horizons'], 2,
      'Voyager 2 melintasi Uranus pada 1986 dan hingga kini menjadi satu-satunya wahana yang mengunjunginya.'),
  ] },
  neptunus: { topic: 'Planet terjauh', questions: [
    q('Bagaimana Neptunus ditemukan pada 1846?', ['Terlihat dengan mata telanjang', 'Diprediksi lewat perhitungan dari gangguan orbit Uranus', 'Difoto oleh Voyager 2', 'Ditemukan Teleskop Hubble'], 1,
      'Urbain Le Verrier menghitung posisinya dari penyimpangan orbit Uranus, lalu Johann Galle menemukannya lewat teleskop.'),
    q('Berapa lama Neptunus mengelilingi Matahari?', ['Sekitar 12 tahun', 'Sekitar 29 tahun', 'Sekitar 84 tahun', 'Sekitar 165 tahun'], 3,
      'Periode orbit Neptunus 164,79 tahun. Sejak ditemukan, Neptunus baru menyelesaikan satu orbit pada 2011.'),
    q('Mengapa Neptunus terlihat biru?', ['Metana di atmosfernya menyerap cahaya merah', 'Permukaannya tertutup samudra', 'Pantulan cahaya dari Uranus', 'Tertutup es air murni'], 0,
      'Gas metana menyerap cahaya merah dan memantulkan cahaya biru.'),
  ] },
};
