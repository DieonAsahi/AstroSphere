import type { Database } from '../database.types';
import type {
  CelestialBody,
  ParticleConfig,
  PoiDimension,
  PointOfInterest,
} from '../types';
import type { BodyRepository, PoiRepository } from './types';

type CelestialBodyRow = Database['public']['Tables']['celestial_bodies']['Row'];
type PoiRow = Database['public']['Tables']['points_of_interest']['Row'];
type AssetRow = Database['public']['Tables']['assets']['Row'];

function getSupabaseConfig(): { url: string; anonKey: string } {
  return {
    url:
      import.meta.env.SUPABASE_URL ||
      import.meta.env.VITE_SUPABASE_URL ||
      '',
    anonKey:
      import.meta.env.SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      '',
  };
}

/**
 * Utilitas pemanggil PostgREST Supabase via fetch standar.
 */
async function supabaseFetch<T>(endpoint: string): Promise<T> {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    throw new Error(
      '[SupabaseRepository] Konfigurasi SUPABASE_URL atau SUPABASE_ANON_KEY belum tersedia.',
    );
  }

  const response = await fetch(`${url}/rest/v1/${endpoint}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `[SupabaseRepository] Gagal memuat dari ${endpoint}: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * Memetakan baris basis data celestial_bodies dan aset teksturnya ke model CelestialBody.
 */
function mapBodyRowToModel(
  row: CelestialBodyRow,
  assets: AssetRow[] = [],
): CelestialBody {
  const bodyAssets = assets.filter(
    (a) => a.body_id === row.id && a.asset_type === 'tekstur',
  );
  const lowUrl =
    bodyAssets.find((a) => a.quality_tier === 'rendah')?.file_url ??
    `/assets/textures/low/${row.id}.jpg`;
  const midUrl =
    bodyAssets.find((a) => a.quality_tier === 'sedang')?.file_url ??
    `/assets/textures/mid/${row.id}.jpg`;
  const highUrl =
    bodyAssets.find((a) => a.quality_tier === 'tinggi')?.file_url ??
    `/assets/textures/high/${row.id}.jpg`;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type,
    parentId: row.parent_id ?? undefined,
    diameterKm: row.diameter_km,
    massKg: row.mass_kg,
    rotationPeriodH: row.rotation_period_h,
    axialTiltDeg: row.axial_tilt_deg,
    semiMajorAxisAu: row.semi_major_axis_au,
    eccentricity: row.eccentricity,
    inclinationDeg: row.inclination_deg,
    orbitPeriodDays: row.orbit_period_days,
    textureUrls: {
      low: lowUrl,
      mid: midUrl,
      high: highUrl,
    },
    description: row.description ?? '',
    sources: [],
  };
}

/**
 * Memetakan baris basis data points_of_interest dan aset terrain/partikel ke model PointOfInterest.
 */
function mapPoiRowToModel(
  row: PoiRow,
  assets: AssetRow[] = [],
): PointOfInterest {
  const terrainAsset = assets.find(
    (a) => a.poi_id === row.id && a.asset_type === 'terrain',
  )?.file_url;

  return {
    id: row.id,
    bodyId: row.body_id,
    slug: row.slug,
    name: row.name,
    type: row.type,
    lat: row.lat,
    lon: row.lon,
    historyText: row.history_text,
    dimensions: (Array.isArray(row.dimensions)
      ? row.dimensions
      : []) as unknown as PoiDimension[],
    particleConfig: (row.particle_config as ParticleConfig | null) ?? undefined,
    terrainAsset: terrainAsset ?? undefined,
    sources: (Array.isArray(row.sources) ? row.sources : []) as string[],
  };
}

export const supabaseBodyRepository: BodyRepository = {
  async listBodies(): Promise<CelestialBody[]> {
    const [bodies, assets] = await Promise.all([
      supabaseFetch<CelestialBodyRow[]>(
        'celestial_bodies?is_published=eq.true&order=sort_order.asc',
      ),
      supabaseFetch<AssetRow[]>('assets?asset_type=eq.tekstur'),
    ]);
    return bodies.map((body) => mapBodyRowToModel(body, assets));
  },

  async getBodyById(id: string): Promise<CelestialBody | undefined> {
    const [bodies, assets] = await Promise.all([
      supabaseFetch<CelestialBodyRow[]>(
        `celestial_bodies?id=eq.${encodeURIComponent(id)}&limit=1`,
      ),
      supabaseFetch<AssetRow[]>(
        `assets?body_id=eq.${encodeURIComponent(id)}&asset_type=eq.tekstur`,
      ),
    ]);
    const body = bodies[0];
    return body ? mapBodyRowToModel(body, assets) : undefined;
  },
};

export const supabasePoiRepository: PoiRepository = {
  async listPois(): Promise<PointOfInterest[]> {
    const [pois, assets] = await Promise.all([
      supabaseFetch<PoiRow[]>('points_of_interest?is_published=eq.true'),
      supabaseFetch<AssetRow[]>('assets?poi_id=not.is.null'),
    ]);
    return pois.map((poi) => mapPoiRowToModel(poi, assets));
  },

  async listPoisByBody(bodyId: string): Promise<PointOfInterest[]> {
    const [pois, assets] = await Promise.all([
      supabaseFetch<PoiRow[]>(
        `points_of_interest?body_id=eq.${encodeURIComponent(bodyId)}&is_published=eq.true`,
      ),
      supabaseFetch<AssetRow[]>('assets?poi_id=not.is.null'),
    ]);
    return pois.map((poi) => mapPoiRowToModel(poi, assets));
  },

  async getPoiById(id: string): Promise<PointOfInterest | undefined> {
    const [pois, assets] = await Promise.all([
      supabaseFetch<PoiRow[]>(
        `points_of_interest?id=eq.${encodeURIComponent(id)}&limit=1`,
      ),
      supabaseFetch<AssetRow[]>(`assets?poi_id=eq.${encodeURIComponent(id)}`),
    ]);
    const poi = pois[0];
    return poi ? mapPoiRowToModel(poi, assets) : undefined;
  },

  async getPoiBySlug(
    bodyId: string,
    slug: string,
  ): Promise<PointOfInterest | undefined> {
    const [pois, assets] = await Promise.all([
      supabaseFetch<PoiRow[]>(
        `points_of_interest?body_id=eq.${encodeURIComponent(bodyId)}&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      ),
      supabaseFetch<AssetRow[]>('assets?poi_id=not.is.null'),
    ]);
    const poi = pois[0];
    return poi ? mapPoiRowToModel(poi, assets) : undefined;
  },
};
