import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bodies from '../data/bodies.json';
import pois from '../data/pois.json';
import type { CelestialBody, PointOfInterest } from '../data/types';
import { id } from '../lib/i18n/id';
import { GlassPanel } from './GlassPanel';

interface CelestialBodiesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CelestialBodiesDrawer({
  isOpen,
  onClose,
}: CelestialBodiesDrawerProps) {
  const [filter, setFilter] = useState<'all' | 'planet' | 'moon' | 'poi'>(
    'all',
  );
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const navigate = useNavigate();

  const allBodies = bodies as CelestialBody[];
  const allPois = pois as PointOfInterest[];

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => closeBtnRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredItems = useMemo(() => {
    const bodyItems = allBodies.map((b) => ({
      id: b.id,
      name: b.name,
      type:
        b.type === 'star'
          ? 'Bintang'
          : b.type === 'moon'
            ? 'Satelit Alami'
            : 'Planet',
      category: b.type === 'moon' ? 'moon' : 'planet',
      description: b.description,
      path: `/planet/${b.slug}`,
      diameter: b.diameterKm,
    }));

    const poiItems = allPois.map((p) => {
      const parentBody = allBodies.find((b) => b.id === p.bodyId);
      return {
        id: p.id,
        name: p.name,
        type: `Titik Minat (${p.type}) · ${parentBody?.name ?? p.bodyId}`,
        category: 'poi',
        description: p.historyText,
        path: `/planet/${parentBody?.slug ?? p.bodyId}/${p.slug}`,
        diameter: null,
      };
    });

    const all = [...bodyItems, ...poiItems];
    if (filter === 'all') return all;
    return all.filter((item) => item.category === filter);
  }, [allBodies, allPois, filter]);

  if (!isOpen) return null;

  return (
    <div
      className="drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GlassPanel
        ref={drawerRef}
        className="celestial-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="celestial-drawer__header">
          <div>
            <h2 id={titleId} className="celestial-drawer__title">
              {id.drawer.title}
            </h2>
            <p className="celestial-drawer__subtitle">{id.drawer.subtitle}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="icon-button celestial-drawer__close"
            onClick={onClose}
            aria-label={id.drawer.closeLabel}
          >
            ✕
          </button>
        </div>

        {/* Tab Filter */}
        <div
          className="tab-list glass-panel celestial-drawer__tabs"
          role="tablist"
          aria-label="Kategori direktori benda langit"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={`tab-button ${filter === 'all' ? 'tab-button--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {id.drawer.filterAll}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'planet'}
            className={`tab-button ${filter === 'planet' ? 'tab-button--active' : ''}`}
            onClick={() => setFilter('planet')}
          >
            {id.drawer.filterPlanets}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'moon'}
            className={`tab-button ${filter === 'moon' ? 'tab-button--active' : ''}`}
            onClick={() => setFilter('moon')}
          >
            {id.drawer.filterMoons}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'poi'}
            className={`tab-button ${filter === 'poi' ? 'tab-button--active' : ''}`}
            onClick={() => setFilter('poi')}
          >
            {id.drawer.filterPois}
          </button>
        </div>

        {/* Konten Direktori Non-Kanvas Ramah Pembaca Layar */}
        <div className="celestial-drawer__content" tabIndex={0}>
          <ul className="celestial-drawer__list" role="list">
            {filteredItems.map((item) => (
              <li key={item.id} className="celestial-drawer__item">
                <article className="celestial-card">
                  <div className="celestial-card__header">
                    <div>
                      <span className="celestial-card__badge">{item.type}</span>
                      <h3 className="celestial-card__name">{item.name}</h3>
                    </div>
                    <button
                      type="button"
                      className="celestial-card__btn"
                      onClick={() => {
                        onClose();
                        navigate(item.path);
                      }}
                      aria-label={id.drawer.flyTo(item.name)}
                    >
                      Terbang ➔
                    </button>
                  </div>
                  <p className="celestial-card__desc">{item.description}</p>
                  {item.diameter && (
                    <small className="celestial-card__stat">
                      Diameter: {item.diameter.toLocaleString('id-ID')} km
                    </small>
                  )}
                </article>
              </li>
            ))}
          </ul>
        </div>
      </GlassPanel>
    </div>
  );
}
