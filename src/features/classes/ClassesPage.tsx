import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { id } from '../../lib/i18n/id';
import { GlassPanel } from '../../ui/GlassPanel';
import { Kbd } from '../../ui/Kbd';
import { AuthBackdrop3D } from './AuthBackdrop3D';
import { useAuthStore } from './authStore';
import { useClassStore } from './classStore';
import type { ClassItem } from './types';
import { useTourStore } from '../tours/tourStore';
import { TourBuilderModal } from '../tours/TourBuilderModal';
import type { Tour } from '../tours/types';
import { ClassProgressDashboard } from '../progress/ClassProgressDashboard';

export function ClassesPage() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();

  // State guru: pembuatan kelas & anggota yang sedang dibuka
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // State siswa: gabung kelas
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // State tur terpandu (FR-08)
  const [isTourBuilderOpen, setIsTourBuilderOpen] = useState(false);
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const [classSubTabs, setClassSubTabs] = useState<
    Record<string, 'members' | 'progress'>
  >({});
  const startTour = useTourStore((state) => state.startTour);
  const deleteTour = useTourStore((state) => state.deleteTour);
  const getAvailableToursForUser = useTourStore(
    (state) => state.getAvailableToursForUser,
  );
  const allTours = useTourStore((state) => state.tours);

  const classNameId = useId();
  const gradeLevelId = useId();
  const joinInputId = useId();

  const createClass = useClassStore((state) => state.createClass);
  const joinClassByCode = useClassStore((state) => state.joinClassByCode);
  const leaveClass = useClassStore((state) => state.leaveClass);
  const getTeacherClasses = useClassStore((state) => state.getTeacherClasses);
  const getStudentClasses = useClassStore((state) => state.getStudentClasses);
  const getClassMembers = useClassStore((state) => state.getClassMembers);
  const classError = useClassStore((state) => state.error);
  const classMessage = useClassStore((state) => state.message);
  const clearAlerts = useClassStore((state) => state.clearAlerts);

  useEffect(() => {
    clearAlerts();
  }, [clearAlerts]);

  if (!user) {
    return null;
  }

  const isTeacher = user.role === 'guru' || user.role === 'admin';
  const teacherClasses = isTeacher ? getTeacherClasses(user.id) : [];
  const studentClasses = getStudentClasses(user.id);
  const studentClassIds = studentClasses.map((c) => c.id);

  const availableTours = getAvailableToursForUser(user, studentClassIds);
  const teacherTours = allTours.filter((t) =>
    user.role === 'admin' ? true : t.createdBy === user.id,
  );

  const handleStartTour = (tour: Tour) => {
    navigate('/');
    startTour(tour, false);
  };

  const handleDeleteTour = (tour: Tour) => {
    if (window.confirm(`${id.tours.hub.deleteConfirm} (${tour.title})`)) {
      deleteTour(tour.id);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      setCopiedCode(code);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    const created = await createClass(user, newClassName, newGradeLevel);
    if (created) {
      setNewClassName('');
      setNewGradeLevel('');
      setIsCreateOpen(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    const success = await joinClassByCode(user, joinCodeInput);
    if (success) {
      setJoinCodeInput('');
    }
  };

  const handleLeaveClass = async (targetClass: ClassItem) => {
    if (
      window.confirm(`${id.classes.leaveClassConfirm} (${targetClass.name})`)
    ) {
      await leaveClass(user.id, targetClass.id);
    }
  };

  return (
    <div className="classes-view-container">
      <AuthBackdrop3D />

      <div
        className="classes-shell"
        style={{ zIndex: 10, position: 'relative' }}
      >
        {/* Navigasi Atas */}
        <header className="classes-top-nav">
          <button
            type="button"
            className="icon-button classes-back-btn"
            onClick={() => navigate('/')}
            aria-label="Kembali ke Jelajah Tata Surya"
          >
            ←
          </button>
          <div>
            <h1 className="classes-page-title">{id.classes.title}</h1>
            <p className="classes-user-indicator">
              Masuk sebagai <strong>{user.name}</strong> (
              {id.auth.roles[user.role]})
              {user.schoolName ? ` · ${user.schoolName}` : ''}
            </p>
          </div>
          <div className="classes-top-actions">
            <Link to="/jelajahku" className="classes-privacy-pill">
              ⭐ Jelajahku
            </Link>
            {user.role === 'admin' && (
              <>
                <Link to="/admin" className="classes-privacy-pill">
                  🛠️ CMS Admin
                </Link>
                <Link to="/admin/metrik" className="classes-privacy-pill">
                  📊 Metrik KPI
                </Link>
              </>
            )}
            <Link to="/kebijakan-privasi" className="classes-privacy-pill">
              🛡️ Kebijakan Privasi
            </Link>
            <button
              type="button"
              className="btn btn-secondary classes-logout-btn"
              onClick={() => {
                signOut();
                navigate('/masuk');
              }}
            >
              {id.auth.logoutButton}
            </button>
          </div>
        </header>

        {/* Notifikasi Sistem */}
        {classError && (
          <div className="auth-alert auth-alert--error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <p>{classError}</p>
          </div>
        )}
        {classMessage && (
          <div className="auth-alert auth-alert--success" role="status">
            <span aria-hidden="true">✓</span>
            <p>{classMessage}</p>
          </div>
        )}

        {/* TAMPILAN GURU: KELOLA KELAS */}
        {isTeacher && (
          <section
            className="classes-section"
            aria-labelledby="teacher-section-title"
          >
            <div className="classes-section-header">
              <div>
                <h2
                  id="teacher-section-title"
                  className="classes-section-title"
                >
                  {id.classes.teacherSectionTitle}
                </h2>
                <p className="classes-section-desc">
                  Kelola kelas bimbingan Anda, bagikan kode gabung kepada siswa,
                  dan tinjau progres.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsCreateOpen(true)}
              >
                + {id.classes.createClassButton}
              </button>
            </div>

            {/* Modal / Dialog Pembuatan Kelas Baru */}
            {isCreateOpen && (
              <GlassPanel
                className="class-form-card"
                role="dialog"
                aria-modal="true"
              >
                <h3 className="class-form-title">
                  {id.classes.createClassTitle}
                </h3>
                <form onSubmit={handleCreateClass} className="class-form">
                  <div className="form-group">
                    <label htmlFor={classNameId} className="form-label">
                      {id.classes.classNameLabel}{' '}
                      <span className="text-accent">*</span>
                    </label>
                    <input
                      id={classNameId}
                      type="text"
                      required
                      className="form-input"
                      placeholder={id.classes.classNamePlaceholder}
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor={gradeLevelId} className="form-label">
                      {id.classes.gradeLevelLabel}{' '}
                      <span className="text-accent">*</span>
                    </label>
                    <input
                      id={gradeLevelId}
                      type="text"
                      required
                      className="form-input"
                      placeholder={id.classes.gradeLevelPlaceholder}
                      value={newGradeLevel}
                      onChange={(e) => setNewGradeLevel(e.target.value)}
                    />
                  </div>

                  <div className="class-form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsCreateOpen(false)}
                    >
                      {id.classes.cancelButton}
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {id.classes.saveClassButton}
                    </button>
                  </div>
                </form>
              </GlassPanel>
            )}

            {/* Daftar Kartu Kelas Guru */}
            {teacherClasses.length === 0 ? (
              <GlassPanel className="classes-empty-card">
                <p>{id.classes.noTeacherClasses}</p>
              </GlassPanel>
            ) : (
              <div className="classes-grid">
                {teacherClasses.map((item) => {
                  const isExpanded = expandedClassId === item.id;
                  const members = isExpanded
                    ? getClassMembers(user, item.id)
                    : [];

                  return (
                    <GlassPanel key={item.id} className="class-card">
                      <div className="class-card-header">
                        <div>
                          <span className="class-grade-badge">
                            {item.gradeLevel}
                          </span>
                          <h3 className="class-card-name">{item.name}</h3>
                        </div>
                        <span className="chip class-members-chip">
                          👥 {id.classes.membersCount(item.memberCount)}
                        </span>
                      </div>

                      {/* Kode Gabung Kelas 6 Karakter */}
                      <div className="class-code-lockup">
                        <span className="class-code-label">
                          KODE GABUNG KELAS:
                        </span>
                        <div className="class-code-display">
                          <Kbd className="class-code-kbd">{item.joinCode}</Kbd>
                          <button
                            type="button"
                            className="btn btn-secondary class-copy-btn"
                            onClick={() => handleCopyCode(item.joinCode)}
                            aria-label={`Salin kode gabung ${item.joinCode}`}
                          >
                            {copiedCode === item.joinCode
                              ? `✓ ${id.classes.codeCopied}`
                              : `📋 ${id.classes.copyCodeButton}`}
                          </button>
                        </div>
                      </div>

                      {/* Tombol Lihat Anggota & Dasbor Progres */}
                      <div className="class-card-footer">
                        <button
                          type="button"
                          className="auth-link-btn"
                          onClick={() =>
                            setExpandedClassId(isExpanded ? null : item.id)
                          }
                          aria-expanded={isExpanded}
                        >
                          {isExpanded
                            ? '▲ Tutup Rincian Kelas'
                            : `▼ Anggota & Dasbor Progres (${item.memberCount})`}
                        </button>
                      </div>

                      {/* Accordion Anggota & Dasbor Progres Belajar */}
                      {isExpanded && (
                        <div className="class-members-drawer">
                          <div className="class-subnav-tabs" role="tablist">
                            <button
                              type="button"
                              role="tab"
                              aria-selected={
                                (classSubTabs[item.id] || 'progress') ===
                                'progress'
                              }
                              className={`class-subnav-btn ${
                                (classSubTabs[item.id] || 'progress') ===
                                'progress'
                                  ? 'class-subnav-btn--active'
                                  : ''
                              }`}
                              onClick={() =>
                                setClassSubTabs((prev) => ({
                                  ...prev,
                                  [item.id]: 'progress',
                                }))
                              }
                            >
                              📊 {id.progress.classDashboardTitle}
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={
                                classSubTabs[item.id] === 'members'
                              }
                              className={`class-subnav-btn ${
                                classSubTabs[item.id] === 'members'
                                  ? 'class-subnav-btn--active'
                                  : ''
                              }`}
                              onClick={() =>
                                setClassSubTabs((prev) => ({
                                  ...prev,
                                  [item.id]: 'members',
                                }))
                              }
                            >
                              👤 Daftar Siswa ({members.length})
                            </button>
                          </div>

                          {(classSubTabs[item.id] || 'progress') ===
                          'progress' ? (
                            <ClassProgressDashboard
                              classItem={item}
                              classMembers={members}
                            />
                          ) : (
                            <div>
                              <p className="class-privacy-hint">
                                🛡️ {id.classes.studentPrivacyNotice}
                              </p>
                              {members.length === 0 ? (
                                <p className="class-no-members">
                                  {id.classes.noMembersYet}
                                </p>
                              ) : (
                                <ul className="class-members-list" role="list">
                                  {members.map((m) => (
                                    <li
                                      key={m.studentId}
                                      className="class-member-item"
                                    >
                                      <div className="class-member-name-group">
                                        <span
                                          className="class-member-avatar"
                                          aria-hidden="true"
                                        >
                                          👤
                                        </span>
                                        <div>
                                          <strong>{m.studentName}</strong>
                                          {m.studentSchool && (
                                            <small className="class-member-school">
                                              {m.studentSchool}
                                            </small>
                                          )}
                                        </div>
                                      </div>
                                      <span className="class-member-date">
                                        {id.classes.joinedAt}{' '}
                                        {new Date(
                                          m.joinedAt,
                                        ).toLocaleDateString('id-ID')}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </GlassPanel>
                  );
                })}
              </div>
            )}

            {/* Bagian Tur Terpandu Guru (FR-08) */}
            <div
              className="classes-section-header"
              style={{ marginTop: '2.5rem' }}
            >
              <div>
                <h3 className="classes-section-title">
                  {id.tours.hub.myTours}
                </h3>
                <p className="classes-section-desc">
                  Susun rute eksplorasi tata surya, simpan sudut kamera 3D, dan
                  bagikan ke kelas Anda.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditingTourId(null);
                  setIsTourBuilderOpen(true);
                }}
              >
                + {id.tours.hub.createTourButton}
              </button>
            </div>

            {teacherTours.length === 0 ? (
              <GlassPanel
                className="classes-empty-card"
                style={{ marginTop: '1rem' }}
              >
                <p>{id.tours.hub.noToursTeacher}</p>
              </GlassPanel>
            ) : (
              <div className="tour-cards-grid" style={{ marginTop: '1rem' }}>
                {teacherTours.map((tour) => (
                  <GlassPanel key={tour.id} className="tour-item-card">
                    <div className="tour-item-card-header">
                      <span
                        className={`tour-badge ${
                          tour.isPublished
                            ? 'tour-badge--published'
                            : 'tour-badge--draft'
                        }`}
                      >
                        {tour.isPublished
                          ? id.tours.hub.statusPublished
                          : id.tours.hub.statusDraft}
                      </span>
                      <span className="tour-item-duration">
                        {id.tours.hub.stepsCount(tour.steps.length)}
                      </span>
                    </div>

                    <h4 className="tour-item-title">{tour.title}</h4>
                    <p className="tour-item-desc">{tour.description}</p>

                    <div className="tour-item-footer">
                      <button
                        type="button"
                        className="btn btn-primary tour-btn-start"
                        onClick={() => handleStartTour(tour)}
                      >
                        ▶ {id.tours.hub.startTour}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary tour-btn-edit"
                        onClick={() => {
                          setEditingTourId(tour.id);
                          setIsTourBuilderOpen(true);
                        }}
                      >
                        ✏ {id.tours.hub.editTour}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary tour-btn-delete"
                        onClick={() => handleDeleteTour(tour)}
                      >
                        🗑 {id.tours.hub.deleteTour}
                      </button>
                    </div>
                  </GlassPanel>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAMPILAN SISWA (DAN GURU YANG INGIN GABUNG KELAS LAIN) */}
        <section
          className="classes-section"
          aria-labelledby="student-section-title"
        >
          <div className="classes-section-header">
            <div>
              <h2 id="student-section-title" className="classes-section-title">
                {id.classes.studentSectionTitle}
              </h2>
              <p className="classes-section-desc">
                Ikuti instruksi gurumu untuk menjelajahi tata surya dalam modul
                terpandu.
              </p>
            </div>
          </div>

          {/* Form Gabung Kelas 6 Karakter */}
          <GlassPanel className="class-join-card">
            <div>
              <h3 className="class-join-title">{id.classes.joinClassTitle}</h3>
              <p className="class-join-subtitle">
                {id.classes.joinClassSubtitle}
              </p>
            </div>
            <form onSubmit={handleJoinClass} className="class-join-form">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor={joinInputId} className="sr-only">
                  {id.classes.joinCodeLabel}
                </label>
                <input
                  id={joinInputId}
                  type="text"
                  required
                  maxLength={6}
                  pattern="[A-Za-z0-9]{6}"
                  className="form-input class-join-input"
                  placeholder={id.classes.joinCodePlaceholder}
                  value={joinCodeInput}
                  onChange={(e) =>
                    setJoinCodeInput(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                    )
                  }
                />
              </div>
              <button type="submit" className="btn btn-primary class-join-btn">
                {id.classes.joinButton}
              </button>
            </form>
          </GlassPanel>

          {/* Daftar Kelas yang Diikuti Siswa */}
          {studentClasses.length === 0 ? (
            <GlassPanel
              className="classes-empty-card"
              style={{ marginTop: '1rem' }}
            >
              <p>{id.classes.noJoinedClasses}</p>
            </GlassPanel>
          ) : (
            <div className="classes-grid" style={{ marginTop: '1rem' }}>
              {studentClasses.map((item) => (
                <GlassPanel key={item.id} className="class-card">
                  <div className="class-card-header">
                    <div>
                      <span className="class-grade-badge">
                        {item.gradeLevel}
                      </span>
                      <h3 className="class-card-name">{item.name}</h3>
                    </div>
                  </div>

                  <p className="class-teacher-info">
                    {id.classes.teacherLabel}:{' '}
                    <strong>{item.teacherName}</strong>
                  </p>

                  <div className="class-card-footer">
                    <button
                      type="button"
                      className="btn btn-secondary class-leave-btn"
                      onClick={() => handleLeaveClass(item)}
                    >
                      {id.classes.leaveClassButton}
                    </button>
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}

          {/* Tur Edukasi Tersedia untuk Kelas yang Diikuti Siswa (FR-08) */}
          <div
            className="classes-section-header"
            style={{ marginTop: '2.5rem' }}
          >
            <div>
              <h3 className="classes-section-title">
                {id.tours.hub.availableTours}
              </h3>
              <p className="classes-section-desc">
                Tur terpandu dengan sudut pandang kamera sinematik dan narasi
                penjelasan dari gurumu.
              </p>
            </div>
          </div>

          {availableTours.length === 0 ? (
            <GlassPanel
              className="classes-empty-card"
              style={{ marginTop: '1rem' }}
            >
              <p>{id.tours.hub.noToursAvailable}</p>
            </GlassPanel>
          ) : (
            <div className="tour-cards-grid" style={{ marginTop: '1rem' }}>
              {availableTours.map((tour) => (
                <GlassPanel key={tour.id} className="tour-item-card">
                  <div className="tour-item-card-header">
                    <span className="tour-badge tour-badge--published">
                      {id.tours.hub.statusPublished}
                    </span>
                    <span className="tour-item-duration">
                      {id.tours.hub.stepsCount(tour.steps.length)}
                    </span>
                  </div>

                  <h4 className="tour-item-title">{tour.title}</h4>
                  <p className="tour-item-desc">{tour.description}</p>
                  <p
                    className="class-teacher-info"
                    style={{ marginTop: 'auto' }}
                  >
                    {id.tours.hub.authorLabel}:{' '}
                    <strong>{tour.authorName}</strong>
                  </p>

                  <div className="tour-item-footer">
                    <button
                      type="button"
                      className="btn btn-primary tour-btn-start"
                      onClick={() => handleStartTour(tour)}
                    >
                      ▶ {id.tours.hub.startTour}
                    </button>
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal Pembuat Tur Guru (FR-08) */}
      <TourBuilderModal
        isOpen={isTourBuilderOpen}
        onClose={() => {
          setIsTourBuilderOpen(false);
          setEditingTourId(null);
        }}
        editingTourId={editingTourId}
      />
    </div>
  );
}
