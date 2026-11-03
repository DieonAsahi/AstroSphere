import { create } from 'zustand';
import { id } from '../../lib/i18n/id';
import type { UserProfile, UserRole } from './types';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  message: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    name: string,
    schoolName?: string,
  ) => Promise<boolean>;
  signOut: () => void;
  resetPassword: (email: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  signInDemo: (role: UserRole) => void;
  clearAlerts: () => void;
}

const STORAGE_KEY = 'astrosphere_auth_user';
const USERS_REGISTRY_KEY = 'astrosphere_registered_users';

// Pengguna bawaan untuk demonstrasi dan evaluasi luring
const DEMO_USERS: Record<UserRole, UserProfile> = {
  siswa: {
    id: 'user-siswa-demo-001',
    email: 'siswa@sekolah.id',
    name: 'Budi Prakoso',
    role: 'siswa',
    schoolName: 'SMP Negeri 1 Merauke',
    createdAt: new Date().toISOString(),
  },
  guru: {
    id: 'user-guru-demo-002',
    email: 'guru@sekolah.id',
    name: 'Ibu Dewi Kartika, M.Pd.',
    role: 'guru',
    schoolName: 'SMP Negeri 1 Merauke',
    createdAt: new Date().toISOString(),
  },
  admin: {
    id: 'user-admin-demo-003',
    email: 'admin@astrosphere.id',
    name: 'Admin Konten Observatorium',
    role: 'admin',
    schoolName: 'AstroSphere Education Pusat',
    createdAt: new Date().toISOString(),
  },
};

function loadStoredUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function getRegisteredUsers(): Array<{
  user: UserProfile;
  passwordHash: string;
}> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegisteredUsers(
  users: Array<{ user: UserProfile; passwordHash: string }>,
) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: loadStoredUser(),
  isLoading: false,
  error: null,
  message: null,

  clearAlerts: () => set({ error: null, message: null }),

  signIn: async (email, password) => {
    set({ isLoading: true, error: null, message: null });

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      set({ isLoading: false, error: id.auth.errors.emailRequired });
      return false;
    }

    // Periksa akun demo bawaan
    for (const demoRole of ['siswa', 'guru', 'admin'] as UserRole[]) {
      if (DEMO_USERS[demoRole].email.toLowerCase() === trimmedEmail) {
        const selected = DEMO_USERS[demoRole];
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
        }
        set({
          user: selected,
          isLoading: false,
          message: id.auth.loginSuccess,
        });
        return true;
      }
    }

    // Periksa pengguna yang terdaftar di registry lokal
    const registered = getRegisteredUsers();
    const match = registered.find(
      (entry) =>
        entry.user.email.toLowerCase() === trimmedEmail &&
        entry.passwordHash === password,
    );

    if (match) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(match.user));
      }
      set({
        user: match.user,
        isLoading: false,
        message: id.auth.loginSuccess,
      });
      return true;
    }

    set({
      isLoading: false,
      error: id.auth.errors.invalidCredentials,
    });
    return false;
  },

  signUp: async (email, password, name, schoolName) => {
    set({ isLoading: true, error: null, message: null });

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      set({ isLoading: false, error: id.auth.errors.emailRequired });
      return false;
    }
    if (!trimmedName) {
      set({ isLoading: false, error: id.auth.errors.nameRequired });
      return false;
    }
    if (password.length < 8) {
      set({ isLoading: false, error: id.auth.errors.weakPassword });
      return false;
    }

    // Periksa apakah email sudah terdaftar
    const registered = getRegisteredUsers();
    const exists =
      registered.some((u) => u.user.email.toLowerCase() === trimmedEmail) ||
      Object.values(DEMO_USERS).some(
        (u) => u.email.toLowerCase() === trimmedEmail,
      );

    if (exists) {
      set({ isLoading: false, error: id.auth.errors.emailTaken });
      return false;
    }

    // Peran selalu 'siswa' secara default sesuai aturan keamanan AstroSphere
    const newUser: UserProfile = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email: trimmedEmail,
      name: trimmedName,
      role: 'siswa', // Default mutlak siswa; peran guru/admin hanya via persetujuan admin
      schoolName: schoolName?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    registered.push({ user: newUser, passwordHash: password });
    saveRegisteredUsers(registered);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    }

    set({
      user: newUser,
      isLoading: false,
      message: id.auth.registerSuccess,
    });
    return true;
  },

  signOut: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ user: null, message: null, error: null });
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null, message: null });
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      set({ isLoading: false, error: id.auth.errors.emailRequired });
      return false;
    }

    // Simulasi pengiriman email pemulihan (GoTrue Supabase)
    await new Promise((res) => setTimeout(res, 200));
    set({
      isLoading: false,
      message: id.auth.passwordResetSent,
    });
    return true;
  },

  deleteAccount: async () => {
    const current = get().user;
    if (!current) return false;

    // Right to be Forgotten (UU PDP No. 27/2022 Pasal 8)
    const registered = getRegisteredUsers().filter(
      (u) => u.user.id !== current.id,
    );
    saveRegisteredUsers(registered);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }

    set({
      user: null,
      message: id.auth.accountDeleted,
      error: null,
    });
    return true;
  },

  signInDemo: (role) => {
    const demoUser = DEMO_USERS[role];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
    }
    set({
      user: demoUser,
      error: null,
      message: `Masuk sebagai ${id.auth.roles[role]} (${demoUser.name})`,
    });
  },
}));
