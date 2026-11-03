import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { id } from '../../lib/i18n/id';
import { GlassPanel } from '../../ui/GlassPanel';
import { useAuthStore } from '../classes/authStore';
import { useClassStore } from '../classes/classStore';
import { useTourStore } from './tourStore';
import type { Tour } from './types';

interface TourListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBuilder?: (tourId?: string | null) => void;
}

export function TourListModal({
  isOpen,
  onClose,
  onOpenBuilder,
}: TourListModalProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const getStudentClasses = useClassStore((state) => state.getStudentClasses);
  const getTeacherClasses = useClassStore((state) => state.getTeacherClasses);
  const startTour = useTourStore((state) => state.startTour);
  const deleteTour = useTourStore((state) => state.deleteTour);
  const getAvailableToursForUser = useTourStore(
    (state) => state.getAvailableToursForUser,
  );

  const isTeacher = user?.role === 'guru' || user?.role === 'admin';
  const studentClasses = useMemo(
    () => (user ? getStudentClasses(user.id) : []),
    [user, getStudentClasses],
  );
  const teacherClasses = useMemo(
    () => (user ? getTeacherClasses(user.id) : []),
    [user, getTeacherClasses],
  );
  const studentClassIds = useMemo(
    () => studentClasses.map((c) => c.id),
    [studentClasses],
  );

  const [activeTab, setActiveTab] = useState<'available' | 'my-tours'>(
    'available',
  );

  const availableTours = useMemo(() => {
    return getAvailableToursForUser(user, studentClassIds);
  }, [getAvailableToursForUser, user, studentClassIds]);

  const teacherTours = useMemo(() => {
    if (!user || !isTeacher) return [];
    return useTourStore
      .getState()
      .tours.filter((t) =>
        user.role === 'admin' ? true : t.createdBy === user.id,
      );
  }, [user, isTeacher]);

  if (!isOpen) return null;

  const handleStartTour = (tour: Tour) => {
    onClose();
    navigate('/');
    startTour(tour, false);
  };

  const handleDeleteTour = (tour: Tour) => {
    if (window.confirm(`${id.tours.hub.deleteConfirm} (${tour.title})`)) {
      deleteTour(tour.id);
    }
  };

  const getClassNameList = (classIds: string[]) => {
    const list = isTeacher ? teacherClasses : studentClasses;
    const names = classIds
      .map((cid) => list.find((c) => c.id === cid)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'Belum dibagikan';
  };

  const calculateTotalDuration = (tour: Tour) => {
    return tour.steps.reduce((sum, s) => sum + (s.durationS || 10), 0);
  };

  return (
    <div
      className="tour-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-list-title"
    >
      <GlassPanel className="tour-list-modal-card">
        {/* Header Modal */}
        <div className="tour-list-modal-header">
          <div>
            <h2 id="tour-list-title" className="tour-list-title">
              {id.tours.hub.drawerTitle}
            </h2>
            <p className="tour-list-subtitle">{id.tours.subtitle}</p>
          </div>
          <button
            type="button"
            className="tour-btn-close-modal"
            onClick={onClose}
            aria-label={id.tours.builder.close}
          >
            ✕
          </button>
        </div>

        {/* Tab navigasi bila user adalah guru */}
        {isTeacher && (
          <div className="tour-list-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'available'}
              className={`tour-tab-btn ${
                activeTab === 'available' ? 'tour-tab-btn--active' : ''
              }`}
              onClick={() => setActiveTab('available')}
            >
              {id.tours.hub.availableTours} ({availableTours.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'my-tours'}
              className={`tour-tab-btn ${
                activeTab === 'my-tours' ? 'tour-tab-btn--active' : ''
              }`}
              onClick={() => setActiveTab('my-tours')}
            >
              {id.tours.hub.myTours} ({teacherTours.length})
            </button>
          </div>
        )}

        {/* Action Header untuk Guru: Buat Tur Baru */}
        {isTeacher && onOpenBuilder && (
          <div className="tour-list-action-bar">
            <button
              type="button"
              className="btn btn-primary tour-btn-create-tour"
              onClick={() => {
                onClose();
                onOpenBuilder(null);
              }}
            >
              + {id.tours.hub.createTourButton}
            </button>
          </div>
        )}

        {/* Konten Daftar Tur */}
        <div className="tour-list-modal-body">
          {activeTab === 'available' ? (
            availableTours.length === 0 ? (
              <div className="tour-list-empty">
                <p>{id.tours.hub.noToursAvailable}</p>
              </div>
            ) : (
              <div className="tour-cards-grid">
                {availableTours.map((tour) => {
                  const totalDur = calculateTotalDuration(tour);
                  return (
                    <GlassPanel key={tour.id} className="tour-item-card">
                      <div className="tour-item-card-header">
                        <span className="tour-badge tour-badge--published">
                          {id.tours.hub.statusPublished}
                        </span>
                        <span className="tour-item-duration">
                          {id.tours.hub.durationTotal(totalDur)}
                        </span>
                      </div>

                      <h3 className="tour-item-title">{tour.title}</h3>
                      <p className="tour-item-desc">{tour.description}</p>

                      <div className="tour-item-meta">
                        <span>
                          <strong>
                            {id.tours.hub.stepsCount(tour.steps.length)}
                          </strong>
                        </span>
                        <span>
                          {id.tours.hub.authorLabel}: <em>{tour.authorName}</em>
                        </span>
                      </div>

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
                  );
                })}
              </div>
            )
          ) : teacherTours.length === 0 ? (
            <div className="tour-list-empty">
              <p>{id.tours.hub.noToursTeacher}</p>
            </div>
          ) : (
            <div className="tour-cards-grid">
              {teacherTours.map((tour) => {
                const totalDur = calculateTotalDuration(tour);
                return (
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
                        {id.tours.hub.durationTotal(totalDur)}
                      </span>
                    </div>

                    <h3 className="tour-item-title">{tour.title}</h3>
                    <p className="tour-item-desc">{tour.description}</p>

                    <div className="tour-item-meta">
                      <span>
                        <strong>
                          {id.tours.hub.stepsCount(tour.steps.length)}
                        </strong>
                      </span>
                      <span>
                        {id.tours.hub.assignedClasses}:{' '}
                        <em>{getClassNameList(tour.classIds)}</em>
                      </span>
                    </div>

                    <div className="tour-item-footer">
                      <button
                        type="button"
                        className="btn btn-primary tour-btn-start"
                        onClick={() => handleStartTour(tour)}
                      >
                        ▶ {id.tours.hub.startTour}
                      </button>

                      {onOpenBuilder && (
                        <button
                          type="button"
                          className="btn btn-secondary tour-btn-edit"
                          onClick={() => {
                            onClose();
                            onOpenBuilder(tour.id);
                          }}
                        >
                          ✏ {id.tours.hub.editTour}
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary tour-btn-delete"
                        onClick={() => handleDeleteTour(tour)}
                      >
                        🗑 {id.tours.hub.deleteTour}
                      </button>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
