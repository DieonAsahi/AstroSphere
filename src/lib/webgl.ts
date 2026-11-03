/**
 * Memeriksa ketersediaan WebGL2 pada peramban dan perangkat keras pengguna.
 */
export function isWebGL2Available(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGL2RenderingContext && canvas.getContext('webgl2'),
    );
  } catch {
    return false;
  }
}
