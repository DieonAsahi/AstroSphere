import { useEffect, useId, useMemo, useState } from 'react';
import type { CelestialBody, PointOfInterest } from '../../data/types';
import { bodyRepository } from '../../data/repository/bodyRepository';
import { poiRepository } from '../../data/repository/poiRepository';
import { id } from '../../lib/i18n/id';
import { GlassPanel } from '../../ui/GlassPanel';
import { useAuthStore } from '../classes/authStore';
import { useClassStore } from '../classes/classStore';
import { useTourStore } from './tourStore';
import type { Tour, TourStep } from './types';

interface TourBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTourId?: string | null;
}

export function TourBuilderModal({
  isOpen,
  onClose,
  editingTourId,
}: TourBuilderModalProps) {
  const user = useAuthStore((state) => state.user);
  const getTeacherClasses = useClassStore((state) => state.getTeacherClasses);
  const teacherClasses = useMemo(
    () => (user ? getTeacherClasses(user.id) : []),
    [user, getTeacherClasses],
  );

  const createTour = useTourStore((state) => state.createTour);
  const updateTour = useTourStore((state) => state.updateTour);
  const startTour = useTourStore((state) => state.startTour);
  const getTourById = useTourStore((state) => state.getTourById);
  const liveCamera = useTourStore((state) => state.liveCamera);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [selectedPoiToAdd, setSelectedPoiToAdd] = useState('');
  const [cameraToastStepId, setCameraToastStepId] = useState<string | null>(
    null,
  );
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Katalog POI & Planet untuk dropdown pemilihan
  const [allPois, setAllPois] = useState<PointOfInterest[]>([]);
  const [allBodies, setAllBodies] = useState<CelestialBody[]>([]);

  const titleInputId = useId();
  const descInputId = useId();
  const poiSelectId = useId();

  // Muat data POI & Bodies
  useEffect(() => {
    void poiRepository.listPois().then(setAllPois);
    void bodyRepository.listBodies().then(setAllBodies);
  }, []);

  // Muat data tur yang sedang diedit atau reset form baru
  useEffect(() => {
    if (!isOpen) return;

    if (editingTourId) {
      const existing = getTourById(editingTourId);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description);
        setSelectedClassIds(existing.classIds);
        setSteps(existing.steps);
        return;
      }
    }

    // Reset default form baru
    setTitle('');
    setDescription('');
    setSelectedClassIds(teacherClasses.map((c) => c.id));
    setSteps([]);
    setLiveAnnouncement('');
  }, [isOpen, editingTourId, getTourById, teacherClasses]);

  if (!isOpen) return null;

  // Handler penambahan POI ke langkah tur
  const handleAddStep = () => {
    if (!selectedPoiToAdd) return;
    const poi = allPois.find((p) => p.id === selectedPoiToAdd);
    if (!poi) return;
    const body = allBodies.find((b) => b.id === poi.bodyId);

    const nextNo = steps.length + 1;
    const newStep: TourStep = {
      id: `step-${Date.now()}-${nextNo}`,
      tourId: editingTourId || 'new-tour',
      poiId: poi.id,
      poiName: poi.name,
      bodyId: poi.bodyId,
      bodyName: body?.name ?? poi.bodyId,
      stepNo: nextNo,
      narrationText: `${poi.name} di ${body?.name ?? 'planet'}: ${poi.historyText.slice(0, 160)}...`,
      cameraPreset: {
        position: [...liveCamera.position],
        target: [...liveCamera.target],
        fov: liveCamera.fov ?? 45,
      },
      durationS: 12,
    };

    setSteps((prev) => [...prev, newStep]);
    setSelectedPoiToAdd('');
    setLiveAnnouncement(`Langkah baru ${poi.name} berhasil ditambahkan.`);
  };

  // Handler hapus langkah
  const handleDeleteStep = (stepId: string, poiName: string) => {
    setSteps((prev) =>
      prev
        .filter((s) => s.id !== stepId)
        .map((s, idx) => ({ ...s, stepNo: idx + 1 })),
    );
    setLiveAnnouncement(id.tours.builder.stepDeletedAnnouncement(poiName));
  };

  // Reorder helper yang aman dan konsisten
  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      fromIndex >= steps.length ||
      toIndex < 0 ||
      toIndex >= steps.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const reordered = [...steps];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const updated = reordered.map((s, idx) => ({ ...s, stepNo: idx + 1 }));
    setSteps(updated);
    setLiveAnnouncement(
      id.tours.builder.reorderAnnouncement(
        fromIndex + 1,
        toIndex + 1,
        moved.poiName,
      ),
    );
  };

  // Handler keyboard reordering (Alt+ArrowUp / Alt+ArrowDown)
  const handleStepKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      handleReorder(index, index - 1);
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      handleReorder(index, index + 1);
    }
  };

  // Tangkap koordinat kamera scene saat ini ke langkah yang dipilih
  const handleCaptureCamera = (stepId: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              cameraPreset: {
                position: [...liveCamera.position],
                target: [...liveCamera.target],
                fov: liveCamera.fov ?? 45,
              },
            }
          : s,
      ),
    );
    setCameraToastStepId(stepId);
    window.setTimeout(() => setCameraToastStepId(null), 2500);
    setLiveAnnouncement(id.tours.builder.cameraSavedToast);
  };

  // Update teks narasi atau durasi per langkah
  const handleUpdateStepField = <K extends keyof TourStep>(
    stepId: string,
    field: K,
    value: TourStep[K],
  ) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)),
    );
  };

  // Toggle pilihan kelas
  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId],
    );
  };

  // Simpan / Terbitkan Tur
  const handleSave = (isPublished: boolean) => {
    if (!title.trim()) {
      alert('Judul tur wajib diisi.');
      return;
    }
    if (steps.length === 0) {
      alert(
        'Tambahkan setidaknya satu langkah titik minat (POI) ke dalam tur.',
      );
      return;
    }
    if (!user) return;

    if (editingTourId) {
      updateTour(editingTourId, {
        title: title.trim(),
        description: description.trim(),
        classIds: selectedClassIds,
        steps,
        isPublished,
      });
    } else {
      createTour(user, {
        title: title.trim(),
        description: description.trim(),
        classIds: selectedClassIds,
        steps,
        isPublished,
      });
    }
    onClose();
  };

  // Pratinjau langsung di Scene 3D
  const handlePreview = () => {
    if (steps.length === 0) {
      alert('Tambahkan setidaknya satu langkah sebelum melakukan pratinjau.');
      return;
    }
    const previewTour: Tour = {
      id: editingTourId || 'preview-temp-tour',
      createdBy: user?.id || 'preview-user',
      authorName: user?.name || 'Guru',
      title: title.trim() || 'Pratinjau Tur Edukasi',
      description: description.trim(),
      isPublished: false,
      classIds: selectedClassIds,
      steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onClose();
    startTour(previewTour, true);
  };

  return (
    <div
      className="tour-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-builder-title"
    >
      {/* Pengumuman Pembaca Layar Aksesibilitas */}
      <div className="sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </div>

      <GlassPanel className="tour-builder-card">
        {/* Header Modal */}
        <div className="tour-builder-header">
          <div>
            <h2 id="tour-builder-title" className="tour-builder-title">
              {editingTourId
                ? id.tours.builder.editTitle
                : id.tours.builder.title}
            </h2>
            <p className="tour-builder-subtitle">{id.tours.builder.subtitle}</p>
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

        {/* Konten Form Builder */}
        <div className="tour-builder-body">
          {/* Metadata Tur: Judul & Deskripsi */}
          <div className="form-group">
            <label htmlFor={titleInputId} className="form-label">
              {id.tours.builder.tourTitleLabel} *
            </label>
            <input
              id={titleInputId}
              type="text"
              required
              className="form-input"
              placeholder={id.tours.builder.tourTitlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor={descInputId} className="form-label">
              {id.tours.builder.descriptionLabel}
            </label>
            <textarea
              id={descInputId}
              rows={2}
              className="form-input"
              placeholder={id.tours.builder.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Pembagian Akses ke Satu atau Banyak Kelas */}
          <div className="form-group">
            <label className="form-label">
              {id.tours.builder.classesLabel}
            </label>
            <p className="tour-classes-help">{id.tours.builder.classesHelp}</p>
            {teacherClasses.length === 0 ? (
              <p className="tour-classes-none">
                {id.tours.builder.noClassesForTeacher}
              </p>
            ) : (
              <div className="tour-class-checkboxes">
                {teacherClasses.map((cls) => {
                  const isChecked = selectedClassIds.includes(cls.id);
                  return (
                    <label key={cls.id} className="tour-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleClass(cls.id)}
                        className="tour-checkbox-input"
                      />
                      <span>
                        <strong>{cls.name}</strong> ({cls.gradeLevel})
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="tour-divider" />

          {/* Bagian Penyusunan Langkah-Langkah (POI) */}
          <div className="tour-steps-section">
            <div className="tour-steps-section-header">
              <h3 className="tour-steps-title">
                {id.tours.builder.stepsSectionTitle}
              </h3>

              {/* Selector Penambahan POI */}
              <div className="tour-add-poi-row">
                <label htmlFor={poiSelectId} className="sr-only">
                  Pilih POI untuk ditambahkan
                </label>
                <select
                  id={poiSelectId}
                  className="form-input tour-select-poi"
                  value={selectedPoiToAdd}
                  onChange={(e) => setSelectedPoiToAdd(e.target.value)}
                >
                  <option value="">
                    {id.tours.builder.selectPoiPlaceholder}
                  </option>
                  {allPois.map((p) => {
                    const b = allBodies.find((body) => body.id === p.bodyId);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({b?.name ?? p.bodyId})
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  className="btn btn-primary tour-btn-add-poi"
                  onClick={handleAddStep}
                  disabled={!selectedPoiToAdd}
                >
                  + {id.tours.builder.addStepButton}
                </button>
              </div>
            </div>

            {/* Daftar Langkah dengan Drag-and-Drop dan Keyboard Reordering */}
            {steps.length === 0 ? (
              <div className="tour-steps-empty">
                <p>{id.tours.builder.noStepsYet}</p>
              </div>
            ) : (
              <div
                className="tour-steps-list"
                role="list"
                aria-label="Urutan langkah tur terpandu"
              >
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    role="listitem"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(idx));
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIdx = Number(
                        e.dataTransfer.getData('text/plain'),
                      );
                      handleReorder(fromIdx, idx);
                    }}
                    onKeyDown={(e) => handleStepKeyDown(e, idx)}
                    tabIndex={0}
                    className="tour-step-card"
                    aria-label={`Langkah ${step.stepNo}: ${step.poiName}. Tekan Alt+Panah Atas atau Alt+Panah Bawah untuk mengubah urutan.`}
                  >
                    {/* Header Langkah */}
                    <div className="tour-step-card-header">
                      <div className="tour-step-title-group">
                        <span
                          className="tour-drag-handle"
                          title="Seret untuk mengubah urutan"
                          aria-hidden="true"
                        >
                          ⋮⋮
                        </span>
                        <h4 className="tour-step-name">
                          {id.tours.builder.stepHeader(
                            step.stepNo,
                            step.poiName,
                            step.bodyName,
                          )}
                        </h4>
                      </div>

                      <div className="tour-step-actions">
                        {/* Tombol Reorder Keyboard Ramah Aksesibilitas */}
                        <button
                          type="button"
                          className="btn-icon-tiny"
                          disabled={idx === 0}
                          onClick={() => handleReorder(idx, idx - 1)}
                          aria-label={`Pindahkan langkah ${step.stepNo} ke atas`}
                          title={id.tours.builder.moveUp}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="btn-icon-tiny"
                          disabled={idx === steps.length - 1}
                          onClick={() => handleReorder(idx, idx + 1)}
                          aria-label={`Pindahkan langkah ${step.stepNo} ke bawah`}
                          title={id.tours.builder.moveDown}
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          className="btn-icon-tiny btn-icon-danger"
                          onClick={() =>
                            handleDeleteStep(step.id, step.poiName)
                          }
                          aria-label={`Hapus langkah ${step.stepNo} (${step.poiName})`}
                          title={id.tours.builder.deleteStep}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Form Teks Narasi & Durasi Langkah */}
                    <div className="tour-step-card-body">
                      <div
                        className="form-group"
                        style={{ marginBottom: '0.75rem' }}
                      >
                        <label
                          htmlFor={`narration-${step.id}`}
                          className="form-label"
                        >
                          {id.tours.builder.narrationLabel}
                        </label>
                        <textarea
                          id={`narration-${step.id}`}
                          rows={3}
                          className="form-input"
                          placeholder={id.tours.builder.narrationPlaceholder}
                          value={step.narrationText}
                          onChange={(e) =>
                            handleUpdateStepField(
                              step.id,
                              'narrationText',
                              e.target.value,
                            )
                          }
                        />
                      </div>

                      <div className="tour-step-config-row">
                        <div className="tour-step-duration-col">
                          <label
                            htmlFor={`duration-${step.id}`}
                            className="form-label"
                          >
                            {id.tours.builder.durationLabel}
                          </label>
                          <input
                            id={`duration-${step.id}`}
                            type="number"
                            min={5}
                            max={60}
                            step={1}
                            className="form-input tour-input-duration"
                            value={step.durationS}
                            onChange={(e) =>
                              handleUpdateStepField(
                                step.id,
                                'durationS',
                                Math.max(5, Number(e.target.value)),
                              )
                            }
                          />
                        </div>

                        {/* Pengambilan Posisi Kamera Scene 3D */}
                        <div className="tour-step-camera-col">
                          <span className="form-label">
                            {id.tours.builder.cameraPresetTitle}
                          </span>
                          <div className="tour-camera-coords">
                            <span>
                              XYZ: [
                              {step.cameraPreset.position
                                .map((v) => v.toFixed(1))
                                .join(', ')}
                              ]
                            </span>
                            <span>
                              Target: [
                              {step.cameraPreset.target
                                .map((v) => v.toFixed(1))
                                .join(', ')}
                              ]
                            </span>
                          </div>

                          <button
                            type="button"
                            className="btn btn-secondary tour-btn-capture-cam"
                            onClick={() => handleCaptureCamera(step.id)}
                            aria-label={`Simpan posisi kamera scene saat ini ke langkah ${step.stepNo}`}
                          >
                            📷 {id.tours.builder.saveCurrentCamera}
                          </button>

                          {cameraToastStepId === step.id && (
                            <span
                              className="tour-cam-toast"
                              role="status"
                              aria-live="polite"
                            >
                              ✓ {id.tours.builder.cameraSavedToast}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Tombol Aksi */}
        <div className="tour-builder-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {id.tours.builder.cancel}
          </button>

          <button
            type="button"
            className="btn btn-secondary tour-btn-preview"
            onClick={handlePreview}
            disabled={steps.length === 0}
          >
            👁 {id.tours.builder.preview}
          </button>

          <button
            type="button"
            className="btn btn-secondary tour-btn-save-draft"
            onClick={() => handleSave(false)}
          >
            💾 {id.tours.builder.saveDraft}
          </button>

          <button
            type="button"
            className="btn btn-primary tour-btn-publish"
            onClick={() => handleSave(true)}
          >
            🚀 {id.tours.builder.publish}
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}
