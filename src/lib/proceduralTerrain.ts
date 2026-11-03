import * as THREE from 'three';
import type { PointOfInterest } from '../data/types';

/**
 * Menghasilkan elevasi ketinggian prosedural berdasarkan tipe geologi dan parameter POI.
 * Didesain tanpa alokasi objek dinamis baru per frame.
 *
 * @param count Jumlah verteks pada PlaneGeometry
 * @param poi Titik minat
 * @param getX Fungsi pengambil koordinat X verteks
 * @param getY Fungsi pengambil koordinat Y verteks
 */
export function generateProceduralTerrainData(
  count: number,
  poi: PointOfInterest,
  getX: (index: number) => number,
  getY: (index: number) => number,
): { heights: Float32Array; colors: Float32Array } {
  const heights = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  const isVolcano = poi.type === 'gunung';
  const isCrater = poi.type === 'kawah';

  for (let i = 0; i < count; i += 1) {
    const x = getX(i);
    const y = getY(i);
    const dist = Math.sqrt(x * x + y * y);

    let z = 0;
    if (isVolcano) {
      // Profil kubah perisai (shield volcano) dengan kaldera di puncak
      const normalizedDist = dist / 2.6;
      const dome = Math.max(0, 1 - Math.pow(normalizedDist, 1.8));
      const calderaDepression =
        normalizedDist < 0.2 ? (0.2 - normalizedDist) * 0.45 : 0;
      // Sedikit riak lava pada lereng
      const lavaNoise =
        Math.sin(x * 5.2 + y * 3.1) * Math.cos(y * 4.7) * 0.05 * dome;
      z = Math.max(0, dome - calderaDepression + lavaNoise) * 1.85;
    } else if (isCrater) {
      // Profil kawah impak: tepian meninggi (rim) dan dasar cekung
      const r = dist / 2.2;
      const rim = Math.exp(-Math.pow((r - 0.7) * 4, 2)) * 0.8;
      const bowl = r < 0.7 ? -Math.cos(r * (Math.PI / 1.4)) * 0.6 : 0;
      z = rim + bowl;
    } else {
      // Lembah atau perbukitan halus
      z =
        Math.sin(x * 2.1) * Math.cos(y * 2.4) * 0.4 +
        Math.cos(x * 4.3 + y * 3.7) * 0.15;
    }

    heights[i] = z;

    // Pewarnaan berdasarkan ketinggian (Hypsometric Tinting)
    const normalizedHeight = Math.min(1, Math.max(0, z / 1.85));
    if (normalizedHeight < 0.35) {
      // Dataran rendah
      color.setRGB(
        0.12 + normalizedHeight * 0.3,
        0.22 + normalizedHeight * 0.4,
        0.55,
      );
    } else if (normalizedHeight < 0.75) {
      // Lereng menengah terakota Mars
      const t = (normalizedHeight - 0.35) / 0.4;
      color.setRGB(0.68 + t * 0.22, 0.35 + t * 0.25, 0.18);
    } else {
      // Puncak gunung / kaldera
      const t = (normalizedHeight - 0.75) / 0.25;
      color.setRGB(0.92 + t * 0.08, 0.78 + t * 0.2, 0.6 + t * 0.38);
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  return { heights, colors };
}
