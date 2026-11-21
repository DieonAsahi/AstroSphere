// Satu fenomena khas per planet — ditawarkan saat planet didekati dan diputar di mode Planet.
// mul  : percepatan waktu observasi (1x = 1 hari / 50 dtk). Rotasi yang terlalu cepat untuk dilihat diperlambat
//        khusus untuk tampilan; posisi orbit & arah cahaya Matahari tetap mengikuti waktu yang dipercepat.
// view : 'sun' kamera dari arah Matahari · 'top' dari atas kutub ekliptika · 'wide' lebar (planet + satelit)
// show : 'pin' penanda di permukaan (siang/malam) · 'season' kemiringan ke Matahari · 'spins' hitungan putaran · 'years' tahun berjalan
// Bumi memakai laboratorium gerhana tersendiri (lab: true).
export const PHENOMENA = {
  merkurius: { title: 'Sehari lebih lama dari setahun', short: 'Dari siang ke siang lagi di Merkurius butuh 176 hari Bumi — dua kali lamanya satu tahun Merkurius.', mul: 400, view: 'top', show: 'pin' },
  venus: { title: 'Matahari terbit di barat', short: 'Venus berputar terbalik dan sangat lambat. Di sana Matahari terbit di barat dan terbenam di timur.', mul: 600, view: 'top', show: 'pin' },
  bumi: { title: 'Gerhana Matahari & Bulan', short: 'Saat Matahari, Bulan, dan Bumi segaris, bayangan menutupi cahaya Matahari.', lab: true },
  mars: { title: 'Musim seperti di Bumi', short: 'Sumbu Mars miring 25°, jadi ada musim. Tiap musimnya hampir dua kali lebih lama dari musim di Bumi.', mul: 2500, view: 'sun', show: 'season' },
  jupiter: { title: 'Hari paling singkat', short: 'Jupiter berputar sekali dalam ± 10 jam. Satelitnya, Io, mengitarinya tiap 1,8 hari.', mul: 12, view: 'wide', show: 'spins' },
  saturnus: { title: 'Cincin yang "menghilang"', short: 'Tiap ± 15 tahun cincin Saturnus sejajar dengan arah Matahari, sehingga tampak seperti garis tipis.', mul: 12000, view: 'sun', show: 'years' },
  uranus: { title: 'Planet yang menggelinding', short: 'Sumbu Uranus miring 98°. Tiap kutubnya disinari Matahari terus-menerus selama ± 42 tahun.', mul: 30000, view: 'sun', show: 'season' },
  neptunus: { title: 'Setahun = 165 tahun Bumi', short: 'Sejak ditemukan pada 1846, Neptunus baru sekali mengelilingi Matahari — tepat pada 2011.', mul: 60000, view: 'sun', show: 'years' },
};
