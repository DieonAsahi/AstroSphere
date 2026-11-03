export function TimeControl() {
  return (
    <label className="text-xs text-slate-200">
      Waktu simulasi
      <input className="ml-2 align-middle" type="range" min="0" max="10" />
    </label>
  );
}
