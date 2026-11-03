import { useState } from 'react';
import { GlassPanel } from '../../ui/GlassPanel';
import { id } from '../../lib/i18n/id';
import { useCmsStore } from './cmsStore';
import type { CmsPoi } from './types';
import { poiSchema, type PoiFormData } from './validation';
import { VisualCoordinatePicker } from './VisualCoordinatePicker';

interface PoiFormModalProps {
  initialPoi?: CmsPoi | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PoiFormModal({
  initialPoi,
  isOpen,
  onClose,
}: PoiFormModalProps) {
  const createPoi = useCmsStore((state) => state.createPoi);
  const updatePoi = useCmsStore((state) => state.updatePoi);
  const bodies = useCmsStore((state) => state.bodies);

  const isEditing = Boolean(initialPoi);

  const [formData, setFormData] = useState<Partial<PoiFormData>>({
    id: initialPoi?.id ?? '',
    bodyId: initialPoi?.bodyId ?? 'mars',
    slug: initialPoi?.slug ?? '',
    name: initialPoi?.name ?? '',
    type: initialPoi?.type ?? 'gunung',
    lat: initialPoi?.lat ?? 0,
    lon: initialPoi?.lon ?? 0,
    historyText: initialPoi?.historyText ?? '',
    dimensions: initialPoi?.dimensions
      ? initialPoi.dimensions.map((d) => ({
          label: d.label,
          nilai: d.nilai ?? 0,
          satuan: d.satuan,
          sumber: d.sumber,
        }))
      : [],
    sources:
      initialPoi && initialPoi.sources.length > 0
        ? [...initialPoi.sources]
        : ['NASA Planetary Data System'],
    isPublished: initialPoi?.isPublished ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sourceInput, setSourceInput] = useState('');

  // Form input untuk menambah dimensi baru
  const [dimLabel, setDimLabel] = useState('');
  const [dimValue, setDimValue] = useState('');
  const [dimUnit, setDimUnit] = useState('km');
  const [dimSource, setDimSource] = useState('');

  if (!isOpen) return null;

  const currentPlanet = bodies.find((b) => b.id === formData.bodyId);

  const handleFieldChange = (field: keyof PoiFormData, value: unknown) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && !isEditing && (!prev.slug || prev.slug === '')) {
        next.slug = String(value)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        next.id = `${next.bodyId || 'poi'}-${next.slug}`;
      }
      if (field === 'bodyId' && !isEditing) {
        next.id = `${value}-${next.slug || 'poi'}`;
      }
      return next;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCoordinateChange = (lat: number, lon: number) => {
    setFormData((prev) => ({ ...prev, lat, lon }));
    if (errors.lat || errors.lon) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.lat;
        delete next.lon;
        return next;
      });
    }
  };

  const handleAddDimension = () => {
    if (!dimLabel.trim() || !dimValue || !dimSource.trim()) {
      alert('Label, nilai numerik, dan sumber fakta dimensi wajib diisi.');
      return;
    }
    const valNum = parseFloat(dimValue);
    if (isNaN(valNum)) {
      alert('Nilai dimensi harus berupa angka valid.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      dimensions: [
        ...(prev.dimensions || []),
        {
          label: dimLabel.trim(),
          nilai: valNum,
          satuan: dimUnit.trim(),
          sumber: dimSource.trim(),
        },
      ],
    }));

    setDimLabel('');
    setDimValue('');
    setDimSource('');
  };

  const handleRemoveDimension = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      dimensions: (prev.dimensions || []).filter((_, i) => i !== idx),
    }));
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

    const result = poiSchema.safeParse(formData);
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
      if (isEditing && initialPoi) {
        updatePoi(initialPoi.id, result.data);
      } else {
        createPoi(result.data);
      }
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Gagal menyimpan titik minat.';
      setErrors({ form: errorMsg });
    }
  };

  return (
    <div
      className="tour-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="poi-form-title"
    >
      <GlassPanel className="cms-form-modal-card">
        {/* Header Modal */}
        <div className="tour-builder-header">
          <div>
            <h2 id="poi-form-title" className="tour-builder-title">
              {isEditing ? id.cms.actions.editPoi : id.cms.actions.createPoi}
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
          {/* Baris 1: Benda Langit Induk, Nama POI, Slug, Tipe */}
          <div className="cms-form-row">
            <div className="form-field-group" style={{ flex: 1.5 }}>
              <label htmlFor="poi-body-id" className="auth-label">
                {id.cms.labels.targetObject} *
              </label>
              <select
                id="poi-body-id"
                className="auth-input"
                value={formData.bodyId}
                onChange={(e) => handleFieldChange('bodyId', e.target.value)}
                disabled={isEditing}
              >
                {bodies.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field-group" style={{ flex: 2 }}>
              <label htmlFor="poi-name" className="auth-label">
                {id.cms.labels.name} *
              </label>
              <input
                id="poi-name"
                type="text"
                className={`auth-input ${errors.name ? 'auth-input--error' : ''}`}
                value={formData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Contoh: Kawah Tycho, Valles Marineris"
                required
              />
              {errors.name && (
                <span className="field-error-msg">{errors.name}</span>
              )}
            </div>

            <div className="form-field-group" style={{ flex: 1.5 }}>
              <label htmlFor="poi-slug" className="auth-label">
                {id.cms.labels.slug} *
              </label>
              <input
                id="poi-slug"
                type="text"
                className={`auth-input ${errors.slug ? 'auth-input--error' : ''}`}
                value={formData.slug || ''}
                onChange={(e) => {
                  handleFieldChange('slug', e.target.value);
                  handleFieldChange(
                    'id',
                    `${formData.bodyId}-${e.target.value}`,
                  );
                }}
                disabled={isEditing}
                placeholder="kawah-tycho"
                required
              />
              {errors.slug && (
                <span className="field-error-msg">{errors.slug}</span>
              )}
            </div>

            <div className="form-field-group" style={{ flex: 1.2 }}>
              <label htmlFor="poi-type" className="auth-label">
                {id.cms.labels.type}
              </label>
              <select
                id="poi-type"
                className="auth-input"
                value={formData.type}
                onChange={(e) => handleFieldChange('type', e.target.value)}
              >
                <option value="gunung">Gunung (Mountain)</option>
                <option value="badai">Badai (Storm)</option>
                <option value="kawah">Kawah (Crater)</option>
                <option value="lembah">Lembah (Canyon)</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          {/* Penentu Koordinat Visual 3D */}
          <VisualCoordinatePicker
            planetName={currentPlanet?.name || 'Planet'}
            lat={formData.lat ?? 0}
            lon={formData.lon ?? 0}
            onChange={handleCoordinateChange}
          />

          {/* Input Manual Koordinat Lat & Lon */}
          <div className="cms-form-row">
            <div className="form-field-group">
              <label htmlFor="poi-lat" className="auth-label">
                {id.cms.labels.latitude} *
              </label>
              <input
                id="poi-lat"
                type="number"
                step="any"
                className={`auth-input ${errors.lat ? 'auth-input--error' : ''}`}
                value={formData.lat ?? ''}
                onChange={(e) =>
                  handleFieldChange(
                    'lat',
                    e.target.value ? parseFloat(e.target.value) : 0,
                  )
                }
                required
              />
              {errors.lat && (
                <span className="field-error-msg">{errors.lat}</span>
              )}
            </div>

            <div className="form-field-group">
              <label htmlFor="poi-lon" className="auth-label">
                {id.cms.labels.longitude} *
              </label>
              <input
                id="poi-lon"
                type="number"
                step="any"
                className={`auth-input ${errors.lon ? 'auth-input--error' : ''}`}
                value={formData.lon ?? ''}
                onChange={(e) =>
                  handleFieldChange(
                    'lon',
                    e.target.value ? parseFloat(e.target.value) : 0,
                  )
                }
                required
              />
              {errors.lon && (
                <span className="field-error-msg">{errors.lon}</span>
              )}
            </div>
          </div>

          {/* Teks Sejarah & Pembentukan */}
          <div className="form-field-group">
            <label htmlFor="poi-history" className="auth-label">
              {id.cms.labels.historyText} *
            </label>
            <textarea
              id="poi-history"
              rows={4}
              className={`auth-input ${errors.historyText ? 'auth-input--error' : ''}`}
              value={formData.historyText || ''}
              onChange={(e) => handleFieldChange('historyText', e.target.value)}
              placeholder="Jelaskan sejarah geologi, karakteristik fisik, dan proses pembentukan fitur ini secara ilmiah..."
              required
            />
            {errors.historyText && (
              <span className="field-error-msg">{errors.historyText}</span>
            )}
          </div>

          {/* Parameter Dimensi Terukur (dengan sumber wajib) */}
          <div className="form-field-group">
            <label className="auth-label">{id.cms.labels.dimensions}</label>

            {/* List Dimensi yang sudah ada */}
            <ul className="cms-dim-list">
              {(formData.dimensions || []).map((dim, idx) => (
                <li key={idx} className="cms-dim-item">
                  <div className="cms-dim-info">
                    <strong>{dim.label}:</strong> {dim.nilai} {dim.satuan}
                    <span className="cms-dim-source">
                      (Sumber: {dim.sumber})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="cms-chip-remove-btn"
                    onClick={() => handleRemoveDimension(idx)}
                    aria-label={`Hapus dimensi ${dim.label}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {/* Input Dimensi Baru */}
            <div className="cms-dim-inputs-row">
              <input
                type="text"
                className="auth-input"
                style={{ flex: 1.5 }}
                placeholder={id.cms.labels.dimensionLabel}
                value={dimLabel}
                onChange={(e) => setDimLabel(e.target.value)}
              />
              <input
                type="number"
                step="any"
                className="auth-input"
                style={{ flex: 1 }}
                placeholder={id.cms.labels.dimensionValue}
                value={dimValue}
                onChange={(e) => setDimValue(e.target.value)}
              />
              <input
                type="text"
                className="auth-input"
                style={{ flex: 0.8 }}
                placeholder={id.cms.labels.dimensionUnit}
                value={dimUnit}
                onChange={(e) => setDimUnit(e.target.value)}
              />
              <input
                type="text"
                className="auth-input"
                style={{ flex: 2 }}
                placeholder={id.cms.labels.dimensionSource}
                value={dimSource}
                onChange={(e) => setDimSource(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddDimension}
              >
                + Tambah
              </button>
            </div>
          </div>

          {/* Sumber Ilmiah Terbuka (Wajib) */}
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
                <strong>Terbitkan Langsung ke Eksplorasi Siswa</strong> (Uncheck
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
