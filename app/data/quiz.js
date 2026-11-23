// Kuis per planet (PRD §11.2): 4 soal × 50 poin, maksimum 200 per planet.
// Hadiah = maks(0, skor baru − skor terbaik). Jawaban salah tidak mengurangi poin.
export const QUIZ_VERSION = '1.0';
export const POINTS_PER_QUESTION = 50;

const q = (text, options, answer, explanation) => ({ text, options, answer, explanation });

export const QUIZ = {
  merkurius: {
    topic: 'Planet Terdekat & Geologi Ekstrem',
    questions: [
      q('Apa nama cekungan kawah tumbukan raksasa berdiameter 1.550 km yang berada di permukaan Merkurius?',
        ['Kawah Jezero', 'Cekungan Caloris (Caloris Basin)', 'Kawah Gale', 'Kawah Chicxulub'], 1,
        'Cekungan Caloris adalah kawah tumbukan terbesar di Merkurius selebar 1.550 km yang dikelilingi pegunungan cincin setinggi 2 km.'),
      q('Mengapa di permukaan Merkurius banyak ditemukan tebing patahan tinggi seperti Enterprise Rupes?',
        ['Karena kikisan air sungai deras', 'Karena inti besi raksasanya mendingin sehingga kerak planet menyusut dan mengerut', 'Karena tarikan cincin es', 'Karena badai angin amonia'], 1,
        'Saat inti besi Merkurius perlahan mendingin, ukuran planet menyusut sekitar 14 km dan membuat kerak batuannya terlipat menjadi tebing tinggi.'),
      q('Meskipun siang hari di Merkurius mencapai 430°C, di bagian manakah wahana MESSENGER menemukan cadangan es air murni?',
        ['Di puncak gunung berapi khatulistiwa', 'Di dasar kawah kutub yang gelap abadi dan tidak pernah terkena sinar Matahari', 'Di lapisan awan atas', 'Di lembah lava panas'], 1,
        'Karena kemiringan poros Merkurius hampir 0°, dasar kawah dalam di kutub utaranya seperti Kawah Prokofiev selalu berada dalam bayangan abadi bersuhu -180°C.'),
      q('Mengapa suhu permukaan Merkurius berubah sangat ekstrem antara siang (430°C) dan malam (-180°C)?',
        ['Karena Merkurius tidak memiliki atmosfer tebal untuk menahan panas', 'Karena jaraknya paling jauh dari Matahari', 'Karena tertutup samudra cair', 'Karena berputar terlalu cepat'], 0,
        'Tanpa selimut atmosfer tebal, panas sinar Matahari di siang hari langsung terlepas kembali ke ruang hampa saat malam tiba.')
    ]
  },
  venus: {
    topic: 'Atmosfer Ekstrem & Rotasi Retrograd',
    questions: [
      q('Apa keunikan puncak Pegunungan Maxwell Montes setinggi 11 km di planet Venus menurut pengamatan radar?',
        ['Tertutup es air biasa', "Dilapisi 'salju logam' mengilap dari timbal sulfida dan bismut sulfida", 'Ditumbuhi lumut hijau', 'Berisi danau air tawar'], 1,
        'Di ketinggian 11 km pada Maxwell Montes, uap timbal sulfida dan bismut mengembun menjadi lapisan salju logam yang memantulkan gelombang radar dengan terang.'),
      q('Arah rotasi Venus berlawanan dengan mayoritas planet di Tata Surya (retrograde), yang menyebabkan...',
        ['Matahari tampak terbit dari arah barat dan terbenam di timur', 'Venus tidak pernah mengelilingi Matahari', 'Venus memiliki 10 bulan besar', 'Suhu Venus menjadi sangat dingin'], 0,
        'Rotasi retrograde (-5.832,5 jam) berarti Venus berputar searah jarum jam dari timur ke barat.'),
      q('Faktor utama yang membuat Venus menjadi planet terpanas di Tata Surya (465°C) adalah...',
        ['Jaraknya paling dekat ke Matahari', 'Efek rumah kaca ekstrem dari atmosfer karbon dioksida tebal dan awan asam sulfat', 'Gesekan cincin batu', 'Pantulan cahaya Bulan'], 1,
        'Atmosfer Venus terdiri atas 96,5% karbon dioksida bertekanan 90 bar yang mengurung panas Matahari secara ekstrem.'),
      q('Apa nama gunung berapi perisai tertinggi di Venus (8 km) yang menjadi bukti aktivitas vulkanik planet tersebut?',
        ['Olympus Mons', 'Maat Mons', 'Mauna Kea', 'Gunung Everest'], 1,
        'Maat Mons di wilayah Atla Regio menjulang setinggi 8 km dan merupakan gunung berapi tertinggi di permukaan Venus.')
    ]
  },
  bumi: {
    topic: 'Atmosfer, Samudra & Biosfer Bumi',
    questions: [
      q('Bagaimana fenomena cahaya aurora (seperti Aurora Borealis dan Australis) dapat terbentuk di langit kutub Bumi?',
        ['Akibat gesekan awan badai petir di lapisan troposfer rendah', 'Akibat interaksi partikel bermuatan angin Matahari dengan medan magnetosfer dan gas atmosfer Bumi', 'Akibat pantulan sinar Bulan pada hamparan kristal es kutub', 'Akibat pembakaran gas metana yang menguap dari dasar samudra'], 1,
        'Medan magnetosfer Bumi membelokkan partikel bermuatan dari angin Matahari menuju wilayah kutub. Di lapisan atmosfer atas, partikel berenergi ini bertabrakan dengan atom oksigen dan nitrogen, memancarkan pendaran cahaya warna-warni yang memukau.'),
      q('Mengapa efek rumah kaca alami di atmosfer Bumi sangat penting bagi kelangsungan hidup di Bumi?',
        ['Mencegah seluruh radiasi sinar Matahari masuk ke permukaan Bumi', 'Menahan sebagian panas radiasi Matahari agar suhu rata-rata Bumi tetap hangat dan layak huni (sekitar 15°C)', 'Menghentikan siklus penguapan air di seluruh samudra', 'Membuat atmosfer Bumi kehilangan seluruh kandungan gas karbon dioksida'], 1,
        'Gas rumah kaca alami seperti uap air dan karbon dioksida memerangkap sebagian radiasi inframerah termal. Tanpa efek rumah kaca alami ini, suhu rata-rata permukaan Bumi akan anjlok hingga sekitar -18°C, membekukan seluruh perairan dan mematikan kehidupan.'),
      q('Berapa perkiraan persentase permukaan Bumi yang tertutup oleh air, dan berapa proporsi air asin di samudra dari total seluruh air tersebut?',
        ['Sekitar 30% tertutup air, dengan 50% di antaranya berupa air asin samudra', 'Sekitar 71% tertutup air, dengan sekitar 97% di antaranya berupa air asin samudra', 'Sekitar 50% tertutup air, dengan 10% di antaranya berupa air asin samudra', 'Sekitar 90% tertutup air, dengan seluruhnya berupa air tawar layak minum'], 1,
        'Sekitar 71% permukaan Bumi diselimuti perairan, dengan sekitar 97% tersimpan sebagai air asin di lautan dan samudra. Hanya sekitar 3% merupakan air tawar, yang sebagian besarnya terperangkap dalam gletser dan tudung es kutub.'),
      q('Faktor astronomis dan fisik utama apakah yang memungkinkan planet Bumi menopang keanekaragaman hayati (biosfer) dengan jutaan spesies kehidupan?',
        ['Karena Bumi memiliki cincin es pemantul radiasi kosmik', 'Letaknya di zona layak huni Matahari, memiliki air cair stabil, serta atmosfer beroksigen dan berpelindung ozon', 'Karena inti Bumi sepenuhnya berhenti berotasi sehingga tidak ada getaran tektonik', 'Karena Bumi tidak mengalami perubahan musim sepanjang tahun'], 1,
        'Bumi mengorbit di zona layak huni (Goldilocks zone) yang suhunya pas untuk mempertahankan air dalam wujud cair. Hal ini didukung oleh atmosfer pelindung kaya nitrogen dan oksigen, lapisan ozon penyaring radiasi ultraviolet berbahaya, serta siklus biogeokimia yang stabil.')
    ]
  },
  mars: {
    topic: 'Bentang Alam & Eksplorasi Rover',
    questions: [
      q('Apa nama gunung berapi perisai tertinggi di planet Mars sekaligus gunung tertinggi di seluruh Tata Surya (21,9 km)?',
        ['Maxwell Montes', 'Olympus Mons', 'Mauna Kea', 'Gunung Sharp'], 1,
        'Olympus Mons menjulang setinggi 21,9 km (hampir tiga kali tinggi Gunung Everest) dengan diameter kaki gunung mencapai 600 km.'),
      q('Sistem ngarai patahan tektonik raksasa di ekuator Mars yang membentang sepanjang 4.000 km dan sedalam 7 km adalah...',
        ['Grand Canyon', 'Valles Marineris', 'Palung Mariana', 'Ngarai Olduvai'], 1,
        'Valles Marineris membentang sepanjang 4.000 km (seperlima keliling Mars) akibat merekahnya kerak planet saat dataran vulkanik Tharsis terangkat.'),
      q('Mengapa gunung berapi Olympus Mons di Mars bisa tumbuh jauh lebih tinggi daripada gunung berapi di Bumi?',
        ['Karena lempeng kerak Mars diam (tidak bergerak), sehingga lava terus menumpuk di satu titik selama ratusan juta tahun', 'Karena Mars terbuat dari es murni', 'Karena ditarik oleh cincin Saturnus', 'Karena disiram hujan air setiap hari'], 0,
        'Tidak adanya pergerakan lempeng tektonik di Mars membuat titik panas magma terus memuntahkan lava di lokasi yang sama, didukung gravitasi Mars yang lebih rendah dari Bumi.'),
      q('Bukti ilmiah apa yang ditemukan rover Curiosity (Kawah Gale) dan Perseverance (Kawah Jezero) tentang masa lalu Mars?',
        ['Mars dulunya adalah bintang panas', 'Jejak kipas delta sungai dan endapan danau air cair purba', 'Hutan pohon raksasa modern', 'Lautan logam cair di permukaan'], 1,
        'Endapan batu lempung dan struktur delta sungai di Kawah Jezero dan Gale membuktikan bahwa miliaran tahun silam Mars memiliki danau air cair.')
    ]
  },
  jupiter: {
    topic: 'Raksasa Gas, Magnetosfer & Bulan Galilea',
    questions: [
      q('Apakah sebenarnya Bintik Merah Raksasa (Great Red Spot) yang tampak di belahan selatan planet Jupiter?',
        ['Gunung batu merah setinggi 50 km', 'Badai antisiklon raksasa bertekanan tinggi yang ukurannya lebih besar dari planet Bumi', 'Kawah tumbukan meteor besi', 'Danau lava belerang'], 1,
        'Great Red Spot adalah pusaran badai antisiklon abadi berdiameter lebih dari 16.000 km dengan kecepatan angin mencapai 680 km/jam.'),
      q('Lapisan apakah di bagian dalam Jupiter yang membangkitkan medan magnet terkuat dan memicu aurora raksasa di kutubnya?',
        ['Batu kapur kering', 'Lautan hidrogen metalik cair bertekanan jutaan atmosfer', 'Pasir kuarsa', 'Es karbon dioksida'], 1,
        'Tekanan ekstrem di dalam Jupiter memampatkan gas hidrogen menjadi cairan logam penghantar listrik yang menghasilkan magnetosfer raksasa.'),
      q('Manakah dari keempat bulan Galilea Jupiter yang memiliki ratusan gunung berapi belerang paling aktif di Tata Surya?',
        ['Callisto', 'Io', 'Ganymede', 'Triton'], 1,
        'Gaya pasang surut gravitasi dari Jupiter, Europa, dan Ganymede terus meremas bagian dalam bulan Io hingga memicu ratusan gunung berapi aktif.'),
      q('Berapa lama waktu yang dibutuhkan raksasa gas Jupiter untuk berputar satu kali penuh pada porosnya (satu hari Jupiter)?',
        ['243 hari Bumi', 'Sekitar 9 jam 55 menit (rotasi tercepat di Tata Surya)', '365 hari', '58,6 hari'], 1,
        'Meskipun ukurannya paling besar, Jupiter berputar paling cepat pada porosnya yaitu hanya 9,93 jam per putaran.')
    ]
  },
  saturnus: {
    topic: 'Cincin Megah & Samudra Es Enceladus',
    questions: [
      q("Fenomena cuaca unik apakah yang berputar di kutub utara Saturnus dengan lebar mencapai 29.000 kilometer?",
        ['Bintik Gelap Persegi', "Pusaran Badai Segi Enam Sempurna (Saturn's Hexagon)", 'Badai Debu Karat', 'Awan Asam Sulfat'], 1,
        'Kutub utara Saturnus memiliki pola gelombang arus jet atmosfer berbentuk segi enam (heksagon) selebar dua kali diameter Bumi.'),
      q('Apakah materi penyusun utama cincin berkilauan Saturnus dan apa nama celah selebar 4.800 km yang memisahkan Cincin A dan B?',
        ['Debu besi panas & Celah Mariner', 'Miliaran bongkahan es air murni & Celah Divisi Cassini', 'Gas neon & Celah Kuiper', 'Batu bara & Celah Gale'], 1,
        'Cincin Saturnus tersusun 99% atas es air murni, dan celah Divisi Cassini terbentuk akibat resonansi gravitasi bulan Mimas.'),
      q('Di bulan terbesar Saturnus, yaitu Titan, wahana Huygens menemukan sungai, hujan, dan danau cair yang tersusun dari...',
        ['Air laut asin hangat', 'Hidrokarbon metana dan etana cair pada suhu -179°C', 'Besi cair panas', 'Asam sulfat pekat'], 1,
        'Pada suhu dingin -179°C di Titan, gas metana dan etana mencair membentuk siklus hujan, sungai, dan danau hidrokarbon.'),
      q('Bulan es milik Saturnus yang menyemburkan geyser uap air asin dari samudra bawah permukaannya di kutub selatan adalah...',
        ['Phobos', 'Enceladus', 'Deimos', 'Io'], 1,
        'Wahana Cassini menemukan semburan geyser air asin dan aktivitas hidrotermal dari celah es kutub selatan bulan Enceladus.')
    ]
  },
  uranus: {
    topic: 'Raksasa Es, Sumbu Rebah & Verona Rupes',
    questions: [
      q('Fenomena hujan unik apakah yang terjadi di kedalaman mantel es Uranus dan Neptunus akibat tekanan 6 juta atmosfer?',
        ['Hujan air biasa', 'Hujan Kristal Berlian (Diamond Rain) dari pemecahan molekul metana', 'Hujan pasir besi', 'Hujan debu belerang'], 1,
        'Tekanan jutaan atmosfer dan suhu ribuan derajat di mantel Uranus serta Neptunus memisahkan atom karbon dari metana (CH4) dan memampatkannya menjadi hujan berlian.'),
      q('Apa dampak dari kemiringan poros rotasi Uranus yang rebah ekstrem hingga 97,77 derajat?',
        ['Uranus tidak pernah mengelilingi Matahari', 'Uranus tampak menggelinding miring di orbitnya dan kutubnya mengalami 42 tahun siang diikuti 42 tahun malam', 'Suhu Uranus menjadi 500°C', 'Uranus kehilangan seluruh atmosfernya'], 1,
        'Poros 97,77° membuat Uranus berputar miring seperti bola yang menggelinding bersama 13 cincin vertikalnya.'),
      q('Gas apakah di atmosfer bagian atas Uranus yang menyerap spektrum cahaya merah dan memberi warna biru-kehijauan (cyan)?',
        ['Karbon Dioksida', 'Metana (CH4)', 'Oksigen Murni', 'Uap Besi'], 1,
        'Metana di atmosfer atas Uranus menyerap cahaya merah Matahari dan memantulkan cahaya biru-kehijauan kembali ke ruang angkasa.'),
      q('Apa nama tebing patahan es setinggi 20 km (tertinggi di Tata Surya) yang dipotret Voyager 2 di bulan Miranda milik Uranus?',
        ['Enterprise Rupes', 'Verona Rupes', 'Valles Marineris', 'Palung Mariana'], 1,
        'Verona Rupes di bulan Miranda menjulang setinggi 20 km—hampir dua kali lipat kedalaman Palung Mariana di Bumi.')
    ]
  },
  neptunus: {
    topic: 'Angin Supersonik & Misteri Triton',
    questions: [
      q('Berapakah rekor kecepatan angin badai supersonik di atmosfer Neptunus yang menjadikannya angin tercepat di Tata Surya?',
        ['100 km/jam', 'Lebih dari 2.100 km/jam (melampaui kecepatan suara)', '300 km/jam', '50 km/jam'], 1,
        'Panas internal Neptunus dan atmosfer es metananya yang minim gesekan memicu angin supersonik hingga 2.100 km/jam di sekitar Bintik Gelap Besar.'),
      q('Selain di Uranus, mengapa jatuhnya hujan kristal berlian di dalam mantel Neptunus sangat penting bagi kondisi fisik planet tersebut?',
        ['Membuat Neptunus menjadi kotak', 'Gesekan jatuhnya berlian menuju inti planet menghasilkan panas internal tambahan bagi Neptunus', 'Menghentikan rotasi Neptunus', 'Mengubah warna Neptunus menjadi merah'], 1,
        'Tenggelamnya kristal berlian padat melalui mantel fluida superionik memicu gesekan gravitasi yang memanaskan bagian dalam Neptunus.'),
      q('Apa keunikan bulan terbesar Neptunus, yaitu Triton, yang ditemukan oleh wahana Voyager 2 pada tahun 1989?',
        ['Permukaannya berupa lautan lava pijar', 'Mengorbit berlawanan arah (retrograde) dan memiliki geyser aktif yang menyemburkan nitrogen cair setinggi 8 km', 'Tidak memiliki gravitasi', 'Berbentuk kubus'], 1,
        'Triton adalah objek Sabuk Kuiper yang tertangkap gravitasi Neptunus dan memiliki gunung api es (cryovolcano) yang menyemburkan gas nitrogen cair.'),
      q('Mengapa penemuan planet Neptunus pada tahun 1846 menjadi tonggak sejarah besar dalam ilmu astronomi?',
        ['Karena ditemukan oleh astronot yang mendarat di sana', 'Karena merupakan planet pertama yang posisinya ditemukan lewat perhitungan rumus matematika sebelum diamati teleskop', 'Karena terlihat sebesar Bulan dengan mata telanjang', 'Karena menabrak planet Mars'], 1,
        'Urbain Le Verrier dan John Couch Adams menghitung posisi Neptunus secara matematis dari gangguan gravitasi pada orbit Uranus sebelum diamati Johann Galle.')
    ]
  }
};
