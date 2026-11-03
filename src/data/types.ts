export interface TextureUrls {
  low: string;
  mid: string;
  high: string;
}

export interface CelestialBody {
  id: string;
  slug: string;
  name: string;
  type: 'star' | 'planet' | 'dwarf_planet' | 'moon';
  parentId?: string;
  diameterKm: number | null;
  massKg: number | null;
  rotationPeriodH: number | null;
  axialTiltDeg: number | null;
  semiMajorAxisAu: number | null;
  eccentricity: number | null;
  inclinationDeg: number | null;
  orbitPeriodDays: number | null;
  textureUrls: TextureUrls;
  description: string;
  sources: string[];
}

export interface PoiDimension {
  label: string;
  nilai: number | null;
  satuan: string;
  sumber: string;
}

export interface ParticleConfig {
  type: string;
  count: number;
  speed?: number;
  vortexRadius?: number;
  color: string;
  secondaryColor?: string;
  coreColor?: string;
  direction?: 'counterclockwise' | 'clockwise';
}

export interface PointOfInterest {
  id: string;
  bodyId: string;
  slug: string;
  name: string;
  type: 'gunung' | 'badai' | 'kawah' | 'lembah' | 'lainnya';
  lat: number;
  lon: number;
  historyText: string;
  dimensions: PoiDimension[];
  particleConfig?: ParticleConfig;
  terrainAsset?: string;
  sources: string[];
}
