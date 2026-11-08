'use client';

import {
  Gauge,
  AlertTriangle,
  StopCircle,
  Compass,
  Zap,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { usePlayerStore } from '@/store/usePlayerStore';

export function FlightControlsHUD() {
  const mode = useSceneStore((state) => state.mode);
  const isShipVisible = useSceneStore((state) => state.isShipVisible);
  const currentSpeed = useSceneStore((state) => state.currentSpeed);
  const nearBoundary = useSceneStore((state) => state.nearBoundary);
  const boundaryRatio = useSceneStore((state) => state.boundaryRatio);
  const stopShip = useSceneStore((state) => state.stopShip);

  const activeShipId = usePlayerStore((state) => state.activeShipId);

  if (mode !== 'EXPLORE' || !isShipVisible) return null;

  const shipMeta =
    activeShipId === 'nova-voyager'
      ? { name: 'Nova Voyager', length: '18m', role: 'Heavy Cruiser' }
      : activeShipId === 'orion-glider'
      ? { name: 'Orion Glider', length: '15m', role: 'Fast Glider' }
      : { name: 'Astra Scout', length: '12m', role: 'Scout Fighter' };

  return (
    <>
      {/* Boundary Warning Alert (R02) */}
      {nearBoundary && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-2xl border border-red-500/50 bg-red-950/80 px-5 py-2.5 text-xs text-red-200 backdrop-blur-md shadow-2xl animate-pulse">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <div>
            <span className="font-bold">Peringatan Batas Zona Terbang ({Math.round(boundaryRatio * 100)}%)</span>
            <span className="text-[11px] text-red-300 ml-2">Sistem Rem Otomatis Diaktifkan (PRD R02)</span>
          </div>
        </div>
      )}

      {/* Flight HUD Widget (Kiri Bawah) */}
      <div className="fixed bottom-24 left-6 z-30 flex flex-col gap-3 pointer-events-none">
        {/* Speedometer & Ship Info Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 backdrop-blur-md shadow-xl pointer-events-auto min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold uppercase">
              <Compass className="h-3 w-3 text-cyan-400" />
              <span>{shipMeta.name}</span>
            </div>
            <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400 border border-cyan-500/20">
              {shipMeta.length}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-cyan-400" />
              <div>
                <span className="font-mono text-2xl font-extrabold tracking-tight text-white">
                  {currentSpeed}
                </span>
                <span className="text-xs text-slate-400 ml-1">km/s</span>
              </div>
            </div>

            {/* Tombol Berhenti Darurat (R03) */}
            <button
              type="button"
              onClick={stopShip}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 text-[11px] font-bold text-red-300 transition-colors shadow-sm"
              title="Nolkan kecepatan seketika (R03)"
            >
              <StopCircle className="h-3.5 w-3.5 text-red-400" />
              <span>Berhenti</span>
            </button>
          </div>

          {/* Speed Indicator Bar */}
          <div className="mt-3 w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                nearBoundary
                  ? 'bg-red-500'
                  : currentSpeed > 200
                  ? 'bg-amber-400'
                  : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, (currentSpeed / 400) * 100)}%` }}
            />
          </div>
        </div>

        {/* Keyboard Flight Keybind Guide */}
        <div className="hidden sm:flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/70 px-3.5 py-2 text-[10px] text-slate-400 backdrop-blur-md pointer-events-auto">
          <div className="flex items-center gap-1">
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200 border border-slate-700">W</span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200 border border-slate-700">S</span>
            <span>Maju/Mundur</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200 border border-slate-700">A</span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200 border border-slate-700">D</span>
            <span>Belok</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-300">
            <Zap className="h-3 w-3" />
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200 border border-slate-700">Shift</span>
            <span>Boost</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200 border border-slate-700">Spasi</span>
            <span>Rem</span>
          </div>
        </div>
      </div>
    </>
  );
}
