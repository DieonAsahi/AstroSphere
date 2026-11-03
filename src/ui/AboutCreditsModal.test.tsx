import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AboutCreditsModal } from './AboutCreditsModal';

describe('AboutCreditsModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <MemoryRouter>
        <AboutCreditsModal isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders about description and asset credit table when isOpen is true', () => {
    render(
      <MemoryRouter>
        <AboutCreditsModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /Tentang AstroSphere & Kredit Aset/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tujuan & Visi Edukasi/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Atribusi Lisensi Aset & Data Sains/i),
    ).toBeInTheDocument();

    // Pastikan sumber data sains dan lisensi ditampilkan
    expect(
      screen.getByText(
        /NASA \/ JPL-Caltech \/ USGS Astrogeology Science Center/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Domain Publik \(NASA Open Data Policy\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Space Grotesk & IBM Plex Sans/i),
    ).toBeInTheDocument();
  });

  it('calls onClose when clicking close button or pressing Escape', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AboutCreditsModal isOpen={true} onClose={handleClose} />
      </MemoryRouter>,
    );

    const closeBtn = screen.getByRole('button', {
      name: /Tutup informasi tentang aplikasi/i,
    });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('passes accessibility audit with zero axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <AboutCreditsModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
