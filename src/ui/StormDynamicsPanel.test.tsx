import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PointOfInterest } from '../data/types';
import { useParticleStormStore } from '../state/particleStormStore';
import { useQualityStore } from '../state/qualityStore';
import { StormDynamicsPanel } from './StormDynamicsPanel';

const mockPoiStorm: PointOfInterest = {
  id: 'jupiter-great-red-spot',
  bodyId: 'jupiter',
  slug: 'badai-merah-raksasa',
  name: 'Badai Merah Raksasa',
  type: 'badai',
  lat: -22,
  lon: 270,
  historyText: 'Badai gas raksasa.',
  dimensions: [],
  particleConfig: {
    type: 'badai_antisiklonik',
    count: 40000,
    speed: 1.2,
    vortexRadius: 0.32,
    color: '#d9381e',
    secondaryColor: '#e67332',
    coreColor: '#f6e2c3',
    direction: 'counterclockwise',
  },
  sources: [],
};

describe('StormDynamicsPanel', () => {
  beforeEach(() => {
    useParticleStormStore.getState().reset();
    useQualityStore.setState({ quality: 'mid', reducedMotion: false });
  });

  it('renders interactive controls and educational info sections', () => {
    render(<StormDynamicsPanel poi={mockPoiStorm} />);

    // Kontrol partikel
    expect(
      screen.getByText('Kontrol Simulasi Partikel GPU'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Jeda Simulasi' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /Kecepatan Pusaran/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /Kepadatan Partikel/i }),
    ).toBeInTheDocument();

    // Informasi pembentukan badai
    expect(
      screen.getByText('Bagaimana Badai Ini Terbentuk?'),
    ).toBeInTheDocument();
    expect(screen.getByText('Apa itu Antisiklon?')).toBeInTheDocument();
    expect(
      screen.getByText(/Mengapa Bertahan Ratusan Tahun/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Penyusutan Ukuran dari Abad ke Abad'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Misteri yang Belum Terpecahkan/i),
    ).toBeInTheDocument();
  });

  it('toggles pause and play state on click', async () => {
    const user = userEvent.setup();
    render(<StormDynamicsPanel poi={mockPoiStorm} />);

    const button = screen.getByRole('button', { name: 'Jeda Simulasi' });
    await user.click(button);

    expect(useParticleStormStore.getState().isPaused).toBe(true);
    expect(screen.getByText('Putar Simulasi')).toBeInTheDocument();

    await user.click(button);
    expect(useParticleStormStore.getState().isPaused).toBe(false);
  });

  it('updates speed and density in particleStormStore', () => {
    render(<StormDynamicsPanel poi={mockPoiStorm} />);

    const speedSlider = screen.getByRole('slider', {
      name: /Kecepatan Pusaran/i,
    });
    fireEvent.change(speedSlider, { target: { value: '2.4' } });
    expect(useParticleStormStore.getState().speed).toBe(2.4);

    const densitySlider = screen.getByRole('slider', {
      name: /Kepadatan Partikel/i,
    });
    fireEvent.change(densitySlider, { target: { value: '0.6' } });
    expect(useParticleStormStore.getState().density).toBe(0.6);
  });

  it('passes accessibility audit with zero axe violations', async () => {
    const { container } = render(<StormDynamicsPanel poi={mockPoiStorm} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
