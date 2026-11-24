// Koordinat geografis nyata (Latitude, Longitude) untuk peristiwa sejarah planet Bumi (Mode Sejarah).
// Menghilangkan koordinat pseudorandom Fibonacci pada Bumi agar titik pin 3D tepat di lokasi bumi sebenarnya.

export const EARTH_EVENT_COORDS = {
  // --- Kunci UUID dari Database Supabase (public.history_events) ---
  '10000000-0000-0000-0002-000000000001': { lat: 65.1667, lon: -115.5833 }, // Batuan Tertua Acasta Gneiss (Kanada Barat Laut)
  '10000000-0000-0000-0002-000000000002': { lat: -26.1360, lon: 113.5900 }, // Stromatolit Shark Bay (Australia Barat)
  '10000000-0000-0000-0002-000000000003': { lat: 51.4286, lon: -116.4719 }, // Ledakan Kambrium Burgess Shale (Pegunungan Rocky)
  '10000000-0000-0000-0002-000000000004': { lat: 53.5587, lon: 108.1650 },  // Danau Baikal (Siberia Selatan, Rusia)
  '10000000-0000-0000-0002-000000000005': { lat: 0.3500, lon: 36.1000 },    // Great Rift Valley (Afrika Timur)
  '10000000-0000-0000-0002-000000000006': { lat: 36.0544, lon: -112.1401 }, // Ngarai Grand Canyon (Arizona, AS)
  '10000000-0000-0000-0002-000000000007': { lat: 19.8206, lon: -155.4681 }, // Gunung Mauna Kea (Kepulauan Hawaii)
  '10000000-0000-0000-0002-000000000008': { lat: 20.0000, lon: 0.0000 },    // Superbenua Pangaea (Pusat Daratan Purba)
  '10000000-0000-0000-0002-000000000009': { lat: 39.6500, lon: -105.1900 }, // Formasi Morrison / Zaman Jura (Colorado, AS)
  '10000000-0000-0000-0002-000000000010': { lat: -38.9500, lon: -68.0600 }, // Argentinosaurus (Neuquén, Patagonia, Argentina)
  '10000000-0000-0000-0002-000000000011': { lat: 47.5000, lon: -106.5000 }, // Hell Creek / Zaman Kapur Akhir (Montana, AS)
  '10000000-0000-0000-0002-000000000012': { lat: 21.4000, lon: -89.5167 },  // Kawah Asteroid Chicxulub (Yucatan, Meksiko)
  '10000000-0000-0000-0002-000000000013': { lat: 27.9881, lon: 86.9250 },   // Gunung Everest (Himalaya, Nepal/Tibet)
  '10000000-0000-0000-0002-000000000014': { lat: 2.6845, lon: 98.8756 },    // Kaldera Danau Toba (Sumatera Utara, Indonesia)
  '10000000-0000-0000-0002-000000000015': { lat: -2.9897, lon: 35.3533 },   // Ngarai Olduvai (Serengeti, Tanzania)
  '10000000-0000-0000-0002-000000000016': { lat: -7.4619, lon: 110.8353 },  // Situs Sangiran (Sragen & Karanganyar, Jawa Tengah)
  '10000000-0000-0000-0002-000000000017': { lat: -7.3719, lon: 111.3575 },  // Situs Trinil (Ngawi, Jawa Timur)
  '10000000-0000-0000-0002-000000000018': { lat: 39.6869, lon: 115.9272 },  // Gua Api Purba Zhoukoudian (Beijing, Tiongkok)
  '10000000-0000-0000-0002-000000000019': { lat: -4.9753, lon: 119.6742 },  // Lukisan Gua Maros-Pangkep (Sulawesi Selatan)
  '10000000-0000-0000-0002-000000000020': { lat: 45.0538, lon: 1.1708 },    // Gua Lascaux (Dordogne, Prancis)
  '10000000-0000-0000-0002-000000000021': { lat: 37.2231, lon: 38.9225 },   // Kuil Batu Göbekli Tepe (Şanlıurfa, Turki)
  '10000000-0000-0000-0002-000000000022': { lat: 31.8697, lon: 35.4444 },   // Revolusi Pertanian Neolitikum (Jericho / Bulan Sabit Subur)
  '10000000-0000-0000-0002-000000000023': { lat: 51.1789, lon: -1.8262 },  // Lingkaran Batu Stonehenge (Wiltshire, Inggris)
  '10000000-0000-0000-0002-000000000024': { lat: -6.9939, lon: 107.0561 },  // Situs Megalitikum Gunung Padang (Cianjur, Jawa Barat)
  '10000000-0000-0000-0002-000000000025': { lat: 30.9628, lon: 46.1031 },   // Peradaban Mesopotamia / Ziggurat Ur (Irak)
  '10000000-0000-0000-0002-000000000026': { lat: 29.9792, lon: 31.1342 },   // Piramida Agung Giza (Kairo, Mesir)
  '10000000-0000-0000-0002-000000000027': { lat: 27.3294, lon: 68.1389 },   // Kota Kuno Mohenjo-daro (Sindh, Pakistan)
  '10000000-0000-0000-0002-000000000028': { lat: 21.4225, lon: 39.8262 },   // Ka'bah / Makkah (Masjidil Haram, Arab Saudi)
  '10000000-0000-0000-0002-000000000029': { lat: 31.7761, lon: 35.2358 },   // Masjidil Aqsa (Kota Tua Al-Quds / Yerusalem)
  '10000000-0000-0000-0002-000000000030': { lat: 37.9715, lon: 23.7257 },   // Acropolis Athena & Eratosthenes (Yunani)
  '10000000-0000-0000-0002-000000000031': { lat: 40.3598, lon: 116.0200 },  // Tembok Besar Tiongkok (Badaling / Beijing)
  '10000000-0000-0000-0002-000000000032': { lat: 30.3285, lon: 35.4444 },   // Kota Batu Petra (Ma'an, Yordania)
  '10000000-0000-0000-0002-000000000033': { lat: 41.8902, lon: 12.4922 },   // Colosseum Roma (Italia)
  '10000000-0000-0000-0002-000000000034': { lat: 19.6925, lon: -98.8438 },  // Kota Kuno Teotihuacan (Meksiko)
  '10000000-0000-0000-0002-000000000035': { lat: 24.4672, lon: 39.6108 },   // Masjid Nabawi & Hijrah Madinah (Arab Saudi)
  '10000000-0000-0000-0002-000000000036': { lat: 20.6843, lon: -88.5678 },  // Piramida Chichén Itzá (Yucatan, Meksiko)
  '10000000-0000-0000-0002-000000000037': { lat: -7.6079, lon: 110.2038 },  // Candi Borobudur (Magelang, Jawa Tengah)
  '10000000-0000-0000-0002-000000000038': { lat: 33.3406, lon: 44.4009 },   // Baitul Hikmah Baghdad (Irak)
  '10000000-0000-0000-0002-000000000039': { lat: 34.0649, lon: -4.9733 },   // Universitas Al-Qarawiyyin (Fez, Maroko)
  '10000000-0000-0000-0002-000000000040': { lat: 51.5956, lon: -55.5342 },  // Pelayaran Viking (L'Anse aux Meadows, Kanada)
  '10000000-0000-0000-0002-000000000041': { lat: 13.4125, lon: 103.8670 },  // Kompleks Angkor Wat (Siem Reap, Kamboja)
  '10000000-0000-0000-0002-000000000042': { lat: -7.5562, lon: 112.3813 },  // Kemaharajaan Majapahit (Trowulan, Mojokerto)
  '10000000-0000-0000-0002-000000000043': { lat: -6.9826, lon: 110.3922 },  // Pelayaran Laksamana Cheng Ho (Semarang / Samudra Hindia)
  '10000000-0000-0000-0002-000000000044': { lat: 39.6744, lon: 66.9839 },   // Observatorium Ulugh Beg (Samarkand, Uzbekistan)
  '10000000-0000-0000-0002-000000000045': { lat: -13.1631, lon: -72.5450 }, // Kota Awan Machu Picchu (Andes, Peru)
  '10000000-0000-0000-0002-000000000046': { lat: 49.9994, lon: 8.2711 },    // Mesin Cetak Gutenberg (Mainz, Jerman)
  '10000000-0000-0000-0002-000000000047': { lat: 24.0500, lon: -74.5300 },  // Penemuan Benua Amerika - Columbus (Karibia / Bahama)
  '10000000-0000-0000-0002-000000000048': { lat: 0.6861, lon: 127.4042 },   // Ekspedisi Keliling Dunia Pertama - Magellan (Tidore, Maluku)
  '10000000-0000-0000-0002-000000000049': { lat: 54.3564, lon: 19.6811 },   // Teori Heliosentris Copernicus (Frombork & Toruń, Polandia)
  '10000000-0000-0000-0002-000000000050': { lat: 41.9029, lon: 12.4534 },   // Kalender Masehi Gregorian (Vatikan, Roma)
  '10000000-0000-0000-0002-000000000051': { lat: 51.4988, lon: 3.6109 },    // Penemuan Mikroskop Pertama (Middelburg, Belanda)
  '10000000-0000-0000-0002-000000000052': { lat: -12.5786, lon: 141.7778 }, // Penjelajahan Pertama Australia (Cape York, Australia)
  '10000000-0000-0000-0002-000000000053': { lat: 45.4064, lon: 11.8768 },   // Teleskop Astronomi Galileo (Padua & Pisa, Italia)
  '10000000-0000-0000-0002-000000000054': { lat: -42.8821, lon: 147.3272 }, // Pemetaan Tasmania & Selandia Baru (Abel Tasman)
  '10000000-0000-0000-0002-000000000055': { lat: 27.1751, lon: 78.0421 },   // Taj Mahal (Agra, India)
  '10000000-0000-0000-0002-000000000056': { lat: 52.2053, lon: 0.1218 },    // Hukum Gravitasi Isaac Newton (Cambridge, Inggris)
  '10000000-0000-0000-0002-000000000057': { lat: 55.8642, lon: -4.2518 },   // Mesin Uap & Revolusi Industri (Skotlandia & Inggris)
  '10000000-0000-0000-0002-000000000058': { lat: -34.0011, lon: 151.2228 }, // Pemetaan Pesisir Timur Australia (Botany Bay, Sydney)
  '10000000-0000-0000-0002-000000000059': { lat: 48.8606, lon: 2.3376 },    // Balon Udara Panas Pertama (Paris, Prancis)
  '10000000-0000-0000-0002-000000000060': { lat: 51.7258, lon: -2.4636 },   // Penemuan Vaksin Pertama (Gloucestershire, Inggris)
  '10000000-0000-0000-0002-000000000061': { lat: 45.1856, lon: 9.1558 },    // Baterai Listrik & Gurun Sahara (Italia & Afrika Utara)
  '10000000-0000-0000-0002-000000000062': { lat: -64.0000, lon: -60.0000 }, // Penemuan Benua Antartika (Semenanjung Antartika)
  '10000000-0000-0000-0002-000000000063': { lat: -3.1190, lon: -60.0217 },  // Hutan Hujan Amazon (Manaus, Brasil)
  '10000000-0000-0000-0002-000000000064': { lat: 30.5852, lon: 32.2654 },   // Pembukaan Terusan Suez (Ismailia, Mesir)
  '10000000-0000-0000-0002-000000000065': { lat: 40.5408, lon: -74.3414 },  // Telepon & Lampu Pijar Listrik (Menlo Park, New Jersey, AS)
  '10000000-0000-0000-0002-000000000066': { lat: -6.1021, lon: 105.4230 },  // Letusan Gunung Krakatau 1883 (Selat Sunda, Indonesia)
  '10000000-0000-0000-0002-000000000067': { lat: 49.7892, lon: 9.9322 },    // Penemuan Sinar-X & Radio (Würzburg, Jerman)
  '10000000-0000-0000-0002-000000000068': { lat: 36.0150, lon: -75.6700 },  // Pesawat Wright Bersaudara (Kitty Hawk, NC, AS)
  '10000000-0000-0000-0002-000000000069': { lat: 41.7269, lon: -49.9483 },  // Tenggelamnya Kapal RMS Titanic (Atlantik Utara)
  '10000000-0000-0000-0002-000000000070': { lat: 9.0800, lon: -79.6800 },   // Pembukaan Terusan Panama (Panama)
  '10000000-0000-0000-0002-000000000071': { lat: 51.5167, lon: -0.1742 },   // Penemuan Antibiotik Penisilin (London, Inggris)
  '10000000-0000-0000-0002-000000000072': { lat: -6.2025, lon: 106.8483 },  // Kemerdekaan Indonesia & PBB (Pegangsaan Timur, Jakarta)
  '10000000-0000-0000-0002-000000000073': { lat: 11.3733, lon: 142.1983 },  // Palung Mariana Challenger Deep (Pasifik Barat)
  '10000000-0000-0000-0002-000000000074': { lat: 28.5729, lon: -80.6490 },  // Pendaratan Bulan Apollo 11 (Kennedy Space Center LC-39A)
  '10000000-0000-0000-0002-000000000075': { lat: 46.2330, lon: 6.0557 },    // Lahirnya Internet WWW (CERN, Jenewa, Swiss)
  '10000000-0000-0000-0002-000000000076': { lat: 45.9646, lon: 63.3052 },   // Stasiun Luar Angkasa ISS (Baikonur Cosmodrome)
  '10000000-0000-0000-0002-000000000077': { lat: 38.9959, lon: -77.0988 },  // Pemetaan Genom Manusia (Bethesda, Maryland, AS)
  '10000000-0000-0000-0002-000000000078': { lat: 78.2380, lon: 15.4913 },   // Gudang Benih Global Svalbard (Spitsbergen, Norwegia)
  '10000000-0000-0000-0002-000000000079': { lat: 48.9500, lon: 2.4300 },    // Kesepakatan SDG PBB & Iklim Paris (Le Bourget, Paris)
  '10000000-0000-0000-0002-000000000080': { lat: 5.2390, lon: -52.7680 },   // Teleskop Luar Angkasa James Webb (Kourou, Guyana Prancis)

  // --- Kunci Fallback Demo (app/data/history.js) ---
  'bum-1957': { lat: 45.9646, lon: 63.3052 },  // Sputnik 1 (Baikonur)
  'bum-1961': { lat: 45.9646, lon: 63.3052 },  // Yuri Gagarin / Vostok 1 (Baikonur)
  'bum-1967': { lat: 28.5729, lon: -80.6490 }, // Apollo 1 (Kennedy Space Center LC-34)
  'bum-1968': { lat: 28.5729, lon: -80.6490 }, // Apollo 8 Earthrise (KSC LC-39A)
  'bum-1986': { lat: 28.5729, lon: -80.6490 }, // Challenger Memorial (KSC LC-39B)
  'bum-1990': { lat: 35.4270, lon: -116.8900 },// Pale Blue Dot (Goldstone / KSC)
  'bum-1998': { lat: 45.9646, lon: 63.3052 },  // Modul ISS Zarya (Baikonur)
  'bum-2003': { lat: 31.5000, lon: -94.7000 },  // Columbia Memorial (Texas / KSC)
};

