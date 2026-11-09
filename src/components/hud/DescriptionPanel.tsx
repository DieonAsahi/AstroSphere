'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Compass,
  RotateCw,
  Sun,
  Maximize2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { supabase } from '@/lib/supabase/client';
import type { Planet } from '@/types/database';

const FALLBACK_PLANETS: Record<string, Planet> = {
  mercury: {
    planet_id: 'mercury',
    urutan_orbit: 1,
    nama: 'Merkurius',
    diameter_km: 4879,
    rotation_period_hours: 1407.6,
    orbital_period_days: 87.97,
    axial_tilt_deg: 0.034,
    ringkasan_cepat: 'Planet terkecil dan terdekat dari Matahari dengan variasi suhu paling ekstrem.',
    deskripsi_materi:
      'Merkurius adalah planet terkecil di Tata Surya dan yang paling dekat dengan Matahari. Permukaannya dipenuhi kawah mirip Bulan, dan tidak memiliki atmosfer tebal untuk menahan panas, menyebabkan suhu ekstrem antara siang (430°C) dan malam (-180°C).',
    sumber_referensi: 'NASA Planetary Fact Sheet',
    aset_model_url: '/models/planets/mercury.glb',
    skala_visual: 0.8,
    batas_zona_radius: 26,
    updated_at: new Date().toISOString(),
  },
  venus: {
    planet_id: 'venus',
    urutan_orbit: 2,
    nama: 'Venus',
    diameter_km: 12104,
    rotation_period_hours: -5832.5,
    orbital_period_days: 224.7,
    axial_tilt_deg: 177.36,
    ringkasan_cepat: 'Kembaran Bumi yang panas membara dengan rotasi retrograde unik searah jarum jam.',
    deskripsi_materi:
      'Venus adalah planet terpanas di Tata Surya karena efek rumah kaca ekstrem dari atmosfer karbon dioksida tebalnya. Venus memiliki rotasi retrograde (berputar searah jarum jam dari timur ke barat), sehingga Matahari terbit dari barat dan terbenam di timur. Satu hari di Venus lebih panjang daripada satu tahunnya!',
    sumber_referensi: 'NASA Planetary Fact Sheet',
    aset_model_url: '/models/planets/venus.glb',
    skala_visual: 0.95,
    batas_zona_radius: 30,
    updated_at: new Date().toISOString(),
  },
  earth: {
    planet_id: 'earth',
    urutan_orbit: 3,
    nama: 'Bumi',
    diameter_km: 12742,
    rotation_period_hours: 23.93,
    orbital_period_days: 365.25,
    axial_tilt_deg: 23.44,
    ringkasan_cepat: 'Planet samudra biru, rumah bagi peradaban dan satu-satunya dunia berpenghuni.',
    deskripsi_materi:
      'Bumi adalah satu-satunya objek astronomi yang diketahui menampung kehidupan. Sekitar 71% permukaannya tertutup air cair. Kemiringan poros 23.44° menyebabkan terjadinya empat musim di berbagai belahan bumi seiring bumi berevolusi mengitari Matahari.',
    sumber_referensi: 'NASA Planetary Fact Sheet',
    aset_model_url: '/models/planets/earth.glb',
    skala_visual: 1.0,
    batas_zona_radius: 32,
    updated_at: new Date().toISOString(),
  },
  mars: {
    planet_id: 'mars',
    urutan_orbit: 4,
    nama: 'Mars',
    diameter_km: 6779,
    rotation_period_hours: 24.62,
    orbital_period_days: 687.0,
    axial_tilt_deg: 25.19,
    ringkasan_cepat: 'Dunia berkarat dengan ngarai raksasa dan jejak danau air masa silam.',
    deskripsi_materi:
      'Mars dikenal sebagai Planet Merah karena oksida besi melimpah di permukaannya. Mars adalah rumah bagi Olympus Mons (gunung berapi terbesar di Tata Surya) dan Valles Marineris (sistem ngarai raksasa yang panjangnya mencapai ribuan kilometer).',
    sumber_referensi: 'NASA Planetary Fact Sheet',
    aset_model_url: '/models/planets/mars.glb',
    skala_visual: 0.85,
    batas_zona_radius: 28,
    updated_at: new Date().toISOString(),
  },
  jupiter: {
    planet_id: 'jupiter',
    urutan_orbit: 5,
    nama: 'Jupiter',
    diameter_km: 139820,
    rotation_period_hours: 9.93,
    orbital_period_days: 4332.59,
    axial_tilt_deg: 3.13,
    ringkasan_cepat: 'Raja para planet berputar tercepat dengan Badai Merah Raksasa yang melegenda.',
    deskripsi_materi:
      'Jupiter adalah raksasa gas sekaligus planet terbesar di Tata Surya. Memiliki massa 2.5 kali gabungan seluruh planet lainnya. Jupiter berputar sangat cepat pada porosnya (kurang dari 10 jam per putaran) dan terkenal dengan Bintik Merah Raksasa (Great Red Spot), badai antisiklon yang telah berkecamuk ratusan tahun.',
    sumber_referensi: 'NASA Planetary Fact Sheet',
    aset_model_url: '/models/planets/jupiter.glb',
    skala_visual: 1.5,
    batas_zona_radius: 45,
    updated_at: new Date().toISOString(),
  },
  saturn: {
    planet_id: 'saturn',
    urutan_orbit: 6,
    nama: 'Saturnus',
    diameter_km: 116460,
    rotation_period_hours: 10.7,
    orbital_period_days: 10759.22,
    axial_tilt_deg: 26.73,
    ringkasan_cepat: 'Permata Tata Surya bermahkotakan cincin es berkilauan selebar ratusan ribu kilometer.',
    deskripsi_materi:
      'Saturnus adalah raksasa gas dengan sistem cincin es spektakuler yang membentang hingga 282.000 km namun tebalnya rata-rata hanya puluhan meter. Kerapatan Saturnus sangat rendah hingga secara teoritis planet ini dapat mengapung jika ada wadah air yang cukup besar.',
    sumber_referensi: 'NASA Planetary Fact Sheet',
    aset_model_url: '/models/planets/saturn.glb',
    skala_visual: 1.35,
    batas_zona_radius: 42,
    updated_at: new Date().toISOString(),
  },
  uranus: {
    planet_id: 'uranus',
    urutan_orbit: 7,
    nama: 'Uranus',
    diameter_km: 50724,
    rotation_period_hours: -17.24,
    orbital_period_days: 30685.4,
    axial_tilt_deg: 97.77,
    ringkasan_cepat: 'Raksasa es menggelinding miring dengan rotasi retrograde di tepian dingin antariksa.',
    deskripsi_materi:
      'Uranus adalah raksasa es dengan atmosfer kaya metana yang memberinya rona biru kehijauan. Keunikan utama Uranus adalah poros rotasinya yang miring 97.77°, membuatnya tampak "menggelinding" di sepanjang orbitnya, serta memiliki rotasi retrograde.',
    sumber_referensi: 'NASA Planetary Fact Sheet',
    aset_model_url: '/models/planets/uranus.glb',
    skala_visual: 1.15,
    batas_zona_radius: 36,
    updated_at: new Date().toISOString(),
  },
  neptune: {
    planet_id: 'neptune',
    urutan_orbit: 8,
    nama: 'Neptunus',
    diameter_km: 49244,
    rotation_period_hours: 16.11,
    orbital_period_days: 60189.0,
    axial_tilt_deg: 28.32,
    ringkasan_cepat: 'Planet terluar berwarna biru samudra kosmis dengan badai angin supersonik dahsyat.',
    deskripsi_materi:
      'Neptunus adalah planet terjauh dari Matahari di Tata Surya. Berwarna biru tua pekat akibat metana di atmosfernya, planet ini dikenal memiliki kecepatan angin paling ekstrem di Tata Surya, mencapai lebih dari 2.100 km/jam.',
    sumber_referensi: 'NASA Planetary Fact Sheet',
    aset_model_url: '/models/planets/neptune.glb',
    skala_visual: 1.1,
    batas_zona_radius: 35,
    updated_at: new Date().toISOString(),
  },
};

