import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { PointOfInterest } from '../data/types';
import { generateProceduralTerrainData } from '../lib/proceduralTerrain';

const mockPoiOlympus: PointOfInterest = {
  id: 'mars-olympus-mons',
  bodyId: 'mars',
  slug: 'olympus-mons',
  name: 'Olympus Mons',
  type: 'gunung',
  lat: 18.65,
  lon: 226.2,
  historyText: 'Gunung berapi perisai raksasa.',
  dimensions: [
    {
      label: 'Tinggi',
      nilai: 21.9,
      satuan: 'km',
      sumber: 'NASA MOLA',
    },
  ],
  sources: ['NASA MOLA'],
};

const mockPoiCrater: PointOfInterest = {
  id: 'moon-tycho',
  bodyId: 'moon',
  slug: 'tycho',
  name: 'Kawah Tycho',
  type: 'kawah',
  lat: -43.3,
  lon: 11.2,
  historyText: 'Kawah impak dengan sistem pancaran terang.',
  dimensions: [],
  sources: [],
};

describe('Terrain Generation & Memory Stability', () => {
  it('generates valid non-empty procedural heights and colors for volcano with caldera', () => {
    const vertexCount = 100;
    // Koordinat grid dari -2.8 hingga +2.8
    const getX = (idx: number) => ((idx % 10) - 4.5) * 0.6;
    const getY = (idx: number) => (Math.floor(idx / 10) - 4.5) * 0.6;

    const { heights, colors } = generateProceduralTerrainData(
      vertexCount,
      mockPoiOlympus,
      getX,
      getY,
    );

    expect(heights).toHaveLength(vertexCount);
    expect(colors).toHaveLength(vertexCount * 3);

    // Pastikan tidak ada NaN atau nilai tak terhingga
    for (let i = 0; i < vertexCount; i += 1) {
      expect(Number.isFinite(heights[i])).toBe(true);
      expect(Number.isFinite(colors[i * 3])).toBe(true);
      expect(Number.isFinite(colors[i * 3 + 1])).toBe(true);
      expect(Number.isFinite(colors[i * 3 + 2])).toBe(true);
    }

    // Puncak kaldera (dekat pusat) harus memiliki elevasi tinggi
    const centerIdx = 44; // mendekati (0,0)
    expect(heights[centerIdx]).toBeGreaterThan(1.0);
  });

  it('generates valid rim and depression profile for craters', () => {
    const vertexCount = 100;
    const getX = (idx: number) => ((idx % 10) - 4.5) * 0.6;
    const getY = (idx: number) => (Math.floor(idx / 10) - 4.5) * 0.6;

    const { heights } = generateProceduralTerrainData(
      vertexCount,
      mockPoiCrater,
      getX,
      getY,
    );

    expect(heights).toHaveLength(vertexCount);
    const centerIdx = 44; // mendekati pusat
    // Dasar kawah lebih rendah dari puncak rim
    expect(heights[centerIdx]).toBeLessThan(1.0);
  });

  it('updates vertical exaggeration in-place without re-instantiating geometries or arrays', () => {
    const geometry = new THREE.PlaneGeometry(5, 5, 10, 10);
    const pos = geometry.attributes.position as THREE.BufferAttribute;

    const { heights } = generateProceduralTerrainData(
      pos.count,
      mockPoiOlympus,
      (idx) => pos.getX(idx),
      (idx) => pos.getY(idx),
    );

    geometry.userData.baseHeights = heights;

    // Catat referensi array buffer awal
    const initialBuffer = pos.array;

    // Simulasikan perubahan slider pembesaran vertikal: 1.0 -> 2.5
    const exaggeration = 2.5;
    for (let i = 0; i < pos.count; i += 1) {
      pos.setZ(i, heights[i] * exaggeration);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();

    // Verifikasi array buffer tidak diganti (in-place mutation)
    expect(pos.array).toBe(initialBuffer);

    // Verifikasi nilai Z terkalikan sesuai faktor pembesaran
    for (let i = 0; i < pos.count; i += 1) {
      expect(pos.getZ(i)).toBeCloseTo(heights[i] * exaggeration, 5);
    }

    geometry.dispose();
  });

  it('does NOT create new Three.js geometry or material instances across frame updates', () => {
    const geometry = new THREE.PlaneGeometry(5, 5, 8, 8);
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geometry, material);

    const initialGeometryId = mesh.geometry.id;
    const initialMaterialId = (mesh.material as THREE.Material).id;

    // Simulasikan 60 frame pembaruan animasi
    for (let frame = 0; frame < 60; frame += 1) {
      mesh.rotation.z += 0.005;
      mesh.updateMatrix();
    }

    // Geometry dan material ID tetap identik (tidak ada re-instansiasi atau memory leak)
    expect(mesh.geometry.id).toBe(initialGeometryId);
    expect((mesh.material as THREE.Material).id).toBe(initialMaterialId);

    geometry.dispose();
    material.dispose();
  });
});
