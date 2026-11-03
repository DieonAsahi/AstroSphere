import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  supabaseBodyRepository,
  supabasePoiRepository,
} from './supabaseRepository';

describe('SupabaseRepository Mapping & Fetch Logic', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-anon-key');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('maps celestial bodies and textures from PostgREST responses', async () => {
    const mockBodies = [
      {
        id: 'mars',
        slug: 'mars',
        name: 'Mars',
        type: 'planet',
        parent_id: 'sun',
        diameter_km: 6779,
        mass_kg: 6.4171e23,
        rotation_period_h: 24.6,
        axial_tilt_deg: 25.2,
        semi_major_axis_au: 1.524,
        eccentricity: 0.0934,
        inclination_deg: 1.85,
        orbit_period_days: 686.98,
        description: 'Planet Mars',
        sort_order: 6,
        is_published: true,
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
      },
    ];

    const mockAssets = [
      {
        id: 'asset-1',
        body_id: 'mars',
        poi_id: null,
        asset_type: 'tekstur',
        quality_tier: 'tinggi',
        file_url: '/assets/textures/high/mars.jpg',
        file_size_bytes: null,
        mime_type: null,
        license: null,
        attribution: null,
        version: 1,
        created_at: '2026-11-01T00:00:00Z',
      },
    ];

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('celestial_bodies')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBodies),
        });
      }
      if (url.includes('assets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAssets),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    const bodies = await supabaseBodyRepository.listBodies();
    expect(bodies).toHaveLength(1);
    expect(bodies[0].id).toBe('mars');
    expect(bodies[0].diameterKm).toBe(6779);
    expect(bodies[0].textureUrls.high).toBe('/assets/textures/high/mars.jpg');
    expect(bodies[0].parentId).toBe('sun');
  });

  it('maps points of interest and terrain assets from PostgREST responses', async () => {
    const mockPois = [
      {
        id: 'mars-olympus-mons',
        body_id: 'mars',
        slug: 'olympus-mons',
        name: 'Olympus Mons',
        type: 'gunung',
        lat: 18.65,
        lon: 226.2,
        history_text: 'Gunung berapi terbesar di Mars.',
        dimensions: [
          { label: 'Tinggi', nilai: 21.9, satuan: 'km', sumber: 'NASA' },
        ],
        particle_config: null,
        sources: ['NASA MOLA'],
        is_published: true,
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
      },
    ];

    const mockAssets = [
      {
        id: 'asset-terrain-1',
        body_id: null,
        poi_id: 'mars-olympus-mons',
        asset_type: 'terrain',
        quality_tier: 'tinggi',
        file_url: '/assets/terrain/mars-olympus-mons.png',
        file_size_bytes: null,
        mime_type: null,
        license: null,
        attribution: null,
        version: 1,
        created_at: '2026-11-01T00:00:00Z',
      },
    ];

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('points_of_interest')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPois),
        });
      }
      if (url.includes('assets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAssets),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    const pois = await supabasePoiRepository.listPois();
    expect(pois).toHaveLength(1);
    expect(pois[0].id).toBe('mars-olympus-mons');
    expect(pois[0].bodyId).toBe('mars');
    expect(pois[0].terrainAsset).toBe('/assets/terrain/mars-olympus-mons.png');
    expect(pois[0].dimensions[0].nilai).toBe(21.9);
  });

  it('throws informative error if Supabase credentials are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    await expect(supabaseBodyRepository.listBodies()).rejects.toThrow(
      /VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum tersedia/,
    );
  });
});
