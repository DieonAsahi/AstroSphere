import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CelestialBody, PointOfInterest } from '../data/types';
import { PoiPanel } from './PoiPanel';

// Mock sub-komponen 3D canvas untuk pengujian DOM dan aksesibilitas panel di jsdom
vi.mock('../scene/TerrainViewer', () => ({
  TerrainViewer: ({ poi }: { poi: PointOfInterest }) => (
    <div data-testid="terrain-viewer">
      <h4>Model Topografi 3D {poi.name}</h4>
      <p>Simulasi topografi 3D untuk pengujian</p>
    </div>
  ),
}));

vi.mock('./ScaleComparison3D', () => ({
  ScaleComparison3D: ({ poi }: { poi: PointOfInterest }) => (
    <div data-testid="scale-comparison-3d">
      <h4>Visualisasi Skala 3D {poi.name}</h4>
      <p>Simulasi perbandingan skala 3D untuk pengujian</p>
    </div>
  ),
}));

const mockBodyMars: CelestialBody = {
  id: 'mars',
  slug: 'mars',
  name: 'Mars',
  type: 'planet',
  diameterKm: 6779,
  massKg: null,
  rotationPeriodH: 24.6,
  axialTiltDeg: 25.2,
  semiMajorAxisAu: 1.52,
  eccentricity: 0.093,
  inclinationDeg: 1.85,
  orbitPeriodDays: 687,
  textureUrls: { low: '', mid: '', high: '' },
  description: 'Planet Mars',
  sources: ['NASA Mars'],
};

const mockPoiOlympus: PointOfInterest = {
  id: 'mars-olympus-mons',
  bodyId: 'mars',
  slug: 'olympus-mons',
  name: 'Olympus Mons',
  type: 'gunung',
  lat: 18.65,
  lon: 226.2,
  historyText:
    'Olympus Mons adalah gunung berapi perisai raksasa di Mars.\n\nDibentuk oleh akumulasi lava basal cair selama jutaan tahun.',
  dimensions: [
    {
      label: 'Tinggi dari datum',
      nilai: 21.9,
      satuan: 'km',
      sumber: 'NASA MOLA',
    },
    {
      label: 'Diameter dasar',
      nilai: 624,
      satuan: 'km',
      sumber: 'USGS Astrogeology',
    },
    {
      label: 'Dimensi belum terverifikasi',
      nilai: null,
      satuan: 'km',
      sumber: 'Data awal; perlu verifikasi',
    },
  ],
  sources: [
    'https://science.nasa.gov/mars/',
    'USGS Astrogeology Science Center MDIM',
  ],
};

const mockPoiStorm: PointOfInterest = {
  id: 'jupiter-great-red-spot',
  bodyId: 'jupiter',
  slug: 'badai-merah-raksasa',
  name: 'Badai Merah Raksasa',
  type: 'badai',
  lat: -22,
  lon: 270,
  historyText: 'Badai gas raksasa di atmosfer Jupiter.',
  dimensions: [
    {
      label: 'Lebar badai',
      nilai: 16350,
      satuan: 'km',
      sumber: 'NASA Juno Mission',
    },
  ],
  particleConfig: {
    type: 'badai',
    count: 800,
    color: '#c95f45',
  },
  sources: ['https://science.nasa.gov/jupiter/'],
};

