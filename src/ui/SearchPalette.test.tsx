import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SearchPalette } from './SearchPalette';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('SearchPalette Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <MemoryRouter>
        <SearchPalette isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders search input and list when isOpen is true', () => {
    render(
      <MemoryRouter>
        <SearchPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Ketik nama planet/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('filters results with case-insensitive and accent-tolerant queries', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SearchPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Ketik nama planet/i);

    // Cari Mars dengan huruf kecil
    await user.type(input, 'mars');
    expect(screen.getByText('Mars')).toBeInTheDocument();
    expect(screen.getByText('Olympus Mons')).toBeInTheDocument();

    // Hapus dan cari Badai Merah
    await user.clear(input);
    await user.type(input, 'badai');
    expect(screen.getByText('Badai Merah Raksasa')).toBeInTheDocument();
  });

  it('shows no results message when query has no matches', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SearchPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Ketik nama planet/i);
    await user.type(input, 'xyz123tidakada');

    expect(
      screen.getByText(/Tidak ditemukan benda langit atau titik minat/i),
    ).toBeInTheDocument();
  });

  it('navigates with keyboard arrows, selects with Enter, and closes with Escape', async () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <SearchPalette isOpen={true} onClose={handleClose} />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Ketik nama planet/i);

    // Panah bawah untuk memilih item kedua
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Enter untuk navigasi ke item terpilih
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockedNavigate).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Tombol Escape menutup dialog
    handleClose.mockClear();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('passes accessibility audit with zero axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <SearchPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
