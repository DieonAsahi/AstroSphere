import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bodies from '../data/bodies.json';
import pois from '../data/pois.json';
import type { CelestialBody, PointOfInterest } from '../data/types';
import { id } from '../lib/i18n/id';
import { GlassPanel } from './GlassPanel';
import { Kbd } from './Kbd';

interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  name: string;
  type: string;
  category: 'planet' | 'moon' | 'poi';
  description: string;
  planetSlug: string;
  poiSlug?: string;
}

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function SearchPalette({ isOpen, onClose }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dialogId = useId();
  const navigate = useNavigate();

  // Gabungkan seluruh data pencarian: Planet, Bulan, dan POI
  const searchIndex: SearchItem[] = useMemo(() => {
    const allBodies = bodies as CelestialBody[];
    const allPois = pois as PointOfInterest[];

    const bodyItems: SearchItem[] = allBodies.map((b) => ({
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
      planetSlug: b.slug,
    }));

    const poiItems: SearchItem[] = allPois.map((p) => {
      const parentBody = allBodies.find((b) => b.id === p.bodyId);
      return {
        id: p.id,
        name: p.name,
        type: `Titik Minat (${p.type})`,
        category: 'poi',
        description: p.historyText.slice(0, 90) + '...',
        planetSlug: parentBody?.slug ?? p.bodyId,
        poiSlug: p.slug,
      };
    });

    return [...bodyItems, ...poiItems];
  }, []);

  // Filter hasil pencarian berdasarkan kata kunci
  const filteredResults = useMemo(() => {
    const q = normalize(query);
    if (!q) return searchIndex;
    return searchIndex.filter(
      (item) =>
        normalize(item.name).includes(q) ||
        normalize(item.type).includes(q) ||
        normalize(item.description).includes(q),
    );
  }, [query, searchIndex]);

  // Fokus input saat dialog terbuka
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Tangani navigasi keyboard: Panah Atas/Bawah, Enter, Escape
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) =>
        filteredResults.length === 0 ? 0 : (prev + 1) % filteredResults.length,
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) =>
        filteredResults.length === 0
          ? 0
          : (prev - 1 + filteredResults.length) % filteredResults.length,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selectedItem = filteredResults[selectedIndex];
      if (selectedItem) {
        selectItem(selectedItem);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const selectItem = (item: SearchItem) => {
    onClose();
    if (item.poiSlug) {
      navigate(`/planet/${item.planetSlug}/${item.poiSlug}`);
    } else {
      navigate(`/planet/${item.planetSlug}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="search-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GlassPanel
        className="search-palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
      >
        <div className="search-palette-header">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            ref={inputRef}
            type="search"
            className="search-palette-input"
            placeholder={id.search.placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            aria-label={id.search.dialogTitle}
            aria-controls={`${dialogId}-list`}
            aria-autocomplete="list"
          />
          <button
            type="button"
            className="icon-button search-close-btn"
            onClick={onClose}
            aria-label={id.search.closeSearch}
          >
            ✕
          </button>
        </div>

        <p id={`${dialogId}-title`} className="sr-only">
          {id.search.dialogTitle}
        </p>

        <div className="search-palette-results-wrapper">
          {filteredResults.length === 0 ? (
            <div className="search-no-results" role="status">
              <p>{id.search.noResults(query)}</p>
            </div>
          ) : (
            <ul
              ref={listRef}
              id={`${dialogId}-list`}
              className="search-palette-list"
              role="listbox"
              aria-label="Daftar hasil pencarian"
            >
              {filteredResults.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <li
                    key={`${item.category}-${item.id}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`search-palette-item ${
                      isSelected ? 'search-palette-item--selected' : ''
                    }`}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="search-item-header">
                      <strong className="search-item-name">{item.name}</strong>
                      <span className="search-item-badge">{item.type}</span>
                    </div>
                    <p className="search-item-desc">{item.description}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="search-palette-footer">
          <span className="search-footer-hint">{id.search.instruction}</span>
          <div className="search-footer-keys">
            <Kbd>↑↓</Kbd> Navigasi <Kbd>Enter</Kbd> Terbang <Kbd>Esc</Kbd> Tutup
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
