import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { id } from '../../lib/i18n/id';
import { GlassPanel } from '../../ui/GlassPanel';
import { AuthBackdrop3D } from './AuthBackdrop3D';
import { useAuthStore } from './authStore';

type AuthMode = 'masuk' | 'daftar' | 'lupa-sandi';

interface AuthPageProps {
  initialMode?: AuthMode;
}

export function AuthPage({ initialMode = 'masuk' }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const message = useAuthStore((state) => state.message);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const signInDemo = useAuthStore((state) => state.signInDemo);
  const clearAlerts = useAuthStore((state) => state.clearAlerts);

  const emailId = useId();
  const passwordId = useId();
  const nameId = useId();
  const schoolId = useId();

  useEffect(() => {
    setMode(initialMode);
    clearAlerts();
  }, [initialMode, clearAlerts]);

  // Jika sudah masuk, arahkan ke rute tujuan atau beranda
  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect, { replace: true });
    }
  }, [user, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (mode === 'masuk') {
      await signIn(email, password);
    } else if (mode === 'daftar') {
      await signUp(email, password, name, schoolName);
    } else if (mode === 'lupa-sandi') {
      await resetPassword(email);
    }
  };

  return (
    <div className="auth-container">
      <AuthBackdrop3D />

      <main
        className="auth-card-wrapper"
        style={{ zIndex: 10, position: 'relative' }}
      >
        <GlassPanel
          className="auth-card"
          role="region"
          aria-labelledby="auth-heading"
        >
          {/* Header Identitas AstroSphere */}
          <div className="auth-header">
            <Link
              to="/"
              className="auth-brand"
              aria-label="Kembali ke Beranda AstroSphere"
            >
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-name">{id.appName}</span>
            </Link>
            <h1 id="auth-heading" className="auth-title">
              {mode === 'masuk'
                ? id.auth.loginTitle
                : mode === 'daftar'
                  ? id.auth.registerTitle
                  : id.auth.forgotPasswordTitle}
            </h1>
            <p className="auth-subtitle">
              {mode === 'masuk'
                ? id.auth.loginSubtitle
                : mode === 'daftar'
                  ? id.auth.registerSubtitle
                  : id.auth.forgotPasswordSubtitle}
            </p>
          </div>

          {/* Notifikasi Pesan Sukses / Eror */}
          {error && (
            <div className="auth-alert auth-alert--error" role="alert">
              <span aria-hidden="true">⚠️</span>
              <p>{error}</p>
            </div>
          )}
          {message && (
            <div className="auth-alert auth-alert--success" role="status">
              <span aria-hidden="true">✓</span>
              <p>{message}</p>
            </div>
          )}

          {/* Tab Pilihan Masuk / Daftar */}
          {mode !== 'lupa-sandi' && (
            <div className="tab-list glass-panel auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'masuk'}
                className={`tab-button ${mode === 'masuk' ? 'tab-button--active' : ''}`}
                onClick={() => {
                  setMode('masuk');
                  clearAlerts();
                }}
              >
                Masuk
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'daftar'}
                className={`tab-button ${mode === 'daftar' ? 'tab-button--active' : ''}`}
                onClick={() => {
                  setMode('daftar');
                  clearAlerts();
                }}
              >
                Daftar Akun Baru
              </button>
            </div>
          )}

          {/* Formulir Autentikasi */}
          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'daftar' && (
              <>
                <div className="form-group">
                  <label htmlFor={nameId} className="form-label">
                    {id.auth.nameLabel} <span className="text-accent">*</span>
                  </label>
                  <input
                    id={nameId}
                    type="text"
                    required
                    className="form-input"
                    placeholder={id.auth.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={schoolId} className="form-label">
                    {id.auth.schoolLabel}
                  </label>
                  <input
                    id={schoolId}
                    type="text"
                    className="form-input"
                    placeholder={id.auth.schoolPlaceholder}
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>

                <div className="auth-role-badge">
                  <span aria-hidden="true">🎓</span>
                  <span>
                    Peran Pendaftaran: <strong>Siswa (Otomatis)</strong>
                  </span>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor={emailId} className="form-label">
                {id.auth.emailLabel} <span className="text-accent">*</span>
              </label>
              <input
                id={emailId}
                type="email"
                required
                className="form-input"
                placeholder={id.auth.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {mode !== 'lupa-sandi' && (
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor={passwordId} className="form-label">
                    {id.auth.passwordLabel}{' '}
                    <span className="text-accent">*</span>
                  </label>
                  {mode === 'masuk' && (
                    <button
                      type="button"
                      className="auth-link-btn"
                      onClick={() => {
                        setMode('lupa-sandi');
                        clearAlerts();
                      }}
                    >
                      {id.auth.forgotPasswordLink}
                    </button>
                  )}
                </div>
                <input
                  id={passwordId}
                  type="password"
                  required
                  minLength={8}
                  className="form-input"
                  placeholder={id.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary auth-submit-btn"
            >
              {isLoading
                ? 'Memproses...'
                : mode === 'masuk'
                  ? id.auth.loginButton
                  : mode === 'daftar'
                    ? id.auth.registerButton
                    : id.auth.forgotPasswordButton}
            </button>
          </form>

          {/* Opsi Tautan Beralih */}
          <div className="auth-footer-nav">
            {mode === 'lupa-sandi' ? (
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setMode('masuk');
                  clearAlerts();
                }}
              >
                ← {id.auth.backToLogin}
              </button>
            ) : mode === 'masuk' ? (
              <p className="auth-footer-text">
                {id.auth.noAccountYet}{' '}
                <button
                  type="button"
                  className="auth-link-btn font-bold"
                  onClick={() => {
                    setMode('daftar');
                    clearAlerts();
                  }}
                >
                  {id.auth.registerLink}
                </button>
              </p>
            ) : (
              <p className="auth-footer-text">
                {id.auth.alreadyHaveAccount}{' '}
                <button
                  type="button"
                  className="auth-link-btn font-bold"
                  onClick={() => {
                    setMode('masuk');
                    clearAlerts();
                  }}
                >
                  {id.auth.loginLink}
                </button>
              </p>
            )}
          </div>

          {/* Akun Demo Cepat untuk Evaluasi */}
          <div className="auth-demo-section">
            <span className="auth-demo-title">{id.auth.demoAccountsTitle}</span>
            <div className="auth-demo-pills">
              <button
                type="button"
                className="chip auth-demo-chip"
                onClick={() => signInDemo('siswa')}
              >
                🎒 {id.auth.demoStudent}
              </button>
              <button
                type="button"
                className="chip auth-demo-chip"
                onClick={() => signInDemo('guru')}
              >
                👩‍🏫 {id.auth.demoTeacher}
              </button>
              <button
                type="button"
                className="chip auth-demo-chip"
                onClick={() => signInDemo('admin')}
              >
                ⚙️ {id.auth.demoAdmin}
              </button>
            </div>
          </div>

          {/* Tautan Kebijakan Privasi */}
          <div className="auth-privacy-link-container">
            <Link to="/kebijakan-privasi" className="auth-privacy-link">
              Kebijakan Privasi & Kepatuhan UU PDP
            </Link>
          </div>
        </GlassPanel>
      </main>
    </div>
  );
}
