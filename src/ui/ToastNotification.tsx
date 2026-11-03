import { id } from '../lib/i18n/id';
import { useQualityStore } from '../state/qualityStore';

export function ToastNotification() {
  const toastMessage = useQualityStore((state) => state.autoDeclineToast);
  const undo = useQualityStore((state) => state.undoQualityDecline);
  const dismiss = useQualityStore((state) => state.dismissToast);

  if (!toastMessage) return null;

  return (
    <div
      className="toast-notification-container"
      role="status"
      aria-live="polite"
    >
      <div className="toast-notification glass-panel">
        <span className="toast-icon" aria-hidden="true">
          ⚡
        </span>
        <p className="toast-message">{toastMessage}</p>
        <div className="toast-actions">
          <button
            type="button"
            className="toast-undo-btn"
            onClick={undo}
            aria-label={id.performance.undo}
          >
            {id.performance.undo}
          </button>
          <button
            type="button"
            className="icon-button toast-dismiss-btn"
            onClick={dismiss}
            aria-label="Tutup notifikasi performa"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
