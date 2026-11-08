'use client';

import { useState } from 'react';
import {
  Globe,
  Rocket,
  Award,
  Cloud,
  CheckCircle2,
  ChevronDown,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { usePlayerStore } from '@/store/usePlayerStore';

const PLANETS = [
  { id: 'mercury', name: 'Merkurius', emoji: '☿' },
  { id: 'venus', name: 'Venus', emoji: '♀' },
  { id: 'earth', name: 'Bumi', emoji: '♁' },
  { id: 'mars', name: 'Mars', emoji: '♂' },
  { id: 'jupiter', name: 'Jupiter', emoji: '♃' },
  { id: 'saturn', name: 'Saturnus', emoji: '♄' },
  { id: 'uranus', name: 'Uranus', emoji: '♅' },
  { id: 'neptune', name: 'Neptunus', emoji: '♆' },
];

interface TopNavigationProps {
  onOpenHangar: () => void;
  onOpenCloudSave: () => void;
}

export function TopNavigation({ onOpenHangar, onOpenCloudSave }: TopNavigationProps) {
  const activePlanetId = useSceneStore((state) => state.activePlanetId);
  const setActivePlanetId = useSceneStore((state) => state.setActivePlanetId);

  const pointsBalance = usePlayerStore((state) => state.pointsBalance);
  const activeShipId = usePlayerStore((state) => state.activeShipId);
  const setCheckpointPlanet = usePlayerStore((state) => state.setCheckpointPlanet);
  const cloudUsername = usePlayerStore((state) => state.cloudUsername);
  const isSyncing = usePlayerStore((state) => state.isSyncing);

  const [planetDropdownOpen, setPlanetDropdownOpen] = useState(false);

  const activePlanetObj =
    PLANETS.find((p) => p.id === activePlanetId) || PLANETS[2];

  const handleSelectPlanet = (planetId: string) => {
    setActivePlanetId(planetId);
    setCheckpointPlanet(planetId);
    setPlanetDropdownOpen(false);
  };

  const shipName =
    activeShipId === 'nova-voyager'
      ? 'Nova Voyager (18m)'
      : activeShipId === 'orion-glider'
      ? 'Orion Glider (15m)'
      : 'Astra Scout (12m)';

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 pointer-events-none">
      {/* Brand & Planet Selector */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Logo AstroSphere */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 backdrop-blur-md shadow-lg shadow-indigo-950/20">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-slate-950">
              <Globe className="h-4 w-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>AstroSphere</span>
              <span className="rounded bg-cyan-500/10 px-1 py-0.2 text-[9px] font-semibold text-cyan-400 border border-cyan-500/20">
                3D
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none">Edu Tata Surya</p>
          </div>
        </div>

        {/* Planet Dropdown Selector (R01, R08) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPlanetDropdownOpen(!planetDropdownOpen)}
            className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-slate-700 hover:bg-slate-900 backdrop-blur-md shadow-lg transition-all"
          >
            <span className="text-sm">{activePlanetObj.emoji}</span>
            <span className="font-semibold text-white">{activePlanetObj.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {planetDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-slate-800 bg-slate-950/95 p-1.5 backdrop-blur-xl shadow-2xl z-50">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-slate-400">
                Pilih Zona Planet
              </div>
              <div className="space-y-0.5">
                {PLANETS.map((planet) => (
                  <button
                    key={planet.id}
                    type="button"
                    onClick={() => handleSelectPlanet(planet.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                      planet.id === activePlanetId
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <span>{planet.emoji}</span>
                    <span>{planet.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        {/* Points Balance Badge (R10) */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 backdrop-blur-md">
          <Award className="h-4 w-4 text-amber-400" />
          <span className="font-mono text-xs font-bold text-amber-300">
            {pointsBalance}
          </span>
          <span className="text-[10px] text-amber-400/80">Poin</span>
        </div>

        {/* Hangar Pesawat Button (R11) */}
        <button
          type="button"
          onClick={onOpenHangar}
          className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-700 hover:bg-slate-900 backdrop-blur-md shadow-lg transition-colors"
        >
          <Rocket className="h-3.5 w-3.5 text-cyan-400" />
          <span className="hidden sm:inline font-mono text-[11px] text-slate-300">
            {shipName}
          </span>
          <span className="sm:hidden font-mono text-[11px]">Hanggar</span>
        </button>

        {/* Cloud Save Sync Button (Username & Password - R12) */}
        <button
          type="button"
          onClick={onOpenCloudSave}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-medium backdrop-blur-md shadow-lg transition-all ${
            cloudUsername
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
          }`}
          title={
            cloudUsername
              ? `Tersinkronisasi sebagai @${cloudUsername}`
              : 'Mode Tamu: Klik untuk tautkan ke Cloud dengan Username & Password'
          }
        >
          {isSyncing ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
          ) : cloudUsername ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Cloud className="h-3.5 w-3.5 text-slate-400" />
          )}
          <span className="hidden md:inline text-[11px]">
            {cloudUsername ? `@${cloudUsername}` : 'Mode Tamu (Lokal)'}
          </span>
        </button>

        {/* Admin Link */}
        <a
          href="/admin"
          className="rounded-2xl border border-slate-800 bg-slate-950/80 p-2 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          title="Panel Admin CMS"
        >
          <Shield className="h-3.5 w-3.5" />
        </a>
      </div>
    </header>
  );
}
