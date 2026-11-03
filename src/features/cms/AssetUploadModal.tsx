import { useId, useMemo, useState } from 'react';
import { GlassPanel } from '../../ui/GlassPanel';
import { id } from '../../lib/i18n/id';
import { useCmsStore } from './cmsStore';
import type { AssetType, QualityTier } from './types';
import {
  ALLOWED_FORMATS,
  assetUploadSchema,
  FILE_SIZE_LIMITS,
  validateAssetFile,
} from './validation';

interface AssetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedTarget?: { type: 'body' | 'poi'; id: string };
}

export function AssetUploadModal({
  isOpen,
  onClose,
  preselectedTarget,
}: AssetUploadModalProps) {
  const uploadAsset = useCmsStore((state) => state.uploadAsset);
  const getNextVersion = useCmsStore((state) => state.getNextAssetVersion);
  const bodies = useCmsStore((state) => state.bodies);
  const pois = useCmsStore((state) => state.pois);

  const fileInputId = useId();

  const [targetType, setTargetType] = useState<'body' | 'poi'>(
    preselectedTarget?.type || 'body',
  );
  const [targetId, setTargetId] = useState<string>(
    preselectedTarget?.id || (bodies[0]?.id ?? 'mars'),
  );
  const [assetType, setAssetType] = useState<AssetType>('tekstur');
  const [qualityTier, setQualityTier] = useState<QualityTier>('sedang');
  const [license, setLicense] = useState('Domain Publik (NASA / USGS)');
  const [attribution, setAttribution] = useState('NASA / JPL-Caltech');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextVersion = useMemo(() => {
    return getNextVersion(targetType, targetId, assetType, qualityTier);
  }, [getNextVersion, targetType, targetId, assetType, qualityTier]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAssetFile(file, assetType);
    if (!validation.valid) {
      setFileError(validation.error || 'Berkas tidak valid.');
      setSelectedFile(null);
    } else {
      setFileError(null);
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedFile) {
      setFileError(id.cms.validation.fileRequired);
      return;
    }

    const parseResult = assetUploadSchema.safeParse({
      targetType,
      targetId,
      assetType,
      qualityTier,
      license: license.trim(),
      attribution: attribution.trim(),
    });

    if (!parseResult.success) {
      setFormError(parseResult.error.issues[0]?.message || 'Data tidak valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      uploadAsset(parseResult.data, selectedFile);
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Gagal mengunggah aset ke Supabase Storage.';
      setFormError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="tour-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-upload-title"
    >
      <GlassPanel className="cms-form-modal-card" style={{ maxWidth: '600px' }}>
        {/* Header Modal */}
        <div className="tour-builder-header">
          <div>
            <span className="tour-badge tour-badge--published">
              Supabase Storage Uploader
            </span>
            <h2
              id="asset-upload-title"
              className="tour-builder-title"
              style={{ marginTop: '0.25rem' }}
            >
              {id.cms.actions.uploadAsset}
            </h2>
            <p className="tour-builder-subtitle">
              Validasi tipe & ukuran berkas, penomoran versi otomatis, serta
              wajib lisensi terbuka.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            aria-label="Tutup formulir unggah"
          >
            ✕
          </button>
        </div>

        {formError && (
          <div className="auth-alert auth-alert--error" role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cms-form-body">
          {/* Target Asosiasi (Benda Langit atau POI) */}
          <div className="cms-form-row">
            <div className="form-field-group" style={{ flex: 1 }}>
              <label htmlFor="upload-target-type" className="auth-label">
                Tipe Target
              </label>
              <select
                id="upload-target-type"
                className="auth-input"
                value={targetType}
                onChange={(e) => {
                  const val = e.target.value as 'body' | 'poi';
                  setTargetType(val);
                  setTargetId(
                    val === 'body'
                      ? (bodies[0]?.id ?? '')
                      : (pois[0]?.id ?? ''),
                  );
                }}
              >
                <option value="body">Benda Langit</option>
                <option value="poi">Titik Minat (POI)</option>
              </select>
            </div>

            <div className="form-field-group" style={{ flex: 2 }}>
              <label htmlFor="upload-target-id" className="auth-label">
                {id.cms.labels.targetObject} *
              </label>
              <select
                id="upload-target-id"
                className="auth-input"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                required
              >
                {targetType === 'body'
                  ? bodies.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.type})
                      </option>
                    ))
                  : pois.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.bodyId})
                      </option>
                    ))}
              </select>
            </div>
          </div>

          {/* Tipe Aset & Tingkat Kualitas */}
          <div className="cms-form-row">
            <div className="form-field-group">
              <label htmlFor="upload-asset-type" className="auth-label">
                {id.cms.labels.assetType} *
              </label>
              <select
                id="upload-asset-type"
                className="auth-input"
                value={assetType}
                onChange={(e) => {
                  const nextType = e.target.value as AssetType;
                  setAssetType(nextType);
                  // Validasi ulang file jika sudah dipilih
                  if (selectedFile) {
                    const validation = validateAssetFile(
                      selectedFile,
                      nextType,
                    );
                    setFileError(
                      validation.valid ? null : validation.error || null,
                    );
                  }
                }}
              >
                <option value="tekstur">
                  Tekstur Permukaan (JPG, PNG, WebP)
                </option>
                <option value="terrain">
                  Peta Ketinggian / Heightmap (PNG, JPG)
                </option>
                <option value="model">Model 3D (GLB, glTF)</option>
                <option value="partikel">Konfigurasi Partikel (JSON)</option>
              </select>
            </div>

            <div className="form-field-group">
              <label htmlFor="upload-quality-tier" className="auth-label">
                {id.cms.labels.qualityTier} *
              </label>
              <select
                id="upload-quality-tier"
                className="auth-input"
                value={qualityTier}
                onChange={(e) => setQualityTier(e.target.value as QualityTier)}
              >
                <option value="rendah">Rendah (Low - hemat bandwidth)</option>
                <option value="sedang">Sedang (Medium - seimbang)</option>
                <option value="tinggi">Tinggi (High - detail maksimal)</option>
              </select>
            </div>
          </div>

          {/* Notifikasi Versi Otomatis */}
          <div className="cms-version-badge-row">
            <span className="cms-version-pill">
              {id.cms.labels.version}: <strong>v{nextVersion}</strong>
            </span>
            <span className="text-secondary" style={{ fontSize: '12px' }}>
              {id.cms.labels.autoVersionNotice}
            </span>
          </div>

          {/* Dropzone / File Picker */}
          <div className="form-field-group">
            <label htmlFor={fileInputId} className="auth-label">
              Pilih Berkas Aset *
            </label>
            <div
              className={`cms-dropzone ${fileError ? 'cms-dropzone--error' : ''}`}
            >
              <input
                id={fileInputId}
                type="file"
                className="cms-file-input"
                onChange={handleFileChange}
                accept={ALLOWED_FORMATS[assetType].extensions.join(',')}
              />
              <div className="cms-dropzone-content">
                <span className="cms-dropzone-icon" aria-hidden="true">
                  📁
                </span>
                {selectedFile ? (
                  <div>
                    <strong className="text-accent">{selectedFile.name}</strong>
                    <div
                      className="text-secondary"
                      style={{ fontSize: '12px' }}
                    >
                      {(selectedFile.size / 1024).toFixed(1)} KB ·{' '}
                      {selectedFile.type || 'Format terdeteksi'}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 500, margin: 0 }}>
                      {id.cms.labels.dropzoneText}
                    </p>
                    <p
                      className="text-secondary"
                      style={{ fontSize: '11px', margin: '4px 0 0 0' }}
                    >
                      Batas maksimal:{' '}
                      {FILE_SIZE_LIMITS[assetType] / (1024 * 1024)}MB (
                      {ALLOWED_FORMATS[assetType].extensions.join(', ')})
                    </p>
                  </div>
                )}
              </div>
            </div>
            {fileError && <span className="field-error-msg">{fileError}</span>}
          </div>

          {/* Lisensi Hak Cipta & Atribusi (Wajib) */}
          <div className="form-field-group">
            <label htmlFor="upload-license" className="auth-label">
              {id.cms.labels.license} *
            </label>
            <input
              id="upload-license"
              type="text"
              className="auth-input"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="Contoh: Domain Publik (NASA Planetary Data System)"
              required
            />
          </div>

          <div className="form-field-group">
            <label htmlFor="upload-attribution" className="auth-label">
              {id.cms.labels.attribution} *
            </label>
            <input
              id="upload-attribution"
              type="text"
              className="auth-input"
              value={attribution}
              onChange={(e) => setAttribution(e.target.value)}
              placeholder="Contoh: NASA / JPL-Caltech / USGS Astrogeology"
              required
            />
          </div>

          {/* Tombol Aksi */}
          <div className="tour-builder-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {id.cms.actions.cancel}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Mengunggah...' : `✓ ${id.cms.actions.upload}`}
            </button>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}
