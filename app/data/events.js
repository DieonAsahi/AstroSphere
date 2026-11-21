// Peristiwa antariksa saat terbang (dipakai game/hazards.js & HUD). Teks pendek; satu fakta nyata per hasil.
export const EVENT_REWARD = 10;
export const EVENTS = {
  badai: {
    name: 'Badai Matahari',
    warn: 'Badai Matahari mendekat!',
    hit: 'Badai Matahari!',
    ok: 'Kamu berlindung tepat waktu. Planet menghalangi partikel berenergi dari Matahari.',
    fail: 'Radiasi merusak sistem pesawat. Turbo mati sampai pesawat diperbaiki di dekat planet atau satelit.',
    facts: [
      'Badai Matahari melontarkan partikel berenergi tinggi. Astronaut di ISS berlindung di bagian stasiun yang pelindungnya paling tebal.',
      'Tahun 1859, badai Matahari besar (Peristiwa Carrington) membuat kabel telegraf memercikkan api.',
      'Februari 2022, sekitar 38 satelit Starlink jatuh setelah badai geomagnetik membuat udara di ketinggian orbitnya lebih padat.',
      'Sisi indahnya: partikel dari Matahari yang menabrak atmosfer Bumi menghasilkan aurora.',
    ],
  },
  sampah: {
    name: 'Sampah antariksa',
    warn: 'Awan serpihan satelit di depan!',
    hit: 'Sampah antariksa',
    ok: 'Kamu lolos dari awan serpihan dengan selamat.',
    fail: 'Terlalu banyak tabrakan. Turbo mati sampai pesawat diperbaiki di dekat planet atau satelit.',
    facts: [
      'Puluhan ribu benda berukuran di atas 10 cm dipantau di orbit Bumi: satelit mati, bekas roket, dan serpihan.',
      'Serpihan di orbit rendah melesat sekitar 28.000 km/jam. Kepingan kecil pun bisa merusak pesawat.',
      'Tahun 2009 satelit Iridium 33 dan Kosmos 2251 bertabrakan dan menciptakan ribuan serpihan baru.',
      'Stasiun Luar Angkasa Internasional (ISS) sudah puluhan kali bermanuver untuk menghindari sampah antariksa.',
    ],
  },
};
