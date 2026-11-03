export function RouteLoadingFallback() {
  return (
    <div
      className="route-loading-fallback"
      role="status"
      aria-live="polite"
      aria-label="Memuat modul antarmuka"
    >
      <div className="route-loading-spinner" aria-hidden="true" />
      <span className="route-loading-text">Memuat modul observatorium...</span>
    </div>
  );
}
