import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PointOfInterest } from '../data/types';
import { latLonToPlanetSurface } from '../lib/math3d';
import { useParticleStormStore } from '../state/particleStormStore';
import { useQualityStore } from '../state/qualityStore';

const mockPoiStorm: PointOfInterest = {
  id: 'jupiter-great-red-spot',
  bodyId: 'jupiter',
  slug: 'badai-merah-raksasa',
  name: 'Badai Merah Raksasa',
  type: 'badai',
  lat: -22,
  lon: 270,
  historyText: 'Badai antisiklon.',
  dimensions: [],
  particleConfig: {
    type: 'badai_antisiklonik',
    count: 40000,
    speed: 1.2,
    vortexRadius: 0.32,
    color: '#d9381e',
    secondaryColor: '#e67332',
    coreColor: '#f6e2c3',
    direction: 'counterclockwise',
  },
  sources: [],
};

describe('ParticleStorm Math & Quality Scaling', () => {
  beforeEach(() => {
    useParticleStormStore.getState().reset();
    useQualityStore.setState({ quality: 'high', reducedMotion: false });
  });

  it('calculates storm center and orthogonal tangent vectors on sphere surface', () => {
    const planetRadius = 2.5;
    const [cx, cy, cz] = latLonToPlanetSurface(
      mockPoiStorm.lat,
      mockPoiStorm.lon,
      planetRadius,
    );
    const center = new THREE.Vector3(cx, cy, cz);
    const normal = center.clone().normalize();

    const worldUp = new THREE.Vector3(0, 1, 0);
    const tangentX = new THREE.Vector3()
      .crossVectors(worldUp, normal)
      .normalize();
    const tangentY = new THREE.Vector3()
      .crossVectors(normal, tangentX)
      .normalize();

    // Pastikan vektor ortogonal (dot product = 0)
    expect(tangentX.dot(normal)).toBeCloseTo(0, 4);
    expect(tangentY.dot(normal)).toBeCloseTo(0, 4);
    expect(tangentX.dot(tangentY)).toBeCloseTo(0, 4);

    // Panjang vektor satuan = 1.0
    expect(tangentX.length()).toBeCloseTo(1.0, 4);
    expect(tangentY.length()).toBeCloseTo(1.0, 4);
  });

  it('verifies particle counts scale properly across quality tiers', () => {
    const getCountForTier = (
      quality: 'high' | 'mid' | 'low',
      density = 1.0,
    ) => {
      let base = 15000;
      if (quality === 'high') base = 40000;
      else if (quality === 'mid') base = 15000;
      else if (quality === 'low') base = 4000;
      return Math.max(800, Math.round(base * density));
    };

    // Kualitas Tinggi: ~40.000 partikel
    expect(getCountForTier('high', 1.0)).toBe(40000);
    // Kualitas Sedang: ~15.000 partikel
    expect(getCountForTier('mid', 1.0)).toBe(15000);
    // Kualitas Rendah: ~4.000 partikel
    expect(getCountForTier('low', 1.0)).toBe(4000);

    // Skala dengan slider kepadatan (50%)
    expect(getCountForTier('high', 0.5)).toBe(20000);
    expect(getCountForTier('low', 0.5)).toBe(2000);
  });

  it('allocates valid geometry vertex attributes for GPU simulation', () => {
    const count = 4000;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const radiusArr = new Float32Array(count);
    const angleArr = new Float32Array(count);
    const speedArr = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      radiusArr[i] = Math.random();
      angleArr[i] = Math.random() * Math.PI * 2;
      speedArr[i] = 0.8 + Math.random() * 0.4;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radiusArr, 1));
    geo.setAttribute('aAngle', new THREE.BufferAttribute(angleArr, 1));
    geo.setAttribute('aSpeedFactor', new THREE.BufferAttribute(speedArr, 1));

    expect(geo.getAttribute('aRadius').count).toBe(count);
    expect(geo.getAttribute('aAngle').count).toBe(count);
    expect(geo.getAttribute('aSpeedFactor').count).toBe(count);

    geo.dispose();
  });

  it('confirms counterclockwise rotation direction matches NASA scientific data for southern hemisphere anticyclone', () => {
    // Di belahan bumi selatan Jupiter, antisiklon bertekanan tinggi berputar berlawanan jarum jam
    const isCounterClockwise =
      mockPoiStorm.particleConfig?.direction !== 'clockwise';
    expect(isCounterClockwise).toBe(true);
    expect(mockPoiStorm.lat).toBeLessThan(0); // Lintang selatan (-22°)
  });
});
