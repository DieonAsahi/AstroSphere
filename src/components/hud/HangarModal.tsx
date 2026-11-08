'use client';

import { useState } from 'react';
import {
  X,
  Rocket,
  Award,
  CheckCircle2,
  Shield,
  Gauge,
  Sparkles,
  Lock,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';

interface HangarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShipCatalogItem {
  id: string;
  name: string;
  lengthM: number;
  price: number;
  description: string;
  specs: {
    maneuver: string;
    speed: string;
    hull: string;
  };
  colorAccent: string;
}

const SHIPS: ShipCatalogItem[] = [
  {
    id: 'astra-scout',
    name: 'Astra Scout',
    lengthM: 12,
    price: 0,
    description:
      'Pesawat intai orbit ringan dengan kelincahan manuver tinggi, cocok untuk penjelajah awal tata surya.',
    specs: {
      maneuver: 'Sangat Tinggi',
      speed: '12 km/s',
      hull: 'Paduan Titanium Aerogel',
    },
    colorAccent: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'orion-glider',
    name: 'Orion Glider',
    lengthM: 15,
    price: 300,
    description:
      'Pesawat riset antar-planet bersayap delta dengan sensor telemetri ilmiah dan kestabilan aerodinamis kosmis.',
    specs: {
      maneuver: 'Seimbang',
      speed: '15 km/s',
      hull: 'Komposit Karbon Berlian',
    },
    colorAccent: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'nova-voyager',
    name: 'Nova Voyager',
    lengthM: 18,
    price: 700,
    description:
      'Kapal ekspedisi antariksa kelas berat berdaya dorong ionik ganda untuk pengamatan mendalam planet gas raksasa.',
    specs: {
      maneuver: 'Stabil Berat',
      speed: '18 km/s',
      hull: 'Lapisan Kristal Nanokomposit',
    },
    colorAccent: 'from-purple-500 to-indigo-600',
  },
];

export function HangarModal({ isOpen, onClose }: HangarModalProps) {
  const pointsBalance = usePlayerStore((state) => state.pointsBalance);
  const ownedShips = usePlayerStore((state) => state.ownedShips);
  const activeShipId = usePlayerStore((state) => state.activeShipId);
  const buyShip = usePlayerStore((state) => state.buyShip);
  const selectShip = usePlayerStore((state) => state.selectShip);

  const [messageNotice, setMessageNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBuy = (ship: ShipCatalogItem) => {
    const success = buyShip(ship.id, ship.price);
    if (success) {
      setMessageNotice(`Berhasil membeli & melengkapi ${ship.name}!`);
      setTimeout(() => setMessageNotice(null), 3000);
    } else {
      setMessageNotice('Poin Anda tidak mencukupi untuk membeli pesawat ini.');
      setTimeout(() => setMessageNotice(null), 3000);
    }
  };

  const handleEquip = (shipId: string) => {
    selectShip(shipId);
    setMessageNotice('Pesawat berhasil dipasang ke hanggar peluncuran!');
    setTimeout(() => setMessageNotice(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/95 p-6 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Rocket className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Hanggar Pesawat Antariksa</h2>
                <span className="text-[10px] font-mono rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                  PRD R11
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Koleksi dan kustomisasi armada penerbangan luar angkasa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Saldo Poin Pemain */}
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
              <Award className="h-4 w-4 text-amber-400" />
              <span className="font-mono text-xs font-bold text-amber-300">
                {pointsBalance} Poin
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {messageNotice && (
          <div className="mt-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-200 animate-in fade-in">
            {messageNotice}
          </div>
        )}

        {/* 3 Ships Showcase Cards */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-1">
          {SHIPS.map((ship) => {
            const isOwned = ownedShips.includes(ship.id);
            const isActive = activeShipId === ship.id;
            const canAfford = pointsBalance >= ship.price;

            return (
              <div
                key={ship.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all ${
                  isActive
                    ? 'border-cyan-500/60 bg-gradient-to-b from-cyan-950/30 to-slate-900/60 shadow-lg shadow-cyan-950/30'
                    : isOwned
                    ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    : 'border-slate-800/60 bg-slate-900/20 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Active Badge */}
                {isActive && (
                  <div className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-cyan-500 px-2 py-0.5 text-[9px] font-bold text-slate-950 shadow-sm shadow-cyan-500/50">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>DIGUNAKAN</span>
                  </div>
                )}

                <div>
                  {/* Visual Silhouette Placeholder */}
                  <div className="relative mb-3 flex h-28 items-center justify-center rounded-xl bg-slate-950/60 border border-slate-800/80 overflow-hidden">
                    <div
                      className={`absolute inset-0 bg-gradient-to-tr ${ship.colorAccent} opacity-10`}
                    />
                    <Rocket
                      className={`h-12 w-12 transition-transform duration-300 ${
                        isActive
                          ? 'text-cyan-400 scale-110 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                          : isOwned
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    />
                    <span className="absolute bottom-2 right-2 rounded bg-slate-900/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 border border-slate-800">
                      {ship.lengthM}m
                    </span>
                  </div>

                  {/* Title & Price */}
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-white">{ship.name}</h3>
                    <div className="font-mono text-xs font-bold text-amber-400">
                      {ship.price === 0 ? 'Gratis' : `${ship.price} Poin`}
                    </div>
                  </div>

                  <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                    {ship.description}
                  </p>

                  {/* Specs Table */}
                  <div className="mt-3 space-y-1 rounded-lg bg-slate-950/40 p-2.5 text-[10px]">
                    <div className="flex justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3 w-3 text-cyan-400" />
                        Kecepatan:
                      </span>
                      <span className="font-mono text-slate-200">{ship.specs.speed}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-indigo-400" />
                        Lambung:
                      </span>
                      <span className="font-mono text-slate-200">{ship.specs.hull}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/60">
                  {isActive ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl bg-cyan-500/20 border border-cyan-500/40 py-2 text-xs font-bold text-cyan-300 cursor-default"
                    >
                      Pesawat Aktif
                    </button>
                  ) : isOwned ? (
                    <button
                      type="button"
                      onClick={() => handleEquip(ship.id)}
                      className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-bold text-white transition-colors"
                    >
                      Gunakan Pesawat
                    </button>
                  ) : canAfford ? (
                    <button
                      type="button"
                      onClick={() => handleBuy(ship)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Beli ({ship.price} Poin)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 py-2 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Butuh {ship.price - pointsBalance} Poin Lagi</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