export function DescriptionPanel() {
  const activePlanetId = useSceneStore((state) => state.activePlanetId);
  const mode = useSceneStore((state) => state.mode);
  const switchMode = useSceneStore((state) => state.switchMode);

  const [planet, setPlanet] = useState<Planet>(
    FALLBACK_PLANETS[activePlanetId] || FALLBACK_PLANETS.earth
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('planets')
          .select('*')
          .eq('planet_id', activePlanetId)
          .maybeSingle();

        if (isMounted) {
          if (data) {
            if (data.is_active === false) {
              // Jika planet dinonaktifkan, kembalikan pemain ke Bumi
              useSceneStore.getState().setActivePlanetId('earth');
              return;
            }
            setPlanet(data);
          } else {
            setPlanet(FALLBACK_PLANETS[activePlanetId] || FALLBACK_PLANETS.earth);
          }
        }
      } catch {
        if (isMounted) {
          setPlanet(FALLBACK_PLANETS[activePlanetId] || FALLBACK_PLANETS.earth);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (mode === 'DESCRIPTION') {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [activePlanetId, mode]);

  if (mode !== 'DESCRIPTION') return null;

  const isRetrograde = Number(planet.rotation_period_hours) < 0;
  const absRotation = Math.abs(Number(planet.rotation_period_hours));
  const orbitalYears = (Number(planet.orbital_period_days) / 365.25).toFixed(2);

  return (
    <aside
      aria-label="Panel Data Ilmiah Planet"
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] md:w-[500px] flex flex-col bg-slate-950/95 border-l border-slate-800 backdrop-blur-2xl shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300"
    >
      {/* Header Modal */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {planet.nama}
              </h2>
              <span className="text-[11px] font-mono rounded bg-slate-800/80 px-2 py-0.5 text-slate-300">
                Orbit #{planet.urutan_orbit}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Parameter Fisika & Materi Kurikulum</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => switchMode('EXPLORE')}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Tutup & Kembali ke Jelajah 3D"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : (
        <div className="mt-5 space-y-6 flex-1">
          {/* Opening Highlight Banner (ringkasan_cepat) */}
          {planet.ringkasan_cepat && (
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-indigo-950/40 p-4 shadow-lg shadow-cyan-950/20">
              <div className="absolute top-0 left-0 h-full w-1.5 bg-gradient-to-b from-cyan-400 to-indigo-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                Sekilas Pengenalan Planet
              </span>
              <p className="text-xs font-medium text-cyan-100 italic leading-relaxed pl-1">
                "{planet.ringkasan_cepat}"
              </p>
            </div>
          )}

          {/* Retrograde Banner if applicable (Venus & Uranus - PRD R07) */}
          {isRetrograde && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  Rotasi Retrograde Terdeteksi
                </h4>
                <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                  {planet.nama} berputar searah jarum jam (dari timur ke barat), berkebalikan dari mayoritas planet Tata Surya. Sumbu rotasinya bernilai negatif ({planet.rotation_period_hours} jam).
                </p>
              </div>
            </div>
          )}

          {/* Grid Parameter Ilmiah (PRD R05) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <span>Karakteristik Fisika & Orbit</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Diameter */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Maximize2 className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Diameter Khatulistiwa</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {Number(planet.diameter_km).toLocaleString('id-ID')}
                  <span className="text-xs font-normal text-slate-400 ml-1">km</span>
                </div>
              </div>

              {/* Periode Rotasi */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <RotateCw className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Periode Rotasi (1 Hari)</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {absRotation.toLocaleString('id-ID')}
                  <span className="text-xs font-normal text-slate-400 ml-1">jam</span>
                </div>
                {isRetrograde && (
                  <span className="text-[10px] text-amber-400 font-semibold">Retrograde</span>
                )}
              </div>

              {/* Periode Revolusi Orbit */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Periode Orbit (1 Tahun)</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {Number(planet.orbital_period_days).toLocaleString('id-ID')}
                  <span className="text-xs font-normal text-slate-400 ml-1">hari</span>
                </div>
                <span className="text-[10px] text-slate-400">≈ {orbitalYears} tahun Bumi</span>
              </div>

              {/* Kemiringan Sumbu (Axial Tilt) */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Compass className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Kemiringan Sumbu</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {Number(planet.axial_tilt_deg).toFixed(2)}
                  <span className="text-xs font-normal text-slate-400 ml-0.5">°</span>
                </div>
              </div>
            </div>
          </div>

          {/* Materi Kurikulum Edukasi (PRD R05) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>Rangkuman Materi Pembelajaran</span>
            </h3>
            <div className="rounded-2xl border border-slate-800/90 bg-slate-900/40 p-4 text-xs leading-relaxed text-slate-300 text-justify">
              {planet.deskripsi_materi}
            </div>
          </div>

          {/* Validasi Ilmiah Badge */}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Data diverifikasi berdasarkan {planet.sumber_referensi || 'astronomi NASA Planetary Fact Sheet'}.
            </span>
          </div>

          {/* Tombol Lanjut ke Kuis / Kembali */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={() => switchMode('QUIZ')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all"
            >
              <span>Uji Pemahaman di Kuis</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => switchMode('EXPLORE')}
              className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
