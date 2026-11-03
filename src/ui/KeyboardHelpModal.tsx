import { useEffect, useId, useRef } from 'react';
import { id } from '../lib/i18n/id';
import { GlassPanel } from './GlassPanel';
import { Kbd } from './Kbd';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardHelpModal({ isOpen, onClose }: KeyboardHelpModalProps) {
  const dialogId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

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

  if (!isOpen) return null;

  return (
    <div
      className="shortcuts-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GlassPanel
        className="shortcuts-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogId}
      >
        <div className="shortcuts-modal-header">
          <div className="shortcuts-modal-title-group">
            <span className="shortcuts-modal-icon" aria-hidden="true">
              ⌨
            </span>
            <h2 id={dialogId} className="shortcuts-modal-title">
              {id.shortcuts.title}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="icon-button shortcuts-close-btn"
            onClick={onClose}
            aria-label={id.shortcuts.closeLabel}
          >
            ✕
          </button>
        </div>

        <div className="shortcuts-modal-body">
          <ul className="shortcuts-list" role="list">
            {id.shortcuts.list.map((item, index) => (
              <li key={index} className="shortcuts-item">
                <span className="shortcuts-label">{item.label}</span>
                <div className="shortcuts-keys">
                  {item.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </GlassPanel>
    </div>
  );
}
