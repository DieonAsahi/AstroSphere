import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../classes/authStore';
import { RoleGuard } from '../classes/RoleGuard';
import type { UserProfile } from '../classes/types';
import { AdminCmsPage } from './AdminCmsPage';
import { CelestialBodyFormModal } from './CelestialBodyFormModal';
import {
  checkAdminPermission,
  INITIAL_CMS_ASSETS,
  INITIAL_CMS_BODIES,
  INITIAL_CMS_LOGS,
  INITIAL_CMS_POIS,
  useCmsStore,
} from './cmsStore';
import { PoiFormModal } from './PoiFormModal';
import { StudentPreviewModal } from './StudentPreviewModal';
import {
  assetUploadSchema,
  celestialBodySchema,
  poiSchema,
  validateAssetFile,
} from './validation';
import { VisualCoordinatePicker } from './VisualCoordinatePicker';

const mockAdminUser: UserProfile = {
  id: 'user-admin-001',
  email: 'admin@astrosphere.id',
  name: 'Dr. Hendra Wijaya',
  role: 'admin',
};

const mockStudentUser: UserProfile = {
  id: 'user-siswa-001',
  email: 'budi@sekolah.id',
  name: 'Budi Prakoso',
  role: 'siswa',
};

describe('Content Management System (CMS) Feature (FR-11)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: mockAdminUser });
    useCmsStore.setState({
      bodies: JSON.parse(JSON.stringify(INITIAL_CMS_BODIES)),
      pois: JSON.parse(JSON.stringify(INITIAL_CMS_POIS)),
      assets: JSON.parse(JSON.stringify(INITIAL_CMS_ASSETS)),
      changeLogs: JSON.parse(JSON.stringify(INITIAL_CMS_LOGS)),
    });
  });

  describe('1. RLS & Role-Based Authorization Enforcement', () => {
    it('allows admin users to perform write, update, delete, and publish operations', () => {
      const store = useCmsStore.getState();

      // Admin menambah planet baru
      const newPlanet = store.createBody(
        {
          id: 'neptune-demo',
          slug: 'neptunus',
          name: 'Neptunus',
          type: 'planet',
          diameterKm: 49244,
          description: 'Planet raksasa es terluar di Tata Surya.',
          sources: ['https://science.nasa.gov/neptune/facts/'],
          isPublished: false,
        },
        mockAdminUser,
      );

      expect(newPlanet.id).toBe('neptune-demo');
      expect(newPlanet.isPublished).toBe(false);

      // Admin toggle publish
      const published = store.togglePublishBody('neptune-demo', mockAdminUser);
      expect(published.isPublished).toBe(true);

      // Admin audit log tercatat
      const latestLog = useCmsStore.getState().changeLogs[0];
      expect(latestLog.adminId).toBe(mockAdminUser.id);
      expect(latestLog.action).toBe('PUBLISH');
      expect(latestLog.entityName).toBe('Neptunus');
    });

    it('rejects write operations from non-admin users (students or guests) reflecting Supabase RLS policies', () => {
      const store = useCmsStore.getState();

      // Siswa mencoba membuat benda langit
      expect(() => {
        store.createBody(
          {
            id: 'hacked-planet',
            slug: 'hacked',
            name: 'Hacked Planet',
            type: 'planet',
            description: 'Uji coba penulisan tanpa hak akses admin.',
            sources: ['https://invalid.com'],
            isPublished: true,
          },
          mockStudentUser,
        );
      }).toThrow(/Hanya pengguna dengan peran admin/i);

      // Siswa mencoba membuat POI
      expect(() => {
        store.createPoi(
          {
            id: 'fake-poi',
            bodyId: 'mars',
            slug: 'fake-poi',
            name: 'Fake POI',
            type: 'kawah',
            lat: 0,
            lon: 0,
            historyText: 'Penulisan tidak sah pada titik minat.',
            dimensions: [],
            sources: ['https://invalid.com'],
            isPublished: true,
          },
          mockStudentUser,
        );
      }).toThrow(/Hanya pengguna dengan peran admin/i);

      // Tamu (null user) mencoba menulis
      expect(() => {
        checkAdminPermission(null);
      }).toThrow(/Hanya pengguna dengan peran admin/i);
    });
  });

  describe('2. Zod Schema Validation & Mandatory Fact Sources', () => {
    it('validates Celestial Body schema and strictly requires verified sources', () => {
      // Data valid
      const valid = celestialBodySchema.safeParse({
        id: 'mars-test',
        slug: 'mars-test',
        name: 'Mars Test',
        type: 'planet',
        diameterKm: 6779,
        description: 'Planet merah dengan atmosfer tipis kaya CO2.',
        sources: ['NASA Planetary Data System'],
        isPublished: true,
      });
      expect(valid.success).toBe(true);

      // Data tanpa sumber ilmiah (wajib ada fakta bersumber)
      const invalidNoSources = celestialBodySchema.safeParse({
        id: 'mars-test',
        slug: 'mars-test',
        name: 'Mars Test',
        type: 'planet',
        diameterKm: 6779,
        description: 'Planet merah dengan atmosfer tipis kaya CO2.',
        sources: [], // KOSONG!
        isPublished: true,
      });
      expect(invalidNoSources.success).toBe(false);

      // Data dengan slug tidak valid
      const invalidSlug = celestialBodySchema.safeParse({
        id: 'Mars Test!',
        slug: 'Mars Test!', // Huruf kapital dan spasi
        name: 'Mars Test',
        type: 'planet',
        description: 'Deskripsi singkat planet.',
        sources: ['NASA Facts'],
        isPublished: true,
      });
      expect(invalidSlug.success).toBe(false);
    });

    it('validates POI schema, requires sources for every dimension, and validates coordinate boundaries', () => {
      // POI valid
      const validPoi = poiSchema.safeParse({
        id: 'mars-kawah-gale',
        bodyId: 'mars',
        slug: 'kawah-gale',
        name: 'Kawah Gale',
        type: 'kawah',
        lat: -5.4,
        lon: 137.8,
        historyText:
          'Kawah tumbukan purba berdiameter 154 km tempat pendaratan wahana penjelajah Curiosity NASA.',
        dimensions: [
          {
            label: 'Diameter Kawah',
            nilai: 154,
            satuan: 'km',
            sumber: 'NASA Mars Science Laboratory / USGS',
          },
        ],
        sources: ['NASA Curiosity Rover Science Mission'],
        isPublished: true,
      });
      expect(validPoi.success).toBe(true);

      // Gagal jika koordinat latitude di luar [-90, 90]
      const invalidLat = poiSchema.safeParse({
        id: 'mars-invalid',
        bodyId: 'mars',
        slug: 'invalid',
        name: 'Invalid Point',
        type: 'gunung',
        lat: 95.0, // Error: > 90 derajat
        lon: 120.0,
        historyText:
          'Deskripsi geologi titik minat yang melebihi batas koordinat kutub.',
        dimensions: [],
        sources: ['NASA Open Data'],
        isPublished: true,
      });
      expect(invalidLat.success).toBe(false);

      // Gagal jika dimensi tidak memiliki sumber fakta terverifikasi
      const invalidDimSource = poiSchema.safeParse({
        id: 'mars-kawah-gale',
        bodyId: 'mars',
        slug: 'kawah-gale',
        name: 'Kawah Gale',
        type: 'kawah',
        lat: -5.4,
        lon: 137.8,
        historyText:
          'Kawah tumbukan purba berdiameter 154 km tempat pendaratan wahana Curiosity.',
        dimensions: [
          {
            label: 'Diameter Kawah',
            nilai: 154,
            satuan: 'km',
            sumber: '', // KOSONG!
          },
        ],
        sources: ['NASA Curiosity'],
        isPublished: true,
      });
      expect(invalidDimSource.success).toBe(false);
    });
  });

  describe('3. Asset Upload Validation, Storage Policies, and Auto-Versioning', () => {
    it('rejects unsupported file formats and oversized files', () => {
      // Tekstur valid
      const validTexture = validateAssetFile(
        { name: 'mars_surface.jpg', size: 4 * 1024 * 1024, type: 'image/jpeg' },
        'tekstur',
      );
      expect(validTexture.valid).toBe(true);

      // Berkas berbahaya atau tidak didukung (.exe)
      const invalidExe = validateAssetFile(
        { name: 'malware.exe', size: 1024, type: 'application/x-msdownload' },
        'tekstur',
      );
      expect(invalidExe.valid).toBe(false);
      expect(invalidExe.error).toContain('Format berkas tidak didukung');

      // Berkas melebihi ukuran batas (>10MB untuk tekstur)
      const oversizedTexture = validateAssetFile(
        { name: 'mars_huge.png', size: 15 * 1024 * 1024, type: 'image/png' },
        'tekstur',
      );
      expect(oversizedTexture.valid).toBe(false);
      expect(oversizedTexture.error).toContain('melebihi batas maksimal');
    });

    it('requires license and attribution metadata for all uploaded assets', () => {
      // Gagal jika lisensi kosong
      const missingLicense = assetUploadSchema.safeParse({
        targetType: 'body',
        targetId: 'mars',
        assetType: 'tekstur',
        qualityTier: 'tinggi',
        license: '', // KOSONG!
        attribution: 'NASA/JPL',
      });
      expect(missingLicense.success).toBe(false);

      // Gagal jika atribusi kosong
      const missingAttribution = assetUploadSchema.safeParse({
        targetType: 'body',
        targetId: 'mars',
        assetType: 'tekstur',
        qualityTier: 'tinggi',
        license: 'Domain Publik',
        attribution: '', // KOSONG!
      });
      expect(missingAttribution.success).toBe(false);
    });

    it('automatically increments version number when new asset is uploaded for same target, type, and quality tier', () => {
      const store = useCmsStore.getState();

      // Versi 1 sudah ada dari data awal: mars - tekstur - tinggi -> version 1
      const vNext1 = store.getNextAssetVersion(
        'body',
        'mars',
        'tekstur',
        'tinggi',
      );
      expect(vNext1).toBe(2);

      // Admin mengunggah versi baru
      const newAsset = store.uploadAsset(
        {
          targetType: 'body',
          targetId: 'mars',
          assetType: 'tekstur',
          qualityTier: 'tinggi',
          license: 'Domain Publik NASA MGS',
          attribution: 'NASA/MOLA',
        },
        { name: 'mars_v2.jpg', size: 2000000, type: 'image/jpeg' },
        mockAdminUser,
      );

      expect(newAsset.version).toBe(2);

      // Unggah berikutnya untuk target yang sama otomatis naik ke versi 3
      const vNext2 = store.getNextAssetVersion(
        'body',
        'mars',
        'tekstur',
        'tinggi',
      );
      expect(vNext2).toBe(3);
    });
  });

  describe('4. Visual Coordinate Picker Math & Pin Placement', () => {
    it('renders visual coordinate picker and allows selecting coordinate presets', () => {
      const handleChange = vi.fn();
      render(
        <VisualCoordinatePicker
          planetName="Mars"
          lat={18.65}
          lon={226.2}
          onChange={handleChange}
        />,
      );

      expect(
        screen.getByText(/Penentu Koordinat Visual 3D \(Mars\)/i),
      ).toBeInTheDocument();
      expect(screen.getAllByText(/18.65°/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/226.20°/i).length).toBeGreaterThan(0);

      // Klik tombol preset koordinat Khatulistiwa (0°, 0°)
      const equatorBtn = screen.getByRole('button', { name: /Khatulistiwa/i });
      equatorBtn.click();
      expect(handleChange).toHaveBeenCalledWith(0, 0);

      // Klik preset Badai Merah (-22°, 270°)
      const stormBtn = screen.getByRole('button', { name: /Badai Merah/i });
      stormBtn.click();
      expect(handleChange).toHaveBeenCalledWith(-22, 270);
    });
  });

  describe('5. UI Components, Route Protection, and WCAG AA Accessibility', () => {
    it('redirects unauthorized users away from /admin via RoleGuard', () => {
      // Siswa mencoba masuk ke route /admin
      useAuthStore.setState({ user: mockStudentUser });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AdminCmsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/auth"
              element={<div>Halaman Masuk (Redirected)</div>}
            />
          </Routes>
        </MemoryRouter>,
      );

      // RoleGuard menampilkan pesan akses dibatasi untuk pengguna non-admin
      expect(screen.getByText('Akses Khusus Dibatasi')).toBeInTheDocument();
      expect(
        screen.queryByText(/Manajemen Konten Astronomi/i),
      ).not.toBeInTheDocument();
    });

    it('renders AdminCmsPage for admin users and switches between tabs', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <AdminCmsPage />
        </MemoryRouter>,
      );

      expect(
        screen.getByText('Manajemen Konten Astronomi (CMS)'),
      ).toBeInTheDocument();
      expect(screen.getByText('Admin Konten')).toBeInTheDocument();

      // Pindah ke tab Titik Minat (POI)
      const poiTab = screen.getByRole('tab', { name: /Titik Minat/i });
      await user.click(poiTab);
      expect(screen.getByText(/Olympus Mons/i)).toBeInTheDocument();

      // Pindah ke tab Aset 3D & Media
      const assetsTab = screen.getByRole('tab', { name: /Aset 3D & Media/i });
      await user.click(assetsTab);
      expect(screen.getAllByText(/tekstur/i).length).toBeGreaterThan(0);

      // Pindah ke tab Riwayat Perubahan
      const historyTab = screen.getByRole('tab', {
        name: /Riwayat Perubahan/i,
      });
      await user.click(historyTab);
      expect(
        screen.getByText(/Riwayat Audit Perubahan Konten/i),
      ).toBeInTheDocument();
    });

    it('renders StudentPreviewModal with student view of POI and passes axe accessibility audit', async () => {
      const mockPoi = INITIAL_CMS_POIS[0];
      const { container } = render(
        <StudentPreviewModal
          type="poi"
          item={mockPoi}
          parentBody={INITIAL_CMS_BODIES.find((b) => b.id === mockPoi.bodyId)}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText('👁️ Mode Pratinjau Siswa')).toBeInTheDocument();
      expect(screen.getByText(mockPoi.name)).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('passes axe accessibility audit on CelestialBodyFormModal and PoiFormModal', async () => {
      const { container: bodyContainer } = render(
        <CelestialBodyFormModal isOpen={true} onClose={() => {}} />,
      );
      const bodyResults = await axe(bodyContainer);
      expect(bodyResults).toHaveNoViolations();

      const { container: poiContainer } = render(
        <PoiFormModal isOpen={true} onClose={() => {}} />,
      );
      const poiResults = await axe(poiContainer);
      expect(poiResults).toHaveNoViolations();
    });
  });
});
