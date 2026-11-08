'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Globe,
  Rocket,
  Sparkles,
  Compass,
  ArrowRight,
  Shield,
  Award,
  Cloud,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { usePlayerStore } from '@/store/usePlayerStore';

// Code-splitting WebGL Canvas dengan dynamic import (ssr: false) agar SSR Vercel aman
const AstroCanvas = dynamic(() => import('@/components/canvas/AstroCanvas'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mb-4" />
      <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
        <Sparkles className="h-4 w-4 animate-pulse text-cyan-400" />
        <span>Memuat Core 3D WebGL Engine AstroSphere...</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500 font-mono">
        Shader Atmosfer &bull; Prosedural Tata Surya &bull; Fisika 3D
      </p>
    </div>
  ),
});

// Import HUD 2D
import { TopNavigation } from '@/components/hud/TopNavigation';
import { FlightControlsHUD } from '@/components/hud/FlightControlsHUD';
import { ModeSwitcherBar } from '@/components/hud/ModeSwitcherBar';
import { DescriptionPanel } from '@/components/hud/DescriptionPanel';
import { HistoryTimeline } from '@/components/hud/HistoryTimeline';
import { PhenomenonOverlay } from '@/components/hud/PhenomenonOverlay';
import { QuizModal } from '@/components/hud/QuizModal';
import { HangarModal } from '@/components/hud/HangarModal';
import { CloudSaveModal } from '@/components/hud/CloudSaveModal';

export default function PlayerHomePage() {
  const mode = useSceneStore((state) => state.mode);
  const switchMode = useSceneStore((state) => state.switchMode);
  const initializePlayer = usePlayerStore((state) => state.initializePlayer);
  const cloudUsername = usePlayerStore((state) => state.cloudUsername);

  const [isHangarOpen, setIsHangarOpen] = useState(false);
  const [isCloudSaveOpen, setIsCloudSaveOpen] = useState(false);
  const [hasStartedExploration, setHasStartedExploration] = useState(false);

  // Inisialisasi data pemain dari LocalStorage / Cloud
  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950 select-none">
      {/* 1. Core 3D WebGL Engine (Three.js / React Three Fiber) */}
      <AstroCanvas />

      {/* 2. Top Navigation Bar (Planet Switcher, Points, Hangar, Cloud Save Button) */}
      <TopNavigation
        onOpenHangar={() => setIsHangarOpen(true)}
        onOpenCloudSave={() => setIsCloudSaveOpen(true)}
      />

      {/* 3. Flight Controls HUD (Speedometer, WASD Helper, Tombol Berhenti R03, Batas 80% R02) */}
      <FlightControlsHUD />

      {/* 4. Bottom Mode Switcher Bar (Jelajah | Deskripsi | Sejarah | Fenomena | Kuis) */}
      <ModeSwitcherBar />

      {/* 5. Contextual Education Panels & Modals */}
      {/* Panel Materi & Data Ilmiah (R05) */}
      {mode === 'DESCRIPTION' && <DescriptionPanel />}

      {/* Linimasa Sejarah & POI Filter Tahun (R04) */}
      {mode === 'HISTORY' && <HistoryTimeline />}

      {/* Simulasi Fenomena Astronomi & Umbra/Penumbra (R14) */}
      {mode === 'PHENOMENON' && <PhenomenonOverlay />}

      {/* Kuis Formatif Bebas Stres (R10) */}
      {mode === 'QUIZ' && <QuizModal />}

      {/* Modal Hanggar 3 Pesawat Reward (R09, R11) */}
      <HangarModal isOpen={isHangarOpen} onClose={() => setIsHangarOpen(false)} />

      {/* Modal Cloud Save Username & Password Saja (R12 - Gaya .IO) */}
      <CloudSaveModal
        isOpen={isCloudSaveOpen}
        onClose={() => setIsCloudSaveOpen(false)}
      />

      {/* 6. Layar Awal Welcoming Hero Overlay (Memungkinkan klik "Mulai Jelajah" seketika tanpa login) */}
      {!hasStartedExploration && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center shadow-2xl shadow-indigo-950/60 backdrop-blur-xl">
            {/* Ambient Backlight */}
            <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

            {/* Logo Emblem */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 p-0.5 shadow-xl shadow-cyan-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950">
                <Globe className="h-8 w-8 text-cyan-400 animate-pulse" />
              </div>
            </div>

            {/* Badges */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Edu Planet 3D &bull; Kurikulum Bebas Stres</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              AstroSphere
            </h1>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              Jelajahi 8 planet tata surya secara 3D, pelajari misi bersejarah dan fenomena antariksa, serta kumpulkan poin kuis untuk membuka armada pesawat antariksa!
            </p>

            {/* Feature Highlights Grid */}
            <div className="mt-5 grid grid-cols-3 gap-2.5 text-left text-[11px]">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                <div className="flex items-center gap-1.5 font-bold text-cyan-400 mb-0.5">
                  <Compass className="h-3.5 w-3.5" />
                  <span>Jelajah Bebas</span>
                </div>
                <p className="text-[10px] text-slate-400">Terbang santai dengan batas zona aman 80%</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-0.5">
                  <Award className="h-3.5 w-3.5" />
                  <span>Kuis Edukatif</span>
                </div>
                <p className="text-[10px] text-slate-400">1.200 poin total untuk klaim armada</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-400 mb-0.5">
                  <Cloud className="h-3.5 w-3.5" />
                  <span>Cloud Save .IO</span>
                </div>
                <p className="text-[10px] text-slate-400">Tanpa email, cukup ingat username</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setHasStartedExploration(true);
                  switchMode('EXPLORE');
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-indigo-500 hover:from-cyan-400 hover:to-indigo-500 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-cyan-500/25 transition-all hover:scale-105"
              >
                <Rocket className="h-4 w-4" />
                <span>Mulai Jelajah Antariksa (Mode Tamu)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              {!cloudUsername && (
                <button
                  type="button"
                  onClick={() => {
                    setHasStartedExploration(true);
                    setIsCloudSaveOpen(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 px-4 py-3 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <Cloud className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Tautkan Akun Cloud</span>
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-slate-500">
              <span>Mode Tamu Aktif Secara Otomatis</span>
              <span>&bull;</span>
              <a href="/admin/login" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>Panel Admin</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
