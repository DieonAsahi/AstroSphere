import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { WebGLFallback } from './WebGLFallback';

describe('WebGLFallback Component', () => {
  it('renders fallback warning title and browser recommendations', () => {
    render(<WebGLFallback />);

    expect(
      screen.getByRole('heading', {
        name: /Akselerasi 3D WebGL2 Tidak Terdeteksi/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /Panduan Mengaktifkan WebGL2:/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Gunakan peramban modern seperti Google Chrome/i),
    ).toBeInTheDocument();
  });

  it('renders text directory with planets and POIs', () => {
    render(<WebGLFallback />);

    expect(
      screen.getByRole('heading', {
        name: 'Direktori Teks Sains Astronomi',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Matahari')).toBeInTheDocument();
    expect(screen.getByText('Mars')).toBeInTheDocument();
    expect(screen.getByText('Olympus Mons')).toBeInTheDocument();
    expect(screen.getByText('Badai Merah Raksasa')).toBeInTheDocument();
  });

  it('filters text directory based on category tabs', async () => {
    const user = userEvent.setup();
    render(<WebGLFallback />);

    // Filter Planet
    const planetTab = screen.getByRole('tab', { name: 'Planet' });
    await user.click(planetTab);
    expect(screen.getByText('Bumi')).toBeInTheDocument();
    expect(screen.queryByText('Olympus Mons')).not.toBeInTheDocument();

    // Filter Titik Minat (POI)
    const poiTab = screen.getByRole('tab', { name: 'Titik Minat (POI)' });
    await user.click(poiTab);
    expect(screen.getByText('Olympus Mons')).toBeInTheDocument();
    expect(screen.getByText('Badai Merah Raksasa')).toBeInTheDocument();
    expect(screen.queryByText('Matahari')).not.toBeInTheDocument();
  });

  it('passes accessibility audit with zero axe violations', async () => {
    const { container } = render(<WebGLFallback />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