describe('PoiPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders header, title, parent planet, and announces in aria-live', () => {
    const handleClose = vi.fn();
    render(
      <PoiPanel
        poi={mockPoiOlympus}
        body={mockBodyMars}
        onClose={handleClose}
      />,
    );

    // Judul dan eyebrow planet induk
    expect(
      screen.getByRole('heading', { level: 2, name: 'Olympus Mons' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Gunung Berapi Perisai · Mars'),
    ).toBeInTheDocument();

    // Pengumuman aria-live polite
    const liveAnnouncement = screen.getByRole('status', { hidden: true });
    expect(liveAnnouncement).toHaveTextContent(
      'Panel informasi Olympus Mons dibuka.',
    );
  });

  it('calls onPoiViewed and logs to console when panel mounts', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    render(
      <PoiPanel poi={mockPoiOlympus} body={mockBodyMars} onClose={vi.fn()} />,
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      '[AstroSphere] POI viewed:',
      'mars-olympus-mons',
    );
    consoleSpy.mockRestore();
  });

  it('navigates through accessible tabs (Sejarah, Dimensi, Topografi 3D, Sumber)', async () => {
    const user = userEvent.setup();
    render(
      <PoiPanel poi={mockPoiOlympus} body={mockBodyMars} onClose={vi.fn()} />,
    );

    // Tab default adalah Sejarah
    expect(
      screen.getByText(/Olympus Mons adalah gunung berapi perisai raksasa/i),
    ).toBeInTheDocument();

    // Beralih ke Tab Dimensi
    const dimTab = screen.getByRole('tab', { name: 'Dimensi' });
    await user.click(dimTab);
    expect(dimTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Tinggi dari datum')).toBeInTheDocument();
    expect(screen.getByText('21,9 km')).toBeInTheDocument();
    expect(screen.getByText('NASA MOLA')).toBeInTheDocument();
    // Nilai null menampilkan "Perlu verifikasi"
    expect(screen.getByText('Perlu verifikasi')).toBeInTheDocument();
    expect(screen.getByTestId('scale-comparison-3d')).toBeInTheDocument();

    // Beralih ke Tab Topografi 3D
    const terrainTab = screen.getByRole('tab', { name: 'Topografi 3D' });
    await user.click(terrainTab);
    expect(terrainTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('terrain-viewer')).toBeInTheDocument();

    // Beralih ke Tab Sumber
    const sourcesTab = screen.getByRole('tab', { name: 'Sumber' });
    await user.click(sourcesTab);
    expect(sourcesTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('link', { name: /science\.nasa\.gov\/mars/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('USGS Astrogeology Science Center MDIM'),
    ).toBeInTheDocument();
  });

  it('adapts tabs for atmospheric storm POI (replaces surface terrain with Dinamika Atmosfer)', async () => {
    const user = userEvent.setup();
    render(
      <PoiPanel
        poi={mockPoiStorm}
        body={{ ...mockBodyMars, id: 'jupiter', name: 'Jupiter' }}
        onClose={vi.fn()}
      />,
    );

    // Tab Topografi 3D tidak muncul; diganti dengan Dinamika Atmosfer
    expect(
      screen.queryByRole('tab', { name: 'Topografi 3D' }),
    ).not.toBeInTheDocument();
    const atmosphereTab = screen.getByRole('tab', {
      name: 'Dinamika Atmosfer',
    });
    expect(atmosphereTab).toBeInTheDocument();

    await user.click(atmosphereTab);
    expect(
      screen.getByText('Bagaimana Badai Ini Terbentuk?'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Apa itu Antisiklon\?/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Jeda Simulasi/i }),
    ).toBeInTheDocument();
  });

  it('closes panel when clicking close button or pressing Escape, and returns focus to POI marker', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    // Siapkan elemen penanda POI di DOM untuk menguji pemulihan fokus
    const markerButton = document.createElement('button');
    markerButton.setAttribute('data-poi-id', 'mars-olympus-mons');
    markerButton.textContent = 'Penanda Olympus Mons';
    document.body.appendChild(markerButton);

    const { unmount } = render(
      <PoiPanel
        poi={mockPoiOlympus}
        body={mockBodyMars}
        onClose={handleClose}
      />,
    );

    // Verifikasi tombol tutup
    const closeBtn = screen.getByRole('button', {
      name: 'Tutup panel titik minat',
    });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(document.activeElement).toBe(markerButton);
    });

    // Uji juga penutupan melalui tombol Escape pada window
    handleClose.mockClear();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    unmount();
    document.body.removeChild(markerButton);
  });

  it('passes accessibility audit with zero axe violations', async () => {
    const { container } = render(
      <PoiPanel poi={mockPoiOlympus} body={mockBodyMars} onClose={vi.fn()} />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
