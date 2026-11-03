import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthPage } from './AuthPage';
import { useAuthStore } from './authStore';

describe('Auth Feature & Supabase Auth Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().signOut();
    useAuthStore.getState().clearAlerts();
  });

  it('signs up a new user with default role "siswa"', async () => {
    const store = useAuthStore.getState();
    const success = await store.signUp(
      'siswa.baru@sekolah.id',
      'passwordRahasia123',
      'Ahmad Baru',
      'SMPN 2 Jayapura',
    );

    expect(success).toBe(true);
    const currentUser = useAuthStore.getState().user;
    expect(currentUser).not.toBeNull();
    expect(currentUser?.role).toBe('siswa'); // Peran selalu siswa
    expect(currentUser?.email).toBe('siswa.baru@sekolah.id');
    expect(currentUser?.name).toBe('Ahmad Baru');
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const store = useAuthStore.getState();
    const success = await store.signUp(
      'pendek@sekolah.id',
      'pendek',
      'Nama Pendek',
    );

    expect(success).toBe(false);
    expect(useAuthStore.getState().error).toMatch(/minimal 8 karakter/i);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('rejects duplicate email registrations', async () => {
    const store = useAuthStore.getState();
    await store.signUp('kembar@sekolah.id', 'password12345', 'User Satu');
    store.signOut();

    const secondTry = await store.signUp(
      'kembar@sekolah.id',
      'passwordBaru123',
      'User Dua',
    );
    expect(secondTry).toBe(false);
    expect(useAuthStore.getState().error).toMatch(/sudah terdaftar/i);
  });

  it('signs in with demo accounts (siswa, guru, admin)', () => {
    const store = useAuthStore.getState();

    store.signInDemo('siswa');
    expect(useAuthStore.getState().user?.role).toBe('siswa');
    expect(useAuthStore.getState().user?.email).toBe('siswa@sekolah.id');

    store.signInDemo('guru');
    expect(useAuthStore.getState().user?.role).toBe('guru');
    expect(useAuthStore.getState().user?.email).toBe('guru@sekolah.id');

    store.signInDemo('admin');
    expect(useAuthStore.getState().user?.role).toBe('admin');
  });

  it('deletes account permanently satisfying Right to be Forgotten', async () => {
    const store = useAuthStore.getState();
    await store.signUp(
      'hapus@sekolah.id',
      'passwordLengkap123',
      'Siap Dihapus',
    );
    expect(useAuthStore.getState().user).not.toBeNull();

    const deleted = await store.deleteAccount();
    expect(deleted).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().message).toMatch(/berhasil dihapus/i);
  });

  it('renders AuthPage and switches between Masuk, Daftar, and Lupa Sandi', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/masuk']}>
        <AuthPage initialMode="masuk" />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Masuk Observatorium/i }),
    ).toBeInTheDocument();

    // Beralih ke tab daftar
    const registerTab = screen.getByRole('tab', { name: /Daftar Akun Baru/i });
    await user.click(registerTab);
    expect(
      screen.getByRole('heading', { name: /Daftar Akun AstroSphere/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Nama Lengkap/i)).toBeInTheDocument();
    expect(screen.getByText(/Peran Pendaftaran:/i)).toBeInTheDocument();

    // Beralih kembali ke tab masuk
    const loginTab = screen.getByRole('tab', { name: /^Masuk$/i });
    await user.click(loginTab);

    // Beralih ke lupa kata sandi
    const forgotLink = screen.getByText(/Lupa kata sandi\?/i);
    await user.click(forgotLink);
    expect(
      screen.getByRole('heading', { name: /Lupa Kata Sandi/i }),
    ).toBeInTheDocument();
  });

  it('passes accessibility audit with zero axe violations on AuthPage', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/masuk']}>
        <AuthPage initialMode="masuk" />
      </MemoryRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
