import { useState } from 'react';
import { GlassPanel } from '../../ui/GlassPanel';
import { id } from '../../lib/i18n/id';
import { useCmsStore } from './cmsStore';
import type { CmsCelestialBody } from './types';
import { celestialBodySchema, type CelestialBodyFormData } from './validation';

interface CelestialBodyFormModalProps {
  initialBody?: CmsCelestialBody | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CelestialBodyFormModal({
  initialBody,
  isOpen,
  onClose,
}: CelestialBodyFormModalProps) {
  const createBody = useCmsStore((state) => state.createBody);
  const updateBody = useCmsStore((state) => state.updateBody);
  const existingBodies = useCmsStore((state) => state.bodies);

  const isEditing = Boolean(initialBody);

  const [formData, setFormData] = useState<Partial<CelestialBodyFormData>>({
    id: initialBody?.id ?? '',
    slug: initialBody?.slug ?? '',
    name: initialBody?.name ?? '',
    type: initialBody?.type ?? 'planet',
    parentId: initialBody?.parentId ?? '',
    diameterKm: initialBody?.diameterKm ?? undefined,
    massKg: initialBody?.massKg ?? undefined,
    rotationPeriodH: initialBody?.rotationPeriodH ?? undefined,
    axialTiltDeg: initialBody?.axialTiltDeg ?? undefined,
    semiMajorAxisAu: initialBody?.semiMajorAxisAu ?? undefined,
    eccentricity: initialBody?.eccentricity ?? undefined,
    inclinationDeg: initialBody?.inclinationDeg ?? undefined,
    orbitPeriodDays: initialBody?.orbitPeriodDays ?? undefined,
    description: initialBody?.description ?? '',
    sources:
      initialBody && initialBody.sources.length > 0
        ? [...initialBody.sources]
        : ['https://science.nasa.gov/facts/'],
    isPublished: initialBody?.isPublished ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sourceInput, setSourceInput] = useState('');

  if (!isOpen) return null;

  const handleFieldChange = (
    field: keyof CelestialBodyFormData,
    value: unknown,
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Otomatis hasilkan slug dari nama jika belum diubah manual
      if (field === 'name' && !isEditing && (!prev.slug || prev.slug === '')) {
        next.slug = String(value)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        next.id = next.slug;
      }
      return next;
    });
    // Hapus error jika diperbaiki
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAddSource = () => {
    if (!sourceInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      sources: [...(prev.sources || []), sourceInput.trim()],
    }));
    setSourceInput('');
    if (errors.sources) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.sources;
        return next;
      });
    }
  };

  const handleRemoveSource = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      sources: (prev.sources || []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = celestialBodySchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (!newErrors[path]) {
          newErrors[path] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    try {
      if (isEditing && initialBody) {
        updateBody(initialBody.id, result.data);
      } else {
        createBody(result.data);
      }
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Gagal menyimpan benda langit.';
      setErrors({ form: errorMsg });
    }
  };

  return (
    <div
      className="tour-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="body-form-title"
    >
      <GlassPanel className="cms-form-modal-card">
        {/* Header Modal */}
        <div className="tour-builder-header">
          <div>
            <h2 id="body-form-title" className="tour-builder-title">
              {isEditing ? id.cms.actions.editBody : id.cms.actions.createBody}
            </h2>
            <p className="tour-builder-subtitle">
              {id.cms.labels.sourcesRequiredNotice}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            aria-label="Tutup formulir"
          >
            ✕
          </button>
        </div>

        {errors.form && (
          <div className="auth-alert auth-alert--error" role="alert">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cms-form-body">
          {/* Baris 1: Nama, Slug, Tipe */}
          <div className="cms-form-row">
            <div className="form-field-group" style={{ flex: 2 }}>
              <label htmlFor="body-name" className="auth-label">
                {id.cms.labels.name} *
              </label>
              <input
                id="body-name"
                type="text"
                className={`auth-input ${errors.name ? 'auth-input--error' : ''}`}
                value={formData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Contoh: Mars, Ganymede"
                required
              />
              {errors.name && (
                <span className="field-error-msg">{errors.name}</span>
              )}
            </div>

            <div className="form-field-group" style={{ flex: 2 }}>
              <label htmlFor="body-slug" className="auth-label">
                {id.cms.labels.slug} *
              </label>
              <input
                id="body-slug"
                type="text"
                className={`auth-input ${errors.slug ? 'auth-input--error' : ''}`}
                value={formData.slug || ''}
                onChange={(e) => {
                  handleFieldChange('slug', e.target.value);
                  handleFieldChange('id', e.target.value);
                }}
                disabled={isEditing}
                placeholder="contoh: mars"
                required
              />
              {errors.slug && (
                <span className="field-error-msg">{errors.slug}</span>
              )}
            </div>

            <div className="form-field-group" style={{ flex: 1.5 }}>
              <label htmlFor="body-type" className="auth-label">
                {id.cms.labels.type}
              </label>
              <select
                id="body-type"
                className="auth-input"
                value={formData.type}
                onChange={(e) => handleFieldChange('type', e.target.value)}
              >
                <option value="star">Bintang (Star)</option>
                <option value="planet">Planet</option>
                <option value="dwarf_planet">Planet Kerdil</option>
                <option value="moon">Bulan / Satelit</option>
              </select>
            </div>
          </div>

          {/* Baris 2: Induk (jika satelit), Diameter, Rotasi */}
          <div className="cms-form-row">
            {formData.type === 'moon' && (
              <div className="form-field-group" style={{ flex: 1.5 }}>
                <label htmlFor="body-parent" className="auth-label">
                  {id.cms.labels.parentId}
                </label>
                <select
                  id="body-parent"
                  className="auth-input"
                  value={formData.parentId || ''}
                  onChange={(e) =>
                    handleFieldChange('parentId', e.target.value)
                  }
                >
                  <option value="">-- Pilih Planet Induk --</option>
                  {existingBodies
                    .filter((b) => b.type === 'planet')
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="form-field-group">
              <label htmlFor="body-diameter" className="auth-label">
                {id.cms.labels.diameterKm}
              </label>
              <input
                id="body-diameter"
                type="number"
                step="any"
                className="auth-input"
                value={formData.diameterKm ?? ''}
                onChange={(e) =>
                  handleFieldChange(
                    'diameterKm',
                    e.target.value ? parseFloat(e.target.value) : null,
                  )
                }
                placeholder="Misal: 6779"
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="body-rotation" className="auth-label">
                {id.cms.labels.rotationPeriodH}
              </label>
              <input
                id="body-rotation"
                type="number"
                step="any"
                className="auth-input"
                value={formData.rotationPeriodH ?? ''}
                onChange={(e) =>
                  handleFieldChange(
                    'rotationPeriodH',
                    e.target.value ? parseFloat(e.target.value) : null,
                  )
                }
                placeholder="Misal: 24.6"
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="body-tilt" className="auth-label">
                {id.cms.labels.axialTiltDeg}
              </label>
              <input
                id="body-tilt"
                type="number"
                step="any"
                className="auth-input"
                value={formData.axialTiltDeg ?? ''}
                onChange={(e) =>
                  handleFieldChange(
                    'axialTiltDeg',
                    e.target.value ? parseFloat(e.target.value) : null,
                  )
                }
                placeholder="Misal: 25.2"
              />
            </div>
          </div>

          {/* Baris 3: Elemen Orbit (AU, Eksentrisitas, Hari Orbit) */}
          <div className="cms-form-row">
            <div className="form-field-group">
              <label htmlFor="body-au" className="auth-label">
                {id.cms.labels.semiMajorAxisAu}
              </label>
              <input
                id="body-au"
                type="number"
                step="any"
                className="auth-input"
                value={formData.semiMajorAxisAu ?? ''}
                onChange={(e) =>
                  handleFieldChange(
                    'semiMajorAxisAu',
                    e.target.value ? parseFloat(e.target.value) : null,
                  )
                }
                placeholder="Misal: 1.52"
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="body-ecc" className="auth-label">
                {id.cms.labels.eccentricity}
              </label>
              <input
                id="body-ecc"
                type="number"
                step="any"
                className="auth-input"
                value={formData.eccentricity ?? ''}
                onChange={(e) =>
                  handleFieldChange(
                    'eccentricity',
                    e.target.value ? parseFloat(e.target.value) : null,
                  )
                }
                placeholder="0.000 s.d. 1.000"
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="body-period" className="auth-label">
                {id.cms.labels.orbitPeriodDays}
              </label>
              <input
                id="body-period"
                type="number"
                step="any"
                className="auth-input"
                value={formData.orbitPeriodDays ?? ''}
                onChange={(e) =>
                  handleFieldChange(
                    'orbitPeriodDays',
                    e.target.value ? parseFloat(e.target.value) : null,
                  )
                }
                placeholder="Misal: 687"
              />
            </div>
          </div>

          {/* Deskripsi Edukasi */}
          <div className="form-field-group">
            <label htmlFor="body-desc" className="auth-label">
              {id.cms.labels.description} *
            </label>
            <textarea
              id="body-desc"
              rows={3}
              className={`auth-input ${errors.description ? 'auth-input--error' : ''}`}
              value={formData.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Tuliskan ringkasan deskripsi fakta sains benda langit ini..."
              required
            />
            {errors.description && (
              <span className="field-error-msg">{errors.description}</span>
            )}
          </div>

          {/* Sumber Ilmiah Terverifikasi (Wajib) */}
          <div className="form-field-group">
            <label className="auth-label">{id.cms.labels.sources} *</label>
            <div className="cms-source-input-row">
              <input
                type="text"
                className="auth-input"
                value={sourceInput}
                onChange={(e) => setSourceInput(e.target.value)}
                placeholder={id.cms.labels.sourcePlaceholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSource();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddSource}
              >
                {id.cms.labels.addSource}
              </button>
            </div>
            {errors.sources && (
              <span className="field-error-msg">{errors.sources}</span>
            )}

            <ul className="cms-source-chips-list">
              {(formData.sources || []).map((s, idx) => (
                <li key={idx} className="cms-source-chip">
                  <span className="cms-source-chip-text">{s}</span>
                  <button
                    type="button"
                    className="cms-chip-remove-btn"
                    onClick={() => handleRemoveSource(idx)}
                    aria-label={`Hapus sumber ${s}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Status Draf / Terbit */}
          <div className="cms-publish-row">
            <label className="cms-checkbox-label">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) =>
                  handleFieldChange('isPublished', e.target.checked)
                }
              />
              <span>
                <strong>Terbitkan Langsung ke Katalog Publik</strong> (Uncheck
                untuk menyimpan sebagai Draf)
              </span>
            </label>
          </div>

          {/* Tombol Aksi */}
          <div className="tour-builder-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              {id.cms.actions.cancel}
            </button>
            <button type="submit" className="btn btn-primary">
              ✓ {id.cms.actions.save}
            </button>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}
