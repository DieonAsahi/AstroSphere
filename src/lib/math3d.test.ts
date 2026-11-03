import { describe, expect, it } from 'vitest';
import {
  calculateEllipticalOrbitPosition,
  educationalOrbitDistance,
  educationalPlanetRadius,
  solveKeplerEquation,
  latLonToPlanetSurface,
  latLonToUnitVector,
  unitVectorToLatLon,
} from './math3d';

describe('orbit calculations', () => {
  it('places Earth-like orbit on the expected semi-major axis', () => {
    const position = calculateEllipticalOrbitPosition({
      semiMajorAxisAu: 1,
      eccentricity: 0,
      inclinationDeg: 0,
      meanAnomalyRad: 0,
    });

    expect(position[0]).toBeCloseTo(1);
    expect(position[1]).toBeCloseTo(0);
    expect(position[2]).toBeCloseTo(0);
  });

  it('keeps an eccentric orbit finite and bounded by radius', () => {
    const position = calculateEllipticalOrbitPosition({
      semiMajorAxisAu: 5,
      eccentricity: 0.5,
      inclinationDeg: 10,
      meanAnomalyRad: 1.2,
    });

    expect(position.every(Number.isFinite)).toBe(true);
    expect(Math.hypot(position[0], position[1], position[2])).toBeLessThan(8);
  });

  it('solves the Kepler equation at a circular orbit', () => {
    expect(solveKeplerEquation(Math.PI / 2, 0)).toBeCloseTo(Math.PI / 2);
  });
});

describe('educational scale', () => {
  it('places more distant bodies farther away in monotonic order', () => {
    expect(educationalOrbitDistance(1)).toBeLessThan(
      educationalOrbitDistance(30),
    );
  });

  describe('planet surface coordinates', () => {
    it('places the equator at longitude zero on the positive X axis', () => {
      const point = latLonToPlanetSurface(0, 0, 2);
      expect(point.x).toBeCloseTo(2);
      expect(point.y).toBeCloseTo(0);
      expect(point.z).toBeCloseTo(0);
    });

    it('places poles on the positive and negative Y axis', () => {
      expect(latLonToPlanetSurface(90, 0, 2).y).toBeCloseTo(2);
      expect(latLonToPlanetSurface(-90, 360, 2).y).toBeCloseTo(-2);
    });

    it('inverts unit vector back to accurate lat and lon (Visual Coordinate Picker)', () => {
      // Olympus Mons: lat 18.65, lon 226.2
      const olympusVec = latLonToUnitVector(18.65, 226.2);
      const olympusCoords = unitVectorToLatLon(olympusVec);
      expect(olympusCoords.lat).toBeCloseTo(18.65, 1);
      expect(olympusCoords.lon).toBeCloseTo(226.2, 1);

      // Great Red Spot: lat -22, lon 270
      const grsVec = latLonToUnitVector(-22, 270);
      const grsCoords = unitVectorToLatLon(grsVec);
      expect(grsCoords.lat).toBeCloseTo(-22, 1);
      expect(grsCoords.lon).toBeCloseTo(270, 1);

      // Kutub Utara: lat 90, lon 0
      const northPole = unitVectorToLatLon({ x: 0, y: 1, z: 0 });
      expect(northPole.lat).toBe(90);

      // Kutub Selatan: lat -90, lon 0
      const southPole = unitVectorToLatLon({ x: 0, y: -1, z: 0 });
      expect(southPole.lat).toBe(-90);
    });
  });

  it('preserves planet-size ordering', () => {
    expect(educationalPlanetRadius(6779)).toBeLessThan(
      educationalPlanetRadius(139820),
    );
  });

  it('limits planet radius to its scene bounds', () => {
    expect(educationalPlanetRadius(1392700)).toBeLessThanOrEqual(1.45);
  });
});
