import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GlassPanel } from '../../ui/GlassPanel';
import { useAuthStore } from './authStore';
import type { UserRole } from './types';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  fallbackPath?: string;
}

export function RoleGuard({
  children,
  allowedRoles,
  fallbackPath = '/masuk',
}: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const location = useLocation();
  const navigate = useNavigate();

  // Bila belum masuk, arahkan ke halaman masuk dengan memori rute kembali
  if (!user) {
    return (
      <Navigate
        to={`${fallbackPath}?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // Bila peran tidak sesuai dengan hak akses yang diizinkan
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="auth-container">
        <GlassPanel className="auth-card" role="alert">
          <div className="auth-header">
            <span className="auth-icon" aria-hidden="true">
              🛡️
            </span>
            <h1 className="auth-title">Akses Khusus Dibatasi</h1>
            <p className="auth-subtitle">
              Halaman ini memerlukan peran{' '}
              <strong>{allowedRoles.join(' atau ')}</strong>. Saat ini Anda
              masuk sebagai <strong>{user.name}</strong> (Peran: {user.role}).
            </p>
          </div>

          <div
            className="auth-actions"
            style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}
          >
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={() => navigate('/')}
            >
              Kembali ke Jelajah
            </button>
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => {
                signOut();
                navigate('/masuk');
              }}
            >
              Ganti Akun
            </button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return <>{children}</>;
}
