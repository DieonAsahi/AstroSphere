import { useEffect, useState } from 'react';
import { id } from '../lib/i18n/id';
import { GlassPanel } from './GlassPanel';
import { HudLabel } from './HudLabel';
import { IconButton } from './IconButton';
import { Kbd } from './Kbd';
import { QualitySettings } from './QualitySettings';
import { Slider } from './Slider';
import { Tooltip } from './Tooltip';
import { useSceneStore } from '../state/sceneStore';
import { useUiStore } from '../state/uiStore';
import { Chip } from './Chip';
import { bodyRepository } from '../data/repository/bodyRepository';
import { poiRepository } from '../data/repository/poiRepository';
import type { CelestialBody } from '../data/types';
import { useNavigate } from 'react-router-dom';
import { SearchPalette } from './SearchPalette';
import { CelestialBodiesDrawer } from './CelestialBodiesDrawer';
import { KeyboardHelpModal } from './KeyboardHelpModal';
import { ToastNotification } from './ToastNotification';
import { useAuthStore } from '../features/classes/authStore';
import { TourListModal } from '../features/tours/TourListModal';
import { TourBuilderModal } from '../features/tours/TourBuilderModal';
import { AboutCreditsModal } from './AboutCreditsModal';

export function Hud() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tourListOpen, setTourListOpen] = useState(false);
  const [tourBuilderOpen, setTourBuilderOpen] = useState(false);
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);

  const orbitDay = useSceneStore((state) => state.simulationTimeScale);
  const isPaused = useSceneStore((state) => state.isOrbitPaused);
  const setOrbitDay = useSceneStore((state) => state.setSimulationTimeScale);
  const setOrbitPaused = useSceneStore((state) => state.setOrbitPaused);
  const requestCameraReset = useUiStore((state) => state.requestCameraReset);
  const selectedBodyId = useSceneStore((state) => state.selectedBodyId);
  const selectedPoiId = useSceneStore((state) => state.selectedPoiId);
  const navigate = useNavigate();
  const [bodies, setBodies] = useState<CelestialBody[]>([]);
  const [allPois, setAllPois] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void bodyRepository
      .listBodies()
      .then((items) =>
        setBodies(items.filter((body) => body.type === 'planet')),
      );
    void poiRepository
      .listPois()
      .then((items) =>
        setAllPois(items.map((p) => ({ id: p.id, name: p.name }))),
      );
  }, []);

  // Tangani shortcut global: Ctrl/Cmd+K untuk Search, '?' untuk Bantuan Pintasan
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Abaikan bila pengguna sedang mengetik di input / textarea
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }

      if (e.key === '?' && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const activeBodyName =
    bodies.find((b) => b.id === selectedBodyId)?.name ?? selectedBodyId;
  const activePoiName = allPois.find((p) => p.id === selectedPoiId)?.name;

  return (
    <>
      <div
        className="hud-shell"
        aria-label="Antarmuka observatorium AstroSphere"
      >
        <div className="hud-region hud-top-left">
          <GlassPanel className="brand-lockup">
            <span className="brand-mark" aria-hidden="true" />
            <div>
              <div className="brand-name">{id.appName}</div>
              <div className="breadcrumb">
                Tata Surya
                {selectedBodyId ? ` / ${activeBodyName}` : ' / Jelajah'}
                {activePoiName ? ` / ${activePoiName}` : ''}
              </div>
            </div>
          </GlassPanel>
          <Tooltip content="Ukuran planet dan jarak orbit dikompresi agar mudah dijelajahi; tidak mengikuti skala astronomi nyata.">
            <Chip tabIndex={0}>Skala tidak sebenarnya</Chip>
          </Tooltip>
        </div>

        <div className="hud-region hud-top-right">
          <IconButton
            label="Cari benda langit (Ctrl+K)"
            icon={<span aria-hidden="true">⌕</span>}
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(true)}
          />
          <IconButton
            label="Daftar benda langit"
            icon={<span aria-hidden="true">≡</span>}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          />
          <IconButton
            label="Bantuan tombol pintas (?)"
            icon={<span aria-hidden="true">?</span>}
            aria-haspopup="dialog"
            aria-expanded={shortcutsOpen}
            onClick={() => setShortcutsOpen(true)}
          />
          <IconButton
            label={id.about.buttonLabel}
            icon={<span aria-hidden="true">ℹ️</span>}
            aria-haspopup="dialog"
            aria-expanded={aboutOpen}
            onClick={() => setAboutOpen(true)}
          />
          <IconButton
            label={id.tours.hub.buttonLabel}
            icon={<span aria-hidden="true">🚀</span>}
            aria-haspopup="dialog"
            aria-expanded={tourListOpen}
            onClick={() => setTourListOpen(true)}
          />
          <IconButton
            label={id.progress.myExplorationsTitle}
            icon={<span aria-hidden="true">⭐</span>}
            onClick={() => navigate('/jelajahku')}
          />
          {user?.role === 'admin' && (
            <IconButton
              label="Buka CMS Admin"
              icon={<span aria-hidden="true">🛠️</span>}
              onClick={() => navigate('/admin')}
            />
          )}
          {user ? (
            <button
              type="button"
              className="chip cursor-pointer"
              onClick={() => navigate('/kelas')}
              aria-label={`Buka manajemen kelas (${user.name})`}
              title={`Masuk sebagai ${user.name} (${id.auth.roles[user.role]})`}
            >
              <span aria-hidden="true">👤</span>
              <span>{user.name.split(' ')[0]}</span>
              <span style={{ opacity: 0.7 }}>({id.auth.roles[user.role]})</span>
            </button>
          ) : (
            <IconButton
              label="Masuk atau Buka Kelas"
              icon={<span aria-hidden="true">👤</span>}
              onClick={() => navigate('/masuk')}
            />
          )}
          <IconButton
            label={settingsOpen ? 'Tutup pengaturan' : 'Buka pengaturan'}
            icon={<span aria-hidden="true">⚙</span>}
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
          />
          {settingsOpen ? (
            <GlassPanel
              style={{
                position: 'absolute',
                right: 0,
                top: 52,
                width: 280,
                padding: 16,
              }}
            >
              <QualitySettings />
            </GlassPanel>
          ) : null}
        </div>

        <div className="hud-region hud-bottom-center">
          <GlassPanel className="time-control">
            <button
              type="button"
              className="icon-button"
              aria-label={isPaused ? 'Mulai orbit' : 'Jeda orbit'}
              onClick={() => setOrbitPaused(!isPaused)}
            >
              {isPaused ? '▶' : 'Ⅱ'}
            </button>
            <div>
              <HudLabel label="Waktu orbit" value={orbitDay} unit="×" />
              <Slider
                aria-label="Kecepatan waktu orbit"
                min={1}
                max={365}
                step={1}
                value={orbitDay}
                onChange={(event) => setOrbitDay(Number(event.target.value))}
              />
            </div>
            <Kbd>Space</Kbd>
          </GlassPanel>
        </div>

        <div className="hud-region hud-bottom-right">
          <IconButton
            label="Reset kamera ke posisi awal"
            icon={<span aria-hidden="true">↺</span>}
            onClick={requestCameraReset}
          />
          {selectedBodyId ? (
            <button
              type="button"
              className="icon-button"
              aria-label="Kembali ke tata surya"
              title="Kembali ke tata surya"
              onClick={() => {
                navigate('/');
                requestCameraReset();
              }}
            >
              ←
            </button>
          ) : null}
        </div>
      </div>

      {/* Palet Perintah / Dialog Pencarian (FR-06) */}
      <SearchPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Drawer Direktori Benda Langit (FR-06 & Alternatif Non-Kanvas Ramah Aksesibilitas) */}
      <CelestialBodiesDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Modal Bantuan Tombol Pintas */}
      <KeyboardHelpModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Notifikasi Toast Otomatis Penurunan Kualitas (FR-12) */}
      <ToastNotification />

      {/* Modal Katalog Tur Terpandu (FR-08) */}
      <TourListModal
        isOpen={tourListOpen}
        onClose={() => setTourListOpen(false)}
        onOpenBuilder={(tourId) => {
          setEditingTourId(tourId ?? null);
          setTourBuilderOpen(true);
        }}
      />

      {/* Modal Pembuat Tur Guru (FR-08) */}
      <TourBuilderModal
        isOpen={tourBuilderOpen}
        onClose={() => {
          setTourBuilderOpen(false);
          setEditingTourId(null);
        }}
        editingTourId={editingTourId}
      />

      {/* Modal Tentang AstroSphere & Kredit Lisensi Aset */}
      <AboutCreditsModal
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />
    </>
  );
}
