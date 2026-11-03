import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { id } from '../../lib/i18n/id';
import { GlassPanel } from '../../ui/GlassPanel';
import { AuthBackdrop3D } from './AuthBackdrop3D';
import { useAuthStore } from './authStore';

export function PrivacyPolicyPage() {
  const user = useAuthStore((state) => state.user);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const navigate = useNavigate();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    await deleteAccount();
    setIsDeleting(false);
    setDeleteConfirmOpen(false);
    navigate('/');
  };

  return (
    <div className="privacy-page-container">
      <AuthBackdrop3D />

      <main
        className="privacy-shell"
        style={{ zIndex: 10, position: 'relative' }}
      >
        <header className="privacy-header">
          <button
            type="button"
            className="icon-button"
            onClick={() => navigate('/')}
            aria-label="Kembali ke Jelajah"
          >
            ←
          </button>
          <div>
            <h1 className="privacy-title">{id.privacy.title}</h1>
            <p className="privacy-subtitle">{id.privacy.subtitle}</p>
            <small className="privacy-date">{id.privacy.lastUpdated}</small>
          </div>
        </header>

        <GlassPanel className="privacy-content-card">
          {/* Bagian 1: Ringkasan & Komitmen */}
          <section className="privacy-section">
            <h2 className="privacy-section-heading">
              1. Komitmen Perlindungan Data Pribadi
            </h2>
            <p className="privacy-text">
              AstroSphere berkomitmen penuh melindungi privasi pengguna kami,
              khususnya siswa sekolah dan anak-anak di bawah umur, sesuai amanat{' '}
              <strong>
                Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang
                Pelindungan Data Pribadi (UU PDP)
              </strong>
              . Kami mematuhi prinsip minimisasi data (*data minimization*)—kami
              hanya mengumpulkan data yang benar-benar esensial untuk tujuan
              pembelajaran astronomi.
            </p>
          </section>

          {/* Bagian 2: Data yang Dikumpulkan */}
          <section className="privacy-section">
            <h2 className="privacy-section-heading">
              2. Data yang Dikumpulkan & Penggunaannya
            </h2>
            <ul className="privacy-list">
              <li>
                <strong>Data Akun (Identitas Minimal):</strong> Nama lengkap,
                alamat email, dan asal sekolah (opsional). Digunakan semata-mata
                untuk autentikasi masuk, pengelompokan kelas guru, dan
                sertifikasi progres belajar.
              </li>
              <li>
                <strong>Data Aktivitas Pembelajaran:</strong> Riwayat titik
                minat (POI) yang dijelajahi, durasi simulasi, dan skor percobaan
                kuis. Digunakan oleh siswa dan guru pembimbing untuk meninjau
                pencapaian belajar.
              </li>
              <li>
                <strong>Metrik Performa Teknis Agregat:</strong> Rata-rata frame
                rate (FPS), tier grafis (tinggi/sedang/rendah), dan resolusi
                layar perangkat. Disimpan secara anonim tanpa keterkaitan
                identitas pribadi guna memastikan visualisasi 3D berjalan lancar
                di laptop sekolah daerah.
              </li>
            </ul>
          </section>

          {/* Bagian 3: Perlindungan Khusus Anak di Bawah Umur */}
          <section className="privacy-section">
            <h2 className="privacy-section-heading">
              3. Pelindungan Khusus Pengguna Anak (Pasal 25 UU PDP)
            </h2>
            <div className="privacy-callout">
              <span className="privacy-callout-icon" aria-hidden="true">
                🛡️
              </span>
              <div>
                <strong>Kerahasiaan Alamat Email Siswa di Kelas:</strong>
                <p>
                  Di dalam direktori anggota kelas bimbingan guru, alamat email
                  siswa{' '}
                  <strong>tidak pernah ditampilkan kepada siswa lain</strong>.
                  Rekan sekelas hanya dapat melihat nama lengkap atau inisial
                  untuk mencegah kontak tanpa izin, perundungan siber
                  (*cyberbullying*), maupun penyalahgunaan kontak anak.
                </p>
              </div>
            </div>
            <ul className="privacy-list" style={{ marginTop: '0.75rem' }}>
              <li>
                Tidak ada iklan komersial, pelacak pihak ketiga (*third-party ad
                trackers*), atau monetisasi data pengguna.
              </li>
              <li>
                Pendaftaran akun siswa ditujukan di bawah pengawasan orang tua,
                wali, atau guru sekolah.
              </li>
            </ul>
          </section>

          {/* Bagian 4: Hak Subjek Data & Hapus Akun */}
          <section className="privacy-section">
            <h2 className="privacy-section-heading">
              4. Hak Pengguna & Penghapusan Akun (Right to Erasure)
            </h2>
            <p className="privacy-text">
              Sesuai Pasal 8 UU PDP, Anda memiliki hak penuh untuk mengakses,
              memperbarui, atau meminta penghapusan seluruh data pribadi Anda
              dari sistem kami (*Right to be Forgotten*).
            </p>

            {user ? (
              <div className="privacy-user-box">
                <p>
                  Anda saat ini masuk sebagai: <strong>{user.name}</strong> (
                  {user.email}).
                </p>
                <button
                  type="button"
                  className="btn btn-secondary privacy-delete-btn"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  ⚠️ {id.auth.deleteAccountBtn}
                </button>
              </div>
            ) : (
              <p
                className="privacy-text"
                style={{
                  fontStyle: 'italic',
                  color: 'var(--color-text-muted)',
                }}
              >
                Masuk ke akun Anda untuk mengakses opsi penghapusan akun
                mandiri.
              </p>
            )}
          </section>

          {/* Modal Konfirmasi Hapus Akun */}
          {deleteConfirmOpen && (
            <div
              className="shortcuts-modal-backdrop"
              role="dialog"
              aria-modal="true"
            >
              <GlassPanel className="shortcuts-modal-dialog">
                <h3
                  style={{
                    color: 'var(--color-danger)',
                    margin: '0 0 0.5rem 0',
                  }}
                >
                  Konfirmasi Penghapusan Akun
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>
                  {id.auth.deleteAccountConfirm}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end',
                    marginTop: '1.5rem',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDeleteConfirmOpen(false)}
                    disabled={isDeleting}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      background: 'var(--color-danger)',
                      borderColor: 'var(--color-danger)',
                    }}
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    {isDeleting
                      ? 'Menghapus...'
                      : 'Ya, Hapus Seluruh Data Saya'}
                  </button>
                </div>
              </GlassPanel>
            </div>
          )}
        </GlassPanel>
      </main>
    </div>
  );
}
