import { useState } from 'react';
import { Link } from 'react-router-dom';
import { id } from '../../lib/i18n/id';
import { AuthBackdrop3D } from '../classes/AuthBackdrop3D';
import { AssetPreviewViewer } from './AssetPreviewViewer';
import { AssetUploadModal } from './AssetUploadModal';
import { AuditHistoryTable } from './AuditHistoryTable';
import { CelestialBodyFormModal } from './CelestialBodyFormModal';
import { useCmsStore } from './cmsStore';
import { PoiFormModal } from './PoiFormModal';
import { StudentPreviewModal } from './StudentPreviewModal';
import type { CmsAsset, CmsCelestialBody, CmsPoi } from './types';

type CmsActiveTab = 'bodies' | 'pois' | 'assets' | 'history';

export function AdminCmsPage() {
  const bodies = useCmsStore((state) => state.bodies);
  const pois = useCmsStore((state) => state.pois);
  const assets = useCmsStore((state) => state.assets);
  const deleteBody = useCmsStore((state) => state.deleteBody);
  const togglePublishBody = useCmsStore((state) => state.togglePublishBody);
  const deletePoi = useCmsStore((state) => state.deletePoi);
  const togglePublishPoi = useCmsStore((state) => state.togglePublishPoi);
  const deleteAsset = useCmsStore((state) => state.deleteAsset);

  const [activeTab, setActiveTab] = useState<CmsActiveTab>('bodies');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isBodyModalOpen, setIsBodyModalOpen] = useState(false);
  const [editingBody, setEditingBody] = useState<CmsCelestialBody | null>(null);

  const [isPoiModalOpen, setIsPoiModalOpen] = useState(false);
  const [editingPoi, setEditingPoi] = useState<CmsPoi | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewingAsset, setPreviewingAsset] = useState<CmsAsset | null>(null);

  const [studentPreview, setStudentPreview] = useState<{
    type: 'body' | 'poi';
    item: CmsCelestialBody | CmsPoi;
  } | null>(null);

  // Filter query
  const query = searchQuery.trim().toLowerCase();
  const filteredBodies = bodies.filter(
    (b) =>
      b.name.toLowerCase().includes(query) ||
      b.slug.toLowerCase().includes(query) ||
      b.type.toLowerCase().includes(query),
  );

  const filteredPois = pois.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.slug.toLowerCase().includes(query) ||
      p.bodyId.toLowerCase().includes(query) ||
      p.type.toLowerCase().includes(query),
  );

  const filteredAssets = assets.filter(
    (a) =>
      (a.bodyId && a.bodyId.toLowerCase().includes(query)) ||
      (a.poiId && a.poiId.toLowerCase().includes(query)) ||
      a.assetType.toLowerCase().includes(query) ||
      a.qualityTier.toLowerCase().includes(query),
  );

  const handleDeleteBody = (body: CmsCelestialBody) => {
    if (
      confirm(`Apakah Anda yakin ingin menghapus benda langit ${body.name}?`)
    ) {
      deleteBody(body.id);
    }
  };

  const handleDeletePoi = (poi: CmsPoi) => {
    if (confirm(`Apakah Anda yakin ingin menghapus titik minat ${poi.name}?`)) {
      deletePoi(poi.id);
    }
  };

  const handleDeleteAsset = (asset: CmsAsset) => {
    if (
      confirm(
        `Apakah Anda yakin ingin menghapus aset ${asset.assetType} v${asset.version}?`,
      )
    ) {
      deleteAsset(asset.id);
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
        <header className="classes-nav-bar">
          <Link
            to="/"
            className="classes-back-btn"
            aria-label="Kembali ke tata surya"
          >
            ← <span className="classes-back-text">Kembali ke Tata Surya</span>
          </Link>
          <div className="classes-nav-links">
            <Link to="/kelas" className="classes-nav-link">
              Kelas
            </Link>
            <Link to="/admin/metrik" className="classes-nav-link">
              Metrik KPI
            </Link>
            <span className="classes-nav-link classes-nav-link--active">
              CMS Admin
            </span>
          </div>
        </header>

        {/* Header Judul Halaman */}
        <div className="classes-header">
          <div className="classes-title-group">
            <span className="auth-role-badge">{id.cms.badge}</span>
            <h1 className="classes-title">{id.cms.title}</h1>
            <p className="classes-subtitle">{id.cms.subtitle}</p>
          </div>
        </div>

        {/* Tab Bar CMS */}
        <div
          className="tour-list-tabs"
          role="tablist"
          aria-label="Kategori CMS"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bodies'}
            className={`tour-tab-btn ${activeTab === 'bodies' ? 'tour-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('bodies')}
          >
            🪐 {id.cms.tabs.bodies} ({bodies.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pois'}
            className={`tour-tab-btn ${activeTab === 'pois' ? 'tour-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('pois')}
          >
            📍 {id.cms.tabs.pois} ({pois.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'assets'}
            className={`tour-tab-btn ${activeTab === 'assets' ? 'tour-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            📦 {id.cms.tabs.assets} ({assets.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`tour-tab-btn ${activeTab === 'history' ? 'tour-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            🕒 {id.cms.tabs.history}
          </button>
        </div>

        {/* Kontrol Pencarian & Tambah Data */}
        {activeTab !== 'history' && (
          <div className="cms-toolbar-row">
            <div className="cms-search-box">
              <input
                type="search"
                className="auth-input"
                placeholder={id.cms.actions.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari data CMS"
              />
            </div>

            <div className="cms-toolbar-actions">
              {activeTab === 'bodies' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingBody(null);
                    setIsBodyModalOpen(true);
                  }}
                >
                  + {id.cms.actions.createBody}
                </button>
              )}
              {activeTab === 'pois' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingPoi(null);
                    setIsPoiModalOpen(true);
                  }}
                >
                  + {id.cms.actions.createPoi}
                </button>
              )}
              {activeTab === 'assets' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  + {id.cms.actions.uploadAsset}
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: BENDA LANGIT */}
        {activeTab === 'bodies' && (
          <section className="classes-section">
            <div className="class-table-responsive">
              <table className="class-progress-table">
                <thead>
                  <tr>
                    <th scope="col">Nama & Slug</th>
                    <th scope="col">Tipe</th>
                    <th scope="col">Diameter</th>
                    <th scope="col">Status</th>
                    <th scope="col">Sumber Ilmiah</th>
                    <th scope="col" style={{ textAlign: 'right' }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBodies.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: 'center', padding: '2rem' }}
                      >
                        Tidak ada benda langit yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredBodies.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.name}</strong>
                          <div
                            className="font-mono text-secondary"
                            style={{ fontSize: '11px' }}
                          >
                            /{b.slug}
                          </div>
                        </td>
                        <td>
                          <span className="progress-tag">{b.type}</span>
                        </td>
                        <td className="tabular-nums">
                          {b.diameterKm
                            ? `${b.diameterKm.toLocaleString('id-ID')} km`
                            : '-'}
                        </td>
                        <td>
                          <span
                            className={`tour-badge ${
                              b.isPublished
                                ? 'tour-badge--published'
                                : 'tour-badge--draft'
                            }`}
                          >
                            {b.isPublished
                              ? id.cms.status.published
                              : id.cms.status.draft}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          <span className="tabular-nums font-semibold">
                            {b.sources.length} sumber
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="cms-table-action-group">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                setStudentPreview({ type: 'body', item: b })
                              }
                              title={id.cms.actions.previewStudent}
                            >
                              👁️ Pratinjau
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setEditingBody(b);
                                setIsBodyModalOpen(true);
                              }}
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => togglePublishBody(b.id)}
                            >
                              {b.isPublished
                                ? id.cms.actions.unpublish
                                : id.cms.actions.publishNow}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm text-danger"
                              onClick={() => handleDeleteBody(b)}
                              aria-label={`Hapus ${b.name}`}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 2: TITIK MINAT (POI) */}
        {activeTab === 'pois' && (
          <section className="classes-section">
            <div className="class-table-responsive">
              <table className="class-progress-table">
                <thead>
                  <tr>
                    <th scope="col">Nama POI</th>
                    <th scope="col">Objek Induk</th>
                    <th scope="col">Tipe</th>
                    <th scope="col">Koordinat (Lat / Lon)</th>
                    <th scope="col">Status</th>
                    <th scope="col" style={{ textAlign: 'right' }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPois.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: 'center', padding: '2rem' }}
                      >
                        Tidak ada titik minat yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredPois.map((p) => {
                      const parent = bodies.find((b) => b.id === p.bodyId);
                      return (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            <div
                              className="font-mono text-secondary"
                              style={{ fontSize: '11px' }}
                            >
                              /{p.slug}
                            </div>
                          </td>
                          <td>
                            <strong>{parent?.name || p.bodyId}</strong>
                          </td>
                          <td>
                            <span className="progress-tag">{p.type}</span>
                          </td>
                          <td
                            className="tabular-nums"
                            style={{ fontSize: '13px' }}
                          >
                            {p.lat.toFixed(2)}°, {p.lon.toFixed(2)}°
                          </td>
                          <td>
                            <span
                              className={`tour-badge ${
                                p.isPublished
                                  ? 'tour-badge--published'
                                  : 'tour-badge--draft'
                              }`}
                            >
                              {p.isPublished
                                ? id.cms.status.published
                                : id.cms.status.draft}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="cms-table-action-group">
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() =>
                                  setStudentPreview({
                                    type: 'poi',
                                    item: p,
                                  })
                                }
                                title={id.cms.actions.previewStudent}
                              >
                                👁️ Pratinjau
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setEditingPoi(p);
                                  setIsPoiModalOpen(true);
                                }}
                              >
                                Ubah
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => togglePublishPoi(p.id)}
                              >
                                {p.isPublished
                                  ? id.cms.actions.unpublish
                                  : id.cms.actions.publishNow}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm text-danger"
                                onClick={() => handleDeletePoi(p)}
                                aria-label={`Hapus ${p.name}`}
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: ASET 3D & MEDIA */}
        {activeTab === 'assets' && (
          <section className="classes-section">
            <div className="class-table-responsive">
              <table className="class-progress-table">
                <thead>
                  <tr>
                    <th scope="col">Target Asosiasi</th>
                    <th scope="col">Tipe Aset</th>
                    <th scope="col">Kualitas</th>
                    <th scope="col">Versi</th>
                    <th scope="col">Lisensi & Atribusi</th>
                    <th scope="col" style={{ textAlign: 'right' }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: 'center', padding: '2rem' }}
                      >
                        Tidak ada aset 3D yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>
                            {a.bodyId
                              ? `Planet: ${a.bodyId}`
                              : `POI: ${a.poiId}`}
                          </strong>
                        </td>
                        <td>
                          <span className="progress-tag">{a.assetType}</span>
                        </td>
                        <td>
                          <span className="font-semibold">{a.qualityTier}</span>
                        </td>
                        <td>
                          <span className="cms-version-pill">v{a.version}</span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          <div>{a.license}</div>
                          <div className="text-secondary">{a.attribution}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="cms-table-action-group">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setPreviewingAsset(a)}
                            >
                              👁️ Pratinjau 3D
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm text-danger"
                              onClick={() => handleDeleteAsset(a)}
                              aria-label={`Hapus aset ${a.assetType}`}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 4: RIWAYAT PERUBAHAN */}
        {activeTab === 'history' && <AuditHistoryTable />}

        {/* MODAL FORMULIR BENDA LANGIT */}
        {isBodyModalOpen && (
          <CelestialBodyFormModal
            initialBody={editingBody}
            isOpen={isBodyModalOpen}
            onClose={() => {
              setIsBodyModalOpen(false);
              setEditingBody(null);
            }}
          />
        )}

        {/* MODAL FORMULIR TITIK MINAT (POI) */}
        {isPoiModalOpen && (
          <PoiFormModal
            initialPoi={editingPoi}
            isOpen={isPoiModalOpen}
            onClose={() => {
              setIsPoiModalOpen(false);
              setEditingPoi(null);
            }}
          />
        )}

        {/* MODAL UNGGAH ASET */}
        {isUploadModalOpen && (
          <AssetUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
          />
        )}

        {/* MODAL PRATINJAU ASET 3D */}
        {previewingAsset && (
          <AssetPreviewViewer
            asset={previewingAsset}
            onClose={() => setPreviewingAsset(null)}
          />
        )}

        {/* MODAL PRATINJAU SISWA */}
        {studentPreview && (
          <StudentPreviewModal
            type={studentPreview.type}
            item={studentPreview.item}
            parentBody={
              studentPreview.type === 'poi'
                ? bodies.find(
                    (b) => b.id === (studentPreview.item as CmsPoi).bodyId,
                  )
                : undefined
            }
            onClose={() => setStudentPreview(null)}
          />
        )}
      </div>
    </div>
  );
}
