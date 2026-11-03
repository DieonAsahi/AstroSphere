import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CelestialBodiesDrawer } from './CelestialBodiesDrawer';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('CelestialBodiesDrawer Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <MemoryRouter>
        <CelestialBodiesDrawer isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders all celestial objects and text descriptions when isOpen is true', () => {
    render(
      <MemoryRouter>
        <CelestialBodiesDrawer isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Direktori Benda Langit Tata Surya',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Matahari')).toBeInTheDocument();
    expect(screen.getByText('Mars')).toBeInTheDocument();
    expect(screen.getByText('Olympus Mons')).toBeInTheDocument();
  });

  it('filters items correctly when clicking category tabs', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CelestialBodiesDrawer isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    // Tab Planet
    const planetTab = screen.getByRole('tab', { name: 'Planet' });
    await user.click(planetTab);

    expect(screen.getByText('Bumi')).toBeInTheDocument();
    expect(screen.getByText('Jupiter')).toBeInTheDocument();
    expect(screen.queryByText('Olympus Mons')).not.toBeInTheDocument();

    // Tab Titik Minat
    const poiTab = screen.getByRole('tab', { name: 'Titik Minat' });
    await user.click(poiTab);

    expect(screen.getByText('Olympus Mons')).toBeInTheDocument();
    expect(screen.getByText('Badai Merah Raksasa')).toBeInTheDocument();
    expect(screen.queryByText('Matahari')).not.toBeInTheDocument();
  });

  it('navigates and closes when clicking "Terbang ➔"', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CelestialBodiesDrawer isOpen={true} onClose={handleClose} />
      </MemoryRouter>,
    );

    const flyMarsBtn = screen.getByRole('button', {
      name: 'Terbang ke Mars',
    });
    await user.click(flyMarsBtn);

    expect(mockedNavigate).toHaveBeenCalledWith('/planet/mars');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes when pressing Escape or clicking close button', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CelestialBodiesDrawer isOpen={true} onClose={handleClose} />
      </MemoryRouter>,
    );

    const closeBtn = screen.getByRole('button', {
      name: 'Tutup direktori benda langit',
    });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    handleClose.mockClear();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('passes accessibility audit with zero axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <CelestialBodiesDrawer isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
