import { useState } from 'react';
import { id } from '../../lib/i18n/id';
import { useCmsStore } from './cmsStore';
import type { AuditAction } from './types';

export function AuditHistoryTable() {
  const changeLogs = useCmsStore((state) => state.changeLogs);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const filteredLogs = changeLogs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    return true;
  });

  const getActionBadgeClass = (action: AuditAction) => {
    switch (action) {
      case 'CREATE':
        return 'tour-badge--published';
      case 'PUBLISH':
        return 'tour-badge--published';
      case 'UPDATE':
        return 'tour-badge--preview';
      case 'UPLOAD_ASSET':
        return 'tour-badge--preview';
      case 'UNPUBLISH':
        return 'tour-badge--draft';
      case 'DELETE':
        return 'tour-badge--draft';
      default:
        return '';
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <section className="classes-section">
      <div className="cms-tab-header-row">
        <div>
          <h2 className="classes-section-title">{id.cms.history.title}</h2>
          <p className="classes-subtitle" style={{ fontSize: '13px' }}>
            {id.cms.history.subtitle}
          </p>
        </div>

        {/* Filter Aksi */}
        <div className="cms-filter-group">
          <label
            htmlFor="filter-history-action"
            className="text-secondary"
            style={{ fontSize: '12px' }}
          >
            Filter Aksi:
          </label>
          <select
            id="filter-history-action"
            className="auth-input"
            style={{
              width: 'auto',
              padding: '0.4rem 0.8rem',
              fontSize: '13px',
            }}
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="ALL">Semua Aksi ({changeLogs.length})</option>
            <option value="CREATE">CREATE (Tambah)</option>
            <option value="UPDATE">UPDATE (Ubah)</option>
            <option value="PUBLISH">PUBLISH (Terbit)</option>
            <option value="UNPUBLISH">UNPUBLISH (Draf)</option>
            <option value="UPLOAD_ASSET">UPLOAD_ASSET (Aset)</option>
            <option value="DELETE">DELETE (Hapus)</option>
          </select>
        </div>
      </div>

      <div className="class-table-responsive" style={{ marginTop: '1rem' }}>
        <table className="class-progress-table">
          <thead>
            <tr>
              <th scope="col">{id.cms.history.colTime}</th>
              <th scope="col">{id.cms.history.colUser}</th>
              <th scope="col">{id.cms.history.colAction}</th>
              <th scope="col">{id.cms.history.colEntity}</th>
              <th scope="col">{id.cms.history.colName}</th>
              <th scope="col">{id.cms.history.colDetails}</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {id.cms.history.noHistory}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td
                    className="text-secondary tabular-nums"
                    style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                  >
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td>
                    <strong>{log.adminName}</strong>
                  </td>
                  <td>
                    <span
                      className={`tour-badge ${getActionBadgeClass(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <span className="progress-tag">{log.entityType}</span>
                  </td>
                  <td>
                    <strong>{log.entityName}</strong>
                  </td>
                  <td className="text-secondary" style={{ fontSize: '13px' }}>
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
