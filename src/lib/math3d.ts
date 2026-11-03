import * as THREE from 'three';

export function latLonToUnitVector(latitudeDeg: number, longitudeDeg: number) {
  const latitude = THREE.MathUtils.degToRad(latitudeDeg);
  const longitude = THREE.MathUtils.degToRad(longitudeDeg);
  const cosLatitude = Math.cos(latitude);

  return new THREE.Vector3(
    cosLatitude * Math.cos(longitude),
    Math.sin(latitude),
    cosLatitude * Math.sin(longitude),
  ).normalize();
}

export function latLonToPlanetSurface(
  latitudeDeg: number,
  longitudeDeg: number,
  radius: number,
): THREE.Vector3 {
  const normalizedLongitude = ((longitudeDeg % 360) + 360) % 360;
  return latLonToUnitVector(latitudeDeg, normalizedLongitude).multiplyScalar(
    radius,
  );
}

/**
 * Konversi vektor titik pada bola permukaan planet menjadi koordinat Garis Lintang (lat) dan Garis Bujur (lon).
 * Kebalikan dari latLonToUnitVector, digunakan untuk penentu koordinat visual 3D di CMS.
 */
export function unitVectorToLatLon(
  vector: THREE.Vector3 | { x: number; y: number; z: number },
): { lat: number; lon: number } {
  const len = Math.hypot(vector.x, vector.y, vector.z) || 1;
  const nx = vector.x / len;
  const ny = Math.max(-1, Math.min(1, vector.y / len));
  const nz = vector.z / len;

  const latRad = Math.asin(ny);
  const latDeg = THREE.MathUtils.radToDeg(latRad);

  const lonRad = Math.atan2(nz, nx);
  let lonDeg = THREE.MathUtils.radToDeg(lonRad);
  lonDeg = ((lonDeg % 360) + 360) % 360;

  return {
    lat: Math.round(latDeg * 100) / 100,
    lon: Math.round(lonDeg * 100) / 100,
  };
}

export function orbitPosition(
  distance: number,
  angleRad: number,
  inclinationDeg = 0,
) {
  const inclination = THREE.MathUtils.degToRad(inclinationDeg);
  const position = new THREE.Vector3(
    Math.cos(angleRad) * distance,
    0,
    Math.sin(angleRad) * distance,
  );

  // Rotasi kemiringan orbit pada sumbu X menjaga perhitungan tetap sederhana.
  position.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclination);
  return position;
}

export interface OrbitPositionOptions {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  meanAnomalyRad: number;
}

export function calculateEllipticalOrbitPosition({
  semiMajorAxisAu,
  eccentricity,
  inclinationDeg,
  meanAnomalyRad,
}: OrbitPositionOptions): [number, number, number] {
  const eccentricAnomaly = solveKeplerEquation(meanAnomalyRad, eccentricity);
  const x = semiMajorAxisAu * (Math.cos(eccentricAnomaly) - eccentricity);
  const z =
    semiMajorAxisAu *
    Math.sqrt(Math.max(0, 1 - eccentricity * eccentricity)) *
    Math.sin(eccentricAnomaly);
  const inclination = THREE.MathUtils.degToRad(inclinationDeg);
  return [x, -z * Math.sin(inclination), z * Math.cos(inclination)];
}

export function solveKeplerEquation(
  meanAnomaly: number,
  eccentricity: number,
): number {
  let eccentricAnomaly = meanAnomaly;
  for (let index = 0; index < 8; index += 1) {
    const residual =
      eccentricAnomaly -
      eccentricity * Math.sin(eccentricAnomaly) -
      meanAnomaly;
    const derivative = 1 - eccentricity * Math.cos(eccentricAnomaly);
    eccentricAnomaly -= residual / derivative;
  }
  return eccentricAnomaly;
}

export function educationalOrbitDistance(semiMajorAxisAu: number): number {
  return 4 + Math.log1p(semiMajorAxisAu * 2.2) * 4.2;
}

export function educationalPlanetRadius(diameterKm: number): number {
  const normalized = Math.cbrt(diameterKm / 12742);
  return Math.max(0.22, Math.min(1.45, normalized * 0.78));
}
