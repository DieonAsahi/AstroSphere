import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { id } from '../lib/i18n/id';
import { Button } from './Button';
import { GlassPanel } from './GlassPanel';
import { IconButton } from './IconButton';

interface AboutCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AssetCredit {
  category: string;
  item: string;
  creator: string;
  license: string;
  sourceUrl: string;
}

const ASSET_CREDITS: AssetCredit[] = [
  {
    category: 'Tekstur Permukaan',
    item: 'Peta Tekstur Planet & Bulan (Equirectangular 2:1)',
    creator: 'NASA / JPL-Caltech / USGS Astrogeology Science Center',
    license: 'Domain Publik (NASA Open Data Policy)',
    sourceUrl: 'https://science.nasa.gov',
  },
  {
    category: 'Topografi Medan 3D',
    item: 'Olympus Mons Heightmap & MOLA Altimetry',
    creator: 'NASA MGS / MOLA Science Team & USGS',
    license: 'Domain Publik (Data Ilmiah Terbuka)',
    sourceUrl: 'https://astrogeology.usgs.gov',
  },
  {
    category: 'Dinamika Atmosfer',
    item: 'Data Kecepatan Angin & Dimensi Badai Merah Raksasa',
    creator: 'NASA Juno Mission (MWR & JIRAM) & HST OPAL Team',
    license: 'Domain Publik / Lisensi Edukasi Ilmiah',
    sourceUrl: 'https://science.nasa.gov/mission/juno',
  },
  {
    category: 'Model 3D',
    item: 'Wahana Antariksa & Penanda Geologi',
    creator: 'NASA 3D Resources Repository',
    license: 'Domain Publik',
    sourceUrl: 'https://nasa3d.arc.nasa.gov',
  },
  {
    category: 'Tipografi',
    item: 'Space Grotesk & IBM Plex Sans',
    creator: 'Florian Karsten & IBM Typography Team',
    license: 'SIL Open Font License 1.1 (OFL)',
    sourceUrl: 'https://scripts.sil.org/OFL',
  },
  {
    category: 'Pustaka Perangkat Lunak',
    item: 'Three.js, React, @react-three/fiber, Zustand, Zod, Vite',
    creator: 'Komunitas Pengembang Open Source Global',
    license: 'MIT License',
    sourceUrl: 'https://opensource.org/licenses/MIT',
  },
];

export function AboutCreditsModal({ isOpen, onClose }: AboutCreditsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  // Tangani tombol Escape dan fokus modal saat terbuka
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="drawer-backdrop"
      onClick={onClose}
      role="presentation"
      data-testid="about-modal-backdrop"
    >
      <GlassPanel
        className="celestial-drawer about-credits-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="celestial-drawer__header">
          <div>
            <h2 id="about-dialog-title" className="celestial-drawer__title">
              {id.about.title}
            </h2>
            <p className="celestial-drawer__subtitle">{id.about.subtitle}</p>
          </div>
          <IconButton
            ref={closeButtonRef}
            label={id.about.closeLabel}
            icon={<span aria-hidden="true">✕</span>}
            className="celestial-drawer__close"
            onClick={onClose}
          />
        </div>

        <div className="celestial-drawer__content" tabIndex={0}>
          {/* Bagian Visi & Misi */}
          <section className="about-section" aria-labelledby="mission-title">
            <h3 id="mission-title" className="about-section__title">
              🌟 {id.about.missionTitle}
            </h3>
            <p className="about-section__text">{id.about.missionDesc}</p>
          </section>

          {/* Tabel Atribusi Lisensi Aset */}
          <section className="about-section" aria-labelledby="credits-title">
            <h3 id="credits-title" className="about-section__title">
              📜 {id.about.assetsTitle}
            </h3>
            <p className="about-section__subtitle">{id.about.assetsSubtitle}</p>

            <div className="table-container">
              <table
                className="audit-table"
                aria-label="Tabel atribusi lisensi aset dan data sains"
              >
                <thead>
                  <tr>
                    <th scope="col">Kategori</th>
                    <th scope="col">Nama Aset / Modul</th>
                    <th scope="col">Pencipta / Sumber</th>
                    <th scope="col">Lisensi</th>
                  </tr>
                </thead>
                <tbody>
                  {ASSET_CREDITS.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <span className="badge-action badge-action--create">
                          {item.category}
                        </span>
                      </td>
                      <td>
                        <strong>{item.item}</strong>
                      </td>
                      <td>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-primary"
                          style={{
                            color: 'var(--color-accent-amber)',
                            textDecoration: 'underline',
                          }}
                        >
                          {item.creator}
                        </a>
                      </td>
                      <td>
                        <span style={{ fontSize: 'var(--font-size-xs)' }}>
                          {item.license}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Privasi & Kepatuhan UU PDP */}
          <section className="about-section" aria-labelledby="privacy-title">
            <h3 id="privacy-title" className="about-section__title">
              🛡️ {id.about.privacyTitle}
            </h3>
            <p className="about-section__text">{id.about.privacyDesc}</p>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Button
                onClick={() => {
                  onClose();
                  navigate('/kebijakan-privasi');
                }}
              >
                {id.about.viewPrivacyPolicy} ➔
              </Button>
            </div>
          </section>
        </div>
      </GlassPanel>
    </div>
  );
}
