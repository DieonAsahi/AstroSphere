'use client';

import type { ComponentType } from 'react';
import { Compass, BookOpen, History, Orbit, HelpCircle } from 'lucide-react';
import { useSceneStore, type SceneMode } from '@/store/useSceneStore';

interface ModeItem {
  id: SceneMode;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}

const MODES: ModeItem[] = [
  {
    id: 'EXPLORE',
    label: 'Jelajah 3D',
    shortLabel: 'Jelajah',
    icon: Compass,
    description: 'Kemudikan pesawat luar angkasa mengorbit planet',
  },
  {
    id: 'DESCRIPTION',
    label: 'Data & Materi',
    shortLabel: 'Materi',
    icon: BookOpen,
    description: 'Data ilmiah, parameter orbit, dan kurikulum edukasi',
  },
  {
    id: 'HISTORY',
    label: 'Linimasa POI',
    shortLabel: 'Sejarah',
    icon: History,
    description: 'Misi antariksa bersejarah dan pendaratan probe',
  },
  {
    id: 'PHENOMENON',
    label: 'Simulasi Fenomena',
    shortLabel: 'Fenomena',
    icon: Orbit,
    description: 'Simulasi gerhana, fase bulan, & transit satelit',
  },
  {
    id: 'QUIZ',
    label: 'Kuis Edukasi',
    shortLabel: 'Kuis',
    icon: HelpCircle,
    description: 'Uji pemahaman materi dan raih saldo poin',
  },
];

export function ModeSwitcherBar() {
  const currentMode = useSceneStore((state) => state.mode);
  const switchMode = useSceneStore((state) => state.switchMode);

  return (
    <nav
      aria-label="Mode Navigasi Edukasi"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-slate-800 bg-slate-950/85 p-1.5 sm:p-2 backdrop-blur-xl shadow-2xl shadow-indigo-950/40">
        {MODES.map((item) => {
          const Icon = item.icon;
          const isActive = currentMode === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => switchMode(item.id)}
              title={`${item.label} — ${item.description}`}
              className={`relative flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              {/* Active Indicator Pip */}
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
              )}

              <Icon
                className={`h-4 w-4 shrink-0 transition-transform ${
                  isActive ? 'text-cyan-400 scale-110' : 'text-slate-400'
                }`}
              />

              {/* Responsive Text */}
              <span className="hidden md:inline whitespace-nowrap">{item.label}</span>
              <span className="md:hidden text-[11px] whitespace-nowrap">{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