// Pola kata kunci untuk pencocokan dinamis jika ID UUID berubah atau baru ditambahkan
const KEYWORD_COORDS = [
  { match: /acasta/i, lat: 65.1667, lon: -115.5833 },
  { match: /shark\s*bay|stromatolit/i, lat: -26.1360, lon: 113.5900 },
  { match: /burgess/i, lat: 51.4286, lon: -116.4719 },
  { match: /baikal/i, lat: 53.5587, lon: 108.1650 },
  { match: /rift\s*valley/i, lat: 0.3500, lon: 36.1000 },
  { match: /grand\s*canyon/i, lat: 36.0544, lon: -112.1401 },
  { match: /mauna\s*kea/i, lat: 19.8206, lon: -155.4681 },
  { match: /pangaea/i, lat: 20.0000, lon: 0.0000 },
  { match: /morrison|brachiosaurus|stegosaurus/i, lat: 39.6500, lon: -105.1900 },
  { match: /argentinosaurus|patagonia/i, lat: -38.9500, lon: -68.0600 },
  { match: /hell\s*creek|triceratops|t-rex/i, lat: 47.5000, lon: -106.5000 },
  { match: /chicxulub|yucat[aá]n/i, lat: 21.4000, lon: -89.5167 },
  { match: /everest|himalaya/i, lat: 27.9881, lon: 86.9250 },
  { match: /toba/i, lat: 2.6845, lon: 98.8756 },
  { match: /olduvai/i, lat: -2.9897, lon: 35.3533 },
  { match: /sangiran/i, lat: -7.4619, lon: 110.8353 },
  { match: /trinil/i, lat: -7.3719, lon: 111.3575 },
  { match: /zhoukoudian/i, lat: 39.6869, lon: 115.9272 },
  { match: /maros|pangkep|leang\s*tedongnge/i, lat: -4.9753, lon: 119.6742 },
  { match: /lascaux/i, lat: 45.0538, lon: 1.1708 },
  { match: /g[oö]bekli/i, lat: 37.2231, lon: 38.9225 },
  { match: /neolitikum|jericho/i, lat: 31.8697, lon: 35.4444 },
  { match: /stonehenge/i, lat: 51.1789, lon: -1.8262 },
  { match: /gunung\s*padang/i, lat: -6.9939, lon: 107.0561 },
  { match: /mesopotamia|ziggurat/i, lat: 30.9628, lon: 46.1031 },
  { match: /giza|piramida\s*agung/i, lat: 29.9792, lon: 31.1342 },
  { match: /mohenjo/i, lat: 27.3294, lon: 68.1389 },
  { match: /ka['']?bah|makkah/i, lat: 21.4225, lon: 39.8262 },
  { match: /al-?aqsa|al-?quds|yerusalem/i, lat: 31.7761, lon: 35.2358 },
  { match: /acropolis|eratosthenes|athena/i, lat: 37.9715, lon: 23.7257 },
  { match: /tembok\s*besar|china|tiongkok/i, lat: 40.3598, lon: 116.0200 },
  { match: /petra/i, lat: 30.3285, lon: 35.4444 },
  { match: /colosseum|roma/i, lat: 41.8902, lon: 12.4922 },
  { match: /teotihuacan/i, lat: 19.6925, lon: -98.8438 },
  { match: /nabawi|madinah/i, lat: 24.4672, lon: 39.6108 },
  { match: /chich[eé]n\s*itz[aá]/i, lat: 20.6843, lon: -88.5678 },
  { match: /borobudur/i, lat: -7.6079, lon: 110.2038 },
  { match: /baitul\s*hikmah|bayt\s*al-?hikmah|baghdad/i, lat: 33.3406, lon: 44.4009 },
  { match: /qarawiyyin|fez/i, lat: 34.0649, lon: -4.9733 },
  { match: /viking|l['']?anse\s*aux\s*meadows/i, lat: 51.5956, lon: -55.5342 },
  { match: /angkor/i, lat: 13.4125, lon: 103.8670 },
  { match: /majapahit|trowulan/i, lat: -7.5562, lon: 112.3813 },
  { match: /cheng\s*ho/i, lat: -6.9826, lon: 110.3922 },
  { match: /ulugh\s*beg|samarkand/i, lat: 39.6744, lon: 66.9839 },
  { match: /machu\s*picchu/i, lat: -13.1631, lon: -72.5450 },
  { match: /gutenberg|mainz/i, lat: 49.9994, lon: 8.2711 },
  { match: /columbus|san\s*salvador/i, lat: 24.0500, lon: -74.5300 },
  { match: /magellan|tidore/i, lat: 0.6861, lon: 127.4042 },
  { match: /copernicus|toru[nń]|frombork/i, lat: 54.3564, lon: 19.6811 },
  { match: /gregorian|vatikan/i, lat: 41.9029, lon: 12.4534 },
  { match: /mikroskop|janssen/i, lat: 51.4988, lon: 3.6109 },
  { match: /duyfken|cape\s*york/i, lat: -12.5786, lon: 141.7778 },
  { match: /galileo|teleskop|padua/i, lat: 45.4064, lon: 11.8768 },
  { match: /tasman|selandia\s*baru/i, lat: -42.8821, lon: 147.3272 },
  { match: /taj\s*mahal/i, lat: 27.1751, lon: 78.0421 },
  { match: /newton|principia|cambridge/i, lat: 52.2053, lon: 0.1218 },
  { match: /mesin\s*uap|watt/i, lat: 55.8642, lon: -4.2518 },
  { match: /botany\s*bay|cook/i, lat: -34.0011, lon: 151.2228 },
  { match: /balon\s*udara|montgolfier/i, lat: 48.8606, lon: 2.3376 },
  { match: /jenner|vaksin/i, lat: 51.7258, lon: -2.4636 },
  { match: /baterai|volta|sahara/i, lat: 45.1856, lon: 9.1558 },
  { match: /antartika/i, lat: -64.0000, lon: -60.0000 },
  { match: /amazon/i, lat: -3.1190, lon: -60.0217 },
  { match: /terusan\s*suez/i, lat: 30.5852, lon: 32.2654 },
  { match: /edison|menlo\s*park|bell/i, lat: 40.5408, lon: -74.3414 },
  { match: /krakatau/i, lat: -6.1021, lon: 105.4230 },
  { match: /r[oö]ntgen|sinar-x|marconi/i, lat: 49.7892, lon: 9.9322 },
  { match: /wright|kitty\s*hawk/i, lat: 36.0150, lon: -75.6700 },
  { match: /titanic/i, lat: 41.7269, lon: -49.9483 },
  { match: /terusan\s*panama/i, lat: 9.0800, lon: -79.6800 },
  { match: /penisilin|fleming/i, lat: 51.5167, lon: -0.1742 },
  { match: /kemerdekaan\s*indonesia|pegangsaan/i, lat: -6.2025, lon: 106.8483 },
  { match: /mariana|challenger\s*deep/i, lat: 11.3733, lon: 142.1983 },
  { match: /apollo|kennedy\s*space|cape\s*canaveral/i, lat: 28.5729, lon: -80.6490 },
  { match: /internet|world\s*wide\s*web|cern/i, lat: 46.2330, lon: 6.0557 },
  { match: /stasiun\s*luar\s*angkasa|iss|baikonur|sputnik|gagarin/i, lat: 45.9646, lon: 63.3052 },
  { match: /genom|genome/i, lat: 38.9959, lon: -77.0988 },
  { match: /svalbard/i, lat: 78.2380, lon: 15.4913 },
  { match: /paris|iklim\s*paris/i, lat: 48.9500, lon: 2.4300 },
  { match: /james\s*webb|jwst|kourou/i, lat: 5.2390, lon: -52.7680 },
];

/**
 * Mendapatkan koordinat geografis presisi untuk peristiwa di planet Bumi.
 * @param {object} event Peristiwa sejarah
 * @returns {{lat: number, lon: number}|null}
 */
export function getEarthEventCoords(event) {
  if (!event) return null;

  // 1. Jika sudah ada koordinat numerik eksplisit
  if (Number.isFinite(event.lat) && Number.isFinite(event.lon)) {
    return { lat: event.lat, lon: event.lon };
  }

  // 2. Pencocokan langsung dari ID UUID / Fallback
  if (event.id && EARTH_EVENT_COORDS[event.id]) {
    return EARTH_EVENT_COORDS[event.id];
  }

  // 3. Pencocokan kata kunci judul, aktor, atau karakteristik fisik
  const text = `${event.judul || ''} ${event.title || ''} ${event.nama_wahana || ''} ${event.karakteristik_fisik || ''} ${event.ringkasan_singkat || ''}`;
  for (const item of KEYWORD_COORDS) {
    if (item.match.test(text)) {
      return { lat: item.lat, lon: item.lon };
    }
  }

  return null;
}
