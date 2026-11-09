'use client';

import { useState, useEffect } from 'react';
import {
  Orbit,
  Compass,
  Info,
  Sparkles,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { supabase } from '@/lib/supabase/client';
import type { Phenomenon, AnimationType } from '@/types/database';

// 4 Simulasi Fenomena Astronomi Inti (PRD R14)
const BUILTIN_PHENOMENA: Phenomenon[] = [
  {
    phenomenon_id: 'solar-eclipse',
    planet_id: 'earth',
    judul: 'Gerhana Matahari Total',
    tipe_animasi: 'SOLAR_ECLIPSE',
    deskripsi_edukatif:
      'Terjadi ketika Bulan berada tepat di antara Matahari dan Bumi, sehingga piringan Bulan menutupi piringan Matahari secara total. Kerucut bayangan inti (Umbra) jatuh di permukaan Bumi, menciptakan kegelapan sesaat di siang hari di sepanjang jalur totalitas.',
    konfigurasi_visual: {
      durasi_detik: 15,
      jarak_kamera: 35,
    },
    created_at: new Date().toISOString(),
  },
  {
    phenomenon_id: 'lunar-eclipse',
    planet_id: 'earth',
    judul: 'Gerhana Bulan Total (Blood Moon)',
    tipe_animasi: 'LUNAR_ECLIPSE',
    deskripsi_edukatif:
      'Terjadi saat posisi Bumi tepat berada di antara Matahari dan Bulan. Bulan masuk sepenuhnya ke dalam kerucut bayangan umbra Bumi. Cahaya merah berpanjang gelombang panjang terbiaskan oleh atmosfer Bumi ke permukaan Bulan, menghasilkan rona tembaga kemerahan spektakuler.',
    konfigurasi_visual: {
      durasi_detik: 20,
      jarak_kamera: 32,
    },
    created_at: new Date().toISOString(),
  },
  {
    phenomenon_id: 'moon-phases',
    planet_id: 'earth',
    judul: 'Siklus 8 Fase Bulan',
    tipe_animasi: 'MOON_PHASES',
    deskripsi_edukatif:
      'Perubahan bentuk kenampakan Bulan yang tampak dari Bumi terjadi karena perubahan sudut pencahayaan Matahari seiring Bulan menyelesaikan revolusi orbit sinodisnya (sekitar 29.5 hari): Bulan Baru, Sabit Awal, Perbani Awal, Cembung Awal, Purnama, Cembung Akhir, Perbani Akhir, dan Sabit Akhir.',
    konfigurasi_visual: {
      durasi_detik: 25,
      jarak_kamera: 28,
    },
    created_at: new Date().toISOString(),
  },
  {
    phenomenon_id: 'galilean-transit',
    planet_id: 'jupiter',
    judul: 'Transit Satelit Galilea di Jupiter',
    tipe_animasi: 'GALILEAN_TRANSIT',
    deskripsi_edukatif:
      'Empat satelit terbesar Jupiter yang ditemukan Galileo Galilei tahun 1610 (Io, Europa, Ganymede, Callisto) mengorbit dengan kecepatan berbeda dalam resonansi Laplace. Saat melintas di depan awan Jupiter, bayangan bulat pekat mereka tampak bergerak di atas atmosfer badai gas raksasa.',
    konfigurasi_visual: {
      durasi_detik: 30,
      jarak_kamera: 40,
    },
    created_at: new Date().toISOString(),
  },
];

export function PhenomenonOverlay() {
  const mode = useSceneStore((state) => state.mode);
  const switchMode = useSceneStore((state) => state.switchMode);
  const activePlanetId = useSceneStore((state) => state.activePlanetId);
  const activePhenomenon = useSceneStore((state) => state.activePhenomenon);
  const setActivePhenomenon = useSceneStore((state) => state.setActivePhenomenon);

  const [phenomenaList, setPhenomenaList] = useState<Phenomenon[]>(BUILTIN_PHENOMENA);
  const [selectedType, setSelectedType] = useState<AnimationType>(
    activePhenomenon?.tipe_animasi || (activePlanetId === 'jupiter' ? 'GALILEAN_TRANSIT' : 'SOLAR_ECLIPSE')
  );

  // Ambil fenomena dari Supabase atau fallback
  useEffect(() => {
    let isMounted = true;
    async function loadPhenomena() {
      try {
        const { data } = await supabase
          .from('phenomena')
          .select('*');

        if (isMounted) {
          if (data && data.length > 0) {
            setPhenomenaList(data);
          } else {
            setPhenomenaList(BUILTIN_PHENOMENA);
          }
        }
      } catch {
        if (isMounted) {
          setPhenomenaList(BUILTIN_PHENOMENA);
        }
      }
    }

    if (mode === 'PHENOMENON') {
      loadPhenomena();

      // Realtime subscription ke tabel phenomena (M-03)
      const channel = supabase
        .channel('public:realtime_phenomena')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'phenomena' }, () => {
          loadPhenomena();
        })
        .subscribe();

      const handleFocus = () => loadPhenomena();
      window.addEventListener('focus', handleFocus);

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
        window.removeEventListener('focus', handleFocus);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [mode]);

  // Set default aktif fenomena
  useEffect(() => {
    if (mode === 'PHENOMENON') {
      const match =
        phenomenaList.find((p) => p.tipe_animasi === selectedType) ||
        phenomenaList[0];
      if (match) {
        setActivePhenomenon(match);
      }
    }
  }, [mode, selectedType, phenomenaList, setActivePhenomenon]);

  if (mode !== 'PHENOMENON') return null;

  const currentItem =
    phenomenaList.find((p) => p.tipe_animasi === selectedType) ||
    BUILTIN_PHENOMENA[0];

  const handleSelectPhenomenon = (item: Phenomenon) => {
    setSelectedType(item.tipe_animasi);
    setActivePhenomenon(item);
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar: Selector Buttons */}
      <div className="pointer-events-auto max-w-4xl mx-auto w-full pt-16 sm:pt-14">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/85 p-2 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {phenomenaList.map((item) => {
            const isSelected = selectedType === item.tipe_animasi;
            return (
              <button
                key={item.phenomenon_id}
                type="button"
                onClick={() => handleSelectPhenomenon(item)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
              >
                {item.tipe_animasi === 'SOLAR_ECLIPSE' && <Sun className="h-3.5 w-3.5 text-amber-400" />}
                {item.tipe_animasi === 'LUNAR_ECLIPSE' && <Moon className="h-3.5 w-3.5 text-rose-400" />}
                {item.tipe_animasi === 'MOON_PHASES' && <Orbit className="h-3.5 w-3.5 text-cyan-400" />}
                {item.tipe_animasi === 'GALILEAN_TRANSIT' && <Sparkles className="h-3.5 w-3.5 text-purple-400" />}
                <span className="whitespace-nowrap">{item.judul}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Info Card: Educational Explanation (PRD R14) */}
      <div className="pointer-events-auto max-w-2xl mx-auto w-full mb-16">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 backdrop-blur-2xl shadow-2xl">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{currentItem.judul}</span>
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300 border border-indigo-500/30">
                    {currentItem.planet_id.toUpperCase()}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Simulasi Geometri Benda Langit (PRD R14)</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => switchMode('EXPLORE')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Compass className="h-3.5 w-3.5 text-cyan-400" />
              <span>Kembali ke Jelajah</span>
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-300 leading-relaxed text-justify">
            {currentItem.deskripsi_edukatif}
          </p>

          <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Simulasi interaktif 3D (drag layar untuk putar sudut pandang)</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-slate-500 font-mono text-[10px]">
              <span>Tipe: {currentItem.tipe_animasi}</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
