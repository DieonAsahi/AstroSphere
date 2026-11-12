'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Compass,
  Plus,
  Pencil,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Trash2,
  RotateCcw,
  Upload,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  Rocket,
  History as HistoryIcon,
  Image as ImageIcon,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import { formatSupabaseError } from '../../../../lib/supabase/adminAuth';
import { uploadAdminAsset } from '../../../../lib/supabase/storageUpload';
import { EARTH_ERA_OPTIONS } from '../../../../lib/constants/historyFilters';
import {
  exportAsCsv,
  exportAsJson,
  isValidUuid,
} from '../../../../lib/utils/importExport';
import {
  BulkImportModal,
  type BulkImportValidationResult,
} from '../../../../components/admin/BulkImportModal';
import type { HistoryEvent, PoiCategory } from '../../../../types/database';

const PLANET_OPTIONS = [
  { id: 'earth', name: 'Bumi' },
  { id: 'mars', name: 'Mars' },
  { id: 'venus', name: 'Venus' },
  { id: 'mercury', name: 'Merkurius' },
  { id: 'jupiter', name: 'Jupiter' },
  { id: 'saturn', name: 'Saturnus' },
  { id: 'uranus', name: 'Uranus' },
  { id: 'neptune', name: 'Neptunus' },
];

function getPlanetBadgeStyle(planetId: string) {
  switch (planetId) {
    case 'mars':
      return {
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
        label: 'Mars',
      };
    case 'venus':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Venus',
      };
    case 'jupiter':
      return {
        bg: 'bg-orange-50 text-orange-700 border-orange-200',
        dot: 'bg-orange-500',
        label: 'Jupiter',
      };
    case 'earth':
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        label: 'Bumi',
      };
    case 'mercury':
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-500',
        label: 'Merkurius',
      };
    case 'saturn':
      return {
        bg: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        dot: 'bg-yellow-500',
        label: 'Saturnus',
      };
    case 'uranus':
      return {
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        dot: 'bg-cyan-500',
        label: 'Uranus',
      };
    case 'neptune':
      return {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dot: 'bg-indigo-500',
        label: 'Neptunus',
      };
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
        label: planetId,
      };
  }
}

// Format tampilan tahun ramah Sebelum Masehi (SM) & Masehi (M)
function formatYearDisplay(year: number): string {
  if (year < 0) {
    const absYear = Math.abs(year);
    if (absYear >= 1000000) {
      const millions = absYear / 1000000;
      return `${millions % 1 === 0 ? millions : millions.toFixed(1)} Juta SM`;
    }
    return `${absYear.toLocaleString('id-ID')} SM`;
  }
  return `${year} M`;
}

const VALID_POI_CATEGORIES: PoiCategory[] = [
  'OBSERVATION',
  'SURFACE_LANDING',
  'ORBITAL_FLYBY',
];

const PLANET_ALIAS_MAP: Record<string, string> = {
  mercury: 'mercury',
  merkurius: 'mercury',
  venus: 'venus',
  earth: 'earth',
  bumi: 'earth',
  mars: 'mars',
  jupiter: 'jupiter',
  saturn: 'saturn',
  saturnus: 'saturn',
  uranus: 'uranus',
  neptune: 'neptune',
  neptunus: 'neptune',
};

const HISTORY_EXPORT_HEADERS = [
  'event_id',
  'planet_id',
  'era_label',
  'tahun_kejadian',
  'kategori_poi',
  'judul',
  'ringkasan_singkat',
  'nama_wahana',
  'deskripsi',
  'gambar_url',
  'sumber_referensi',
];

interface ValidatedHistoryImportRow {
  event_id?: string;
  planet_id: string;
  era_label: string;
  tahun_kejadian: number;
  kategori_poi: PoiCategory;
  judul: string;
  ringkasan_singkat: string;
  nama_wahana: string | null;
  deskripsi: string;
  gambar_url: string;
  koordinat_lat: number;
  koordinat_lng: number;
  sumber_referensi: string;
}

const DEFAULT_EVENT: Partial<HistoryEvent> = {
  planet_id: 'earth',
  era_label: EARTH_ERA_OPTIONS[0],
  tahun_kejadian: new Date().getFullYear(),
  kategori_poi: 'OBSERVATION',
  judul: '',
  ringkasan_singkat: '',
  nama_wahana: '',
  deskripsi: '',
  gambar_url: '',
  sumber_referensi: '',
};

export default function AdminHistoryPage() {
  const { searchQuery = '' } = useOutletContext<{ searchQuery?: string }>() || {};
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedPlanetFilter, setSelectedPlanetFilter] = useState<string>('ALL');
  const [selectedEraFilter, setSelectedEraFilter] = useState<string>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');

  // Pagination State (M-02)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State
  const [editingEvent, setEditingEvent] = useState<HistoryEvent | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [modalViewMode, setModalViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [previewDetailOpen, setPreviewDetailOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<HistoryEvent>>(DEFAULT_EVENT);
  const [yearInput, setYearInput] = useState<string>(String(new Date().getFullYear()));
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, boolean>>({});
  const [deletingEvent, setDeletingEvent] = useState<HistoryEvent | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [modalNotification, setModalNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('history_events')
        .select('*')
        .order('tahun_kejadian', { ascending: true });

      if (error) throw error;
      setEvents((data || []) as HistoryEvent[]);
      setBrokenImageIds({});
    } catch (err: unknown) {
      console.error('Error fetching history events:', err);
      setNotification({
        type: 'error',
        message: formatSupabaseError(
          err,
          'Gagal mengambil data peristiwa sejarah dari Supabase'
        ),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Saring peristiwa sesuai filter planet, rentang tahun lengkap, dan search query (M-01)
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchPlanet =
        selectedPlanetFilter === 'ALL' || ev.planet_id === selectedPlanetFilter;
      const matchEra =
        selectedEraFilter === 'ALL' || (ev.era_label || '') === selectedEraFilter;
      const y = ev.tahun_kejadian;
      const matchYear =
        selectedYearFilter === 'ALL' ||
        (selectedYearFilter === 'ANCIENT' && y < 1) ||
        (selectedYearFilter === 'CLASSICAL' && y >= 1 && y <= 1899) ||
        (selectedYearFilter === 'EARLY_1900S' && y >= 1900 && y <= 1959) ||
        (selectedYearFilter === '1960s' && y >= 1960 && y <= 1969) ||
        (selectedYearFilter === '1970s' && y >= 1970 && y <= 1979) ||
        (selectedYearFilter === '1980s' && y >= 1980 && y <= 1989) ||
        (selectedYearFilter === '1990s' && y >= 1990 && y <= 1999) ||
        (selectedYearFilter === '2000s' && y >= 2000 && y <= 2009) ||
        (selectedYearFilter === '2010s' && y >= 2010 && y <= 2019) ||
        (selectedYearFilter === '2020s' && y >= 2020);

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        ev.judul.toLowerCase().includes(q) ||
        (ev.ringkasan_singkat && ev.ringkasan_singkat.toLowerCase().includes(q)) ||
        (ev.era_label && ev.era_label.toLowerCase().includes(q)) ||
        (ev.nama_wahana && ev.nama_wahana.toLowerCase().includes(q)) ||
        (ev.deskripsi && ev.deskripsi.toLowerCase().includes(q)) ||
        (ev.sumber_referensi && ev.sumber_referensi.toLowerCase().includes(q)) ||
        ev.planet_id.toLowerCase().includes(q);

      return matchPlanet && matchEra && matchYear && matchSearch;
    });
  }, [events, selectedPlanetFilter, selectedEraFilter, selectedYearFilter, searchQuery]);

  // Reset pagination saat filter berganti
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlanetFilter, selectedEraFilter, selectedYearFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  const handleOpenEdit = (event: HistoryEvent) => {
    setEditingEvent(event);
    setFormData({ ...event });
    setYearInput(String(event.tahun_kejadian));
    setModalViewMode('EDIT');
    setPreviewDetailOpen(false);
    setPreviewBroken(false);
    setModalNotification(null);
    setIsAdding(false);
  };

  const handleOpenAdd = () => {
    setEditingEvent(null);
    const defaultYear = new Date().getFullYear();
    const targetPlanet = selectedPlanetFilter !== 'ALL' ? selectedPlanetFilter : 'earth';
    setFormData({
      ...DEFAULT_EVENT,
      tahun_kejadian: defaultYear,
      planet_id: targetPlanet,
      era_label: targetPlanet === 'earth' ? EARTH_ERA_OPTIONS[0] : 'Sejarah Geologi',
    });
    setYearInput(String(defaultYear));
    setModalViewMode('EDIT');
    setPreviewDetailOpen(false);
    setPreviewBroken(false);
    setModalNotification(null);
    setIsAdding(true);
  };

  const handleCloseModal = () => {
    setEditingEvent(null);
    setIsAdding(false);
    setModalViewMode('EDIT');
    setPreviewDetailOpen(false);
    setFormData(DEFAULT_EVENT);
    setYearInput(String(new Date().getFullYear()));
    setPreviewBroken(false);
    setModalNotification(null);
  };

  const handleResetFilter = () => {
    setSelectedPlanetFilter('ALL');
    setSelectedEraFilter('ALL');
    setSelectedYearFilter('ALL');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Selalu reset value input file terlebih dahulu agar pemilihan file yang sama tetap memicu onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;

    setUploadingImage(true);
    setModalNotification(null);

    try {
      const publicUrl = await uploadAdminAsset({
        file,
        folder: 'history',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
        maxSizeMB: 5,
        invalidTypeMessage:
          'Format gambar tidak didukung. Hanya file JPG, PNG, atau WebP yang diizinkan.',
      });

      setFormData((prev) => ({
        ...prev,
        gambar_url: publicUrl,
      }));
      setPreviewBroken(false);

      setModalNotification({
        type: 'success',
        message: 'Foto peristiwa berhasil diunggah ke Supabase Storage (astrosphere-assets)!',
      });
    } catch (err: unknown) {
      console.error('Upload image error:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal mengunggah foto ke storage.';
      setModalNotification({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalNotification(null);

    const parsedYear = Number(yearInput);
    if (yearInput.trim() === '' || Number.isNaN(parsedYear) || !Number.isInteger(parsedYear)) {
      setModalNotification({
        type: 'error',
        message: 'Tahun peristiwa harus berupa bilangan bulat yang valid (negatif untuk SM).',
      });
      return;
    }

    if (!formData.judul?.trim()) {
      setModalNotification({
        type: 'error',
        message: 'Judul singkat peristiwa wajib diisi.',
      });
      return;
    }

    if (!formData.ringkasan_singkat?.trim()) {
      setModalNotification({
        type: 'error',
        message: 'Deskripsi singkat untuk tampilan List Card (1 kalimat) wajib diisi.',
      });
      return;
    }

    if (!formData.deskripsi?.trim()) {
      setModalNotification({
        type: 'error',
        message: 'Penjelasan lengkap peristiwa wajib diisi.',
      });
      return;
    }

    setSaving(true);
    setNotification(null);

    const rawLat = formData.koordinat_lat;
    const rawLng = formData.koordinat_lng;
    const parsedLat =
      rawLat !== undefined && rawLat !== null && !Number.isNaN(Number(rawLat))
        ? Number(rawLat)
        : 0;
    const parsedLng =
      rawLng !== undefined && rawLng !== null && !Number.isNaN(Number(rawLng))
        ? Number(rawLng)
        : 0;
    const lat = parsedLat >= -90 && parsedLat <= 90 ? parsedLat : 0;
    const lng = parsedLng >= -180 && parsedLng <= 180 ? parsedLng : 0;
    const resolvedPlanetId = formData.planet_id || editingEvent?.planet_id || 'earth';
    const defaultEraForPlanet =
      resolvedPlanetId === 'earth' ? EARTH_ERA_OPTIONS[0] : 'Sejarah Geologi';

    try {
      if (isAdding) {
        const { data, error } = await supabase
          .from('history_events')
          .insert({
            planet_id: resolvedPlanetId,
            era_label: (formData.era_label || '').trim() || defaultEraForPlanet,
            tahun_kejadian: parsedYear,
            kategori_poi: (formData.kategori_poi || 'OBSERVATION') as PoiCategory,
            judul: formData.judul.trim(),
            ringkasan_singkat: formData.ringkasan_singkat.trim(),
            nama_wahana: formData.nama_wahana?.trim() || null,
            deskripsi: formData.deskripsi.trim(),
            gambar_url: formData.gambar_url?.trim() || '',
            koordinat_lat: lat,
            koordinat_lng: lng,
            sumber_referensi: formData.sumber_referensi?.trim() || '',
          })
          .select('event_id')
          .single();

        if (error) throw error;
        if (!data) {
          throw new Error('Data peristiwa baru gagal dikonfirmasi oleh database.');
        }
        setNotification({
          type: 'success',
          message: 'Peristiwa sejarah baru berhasil ditambahkan ke Supabase!',
        });
      } else if (editingEvent) {
        const { data, error } = await supabase
          .from('history_events')
          .update({
            planet_id: resolvedPlanetId,
            era_label:
              formData.era_label !== undefined
                ? formData.era_label.trim() || defaultEraForPlanet
                : editingEvent.era_label || defaultEraForPlanet,
            tahun_kejadian: parsedYear,
            kategori_poi: (formData.kategori_poi || editingEvent.kategori_poi || 'OBSERVATION') as PoiCategory,
            judul: formData.judul.trim(),
            ringkasan_singkat: formData.ringkasan_singkat.trim(),
            nama_wahana:
              formData.nama_wahana !== undefined
                ? formData.nama_wahana?.trim() || null
                : editingEvent.nama_wahana,
            deskripsi: formData.deskripsi.trim(),
            gambar_url:
              formData.gambar_url !== undefined
                ? formData.gambar_url?.trim() || ''
                : editingEvent.gambar_url || '',
            koordinat_lat: lat,
            koordinat_lng: lng,
            sumber_referensi:
              formData.sumber_referensi !== undefined
                ? formData.sumber_referensi?.trim() || ''
                : editingEvent.sumber_referensi || '',
          })
          .eq('event_id', editingEvent.event_id)
          .select('event_id')
          .single();

        if (error) throw error;
        if (!data) {
          throw new Error('Perubahan peristiwa tidak tersimpan di database.');
        }
        setNotification({
          type: 'success',
          message: `Peristiwa "${formData.judul.trim()}" berhasil diperbarui!`,
        });
      }

      handleCloseModal();
      await fetchEvents();
    } catch (err: unknown) {
      console.error('Save error:', err);
      setModalNotification({
        type: 'error',
        message: formatSupabaseError(err, 'Gagal menyimpan peristiwa sejarah'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEvent) return;

    setSaving(true);
    try {
      const { data: deletedRows, error } = await supabase
        .from('history_events')
        .delete()
        .eq('event_id', deletingEvent.event_id)
        .select('event_id');

      if (error) throw error;
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error(
          'Peristiwa tidak ditemukan atau penghapusan ditolak oleh kebijakan RLS Supabase.'
        );
      }

      setNotification({
        type: 'success',
        message: `Peristiwa "${deletingEvent.judul}" berhasil dihapus dari Supabase.`,
      });
      if (editingEvent?.event_id === deletingEvent.event_id) {
        handleCloseModal();
      }
      setDeletingEvent(null);
      await fetchEvents();
    } catch (err: unknown) {
      console.error('Delete error:', err);
      setDeletingEvent(null);
      setNotification({
        type: 'error',
        message: formatSupabaseError(err, 'Gagal menghapus peristiwa sejarah'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportJson = () => {
    setExportMenuOpen(false);
    if (filteredEvents.length === 0) {
      setNotification({
        type: 'error',
        message: 'Tidak ada peristiwa sejarah pada filter saat ini untuk diekspor.',
      });
      return;
    }
    const payload = filteredEvents.map((ev) => ({
      event_id: ev.event_id,
      planet_id: ev.planet_id,
      era_label: ev.era_label || 'Sejarah Geologi',
      tahun_kejadian: ev.tahun_kejadian,
      kategori_poi: ev.kategori_poi,
      judul: ev.judul,
      ringkasan_singkat: ev.ringkasan_singkat || '',
      nama_wahana: ev.nama_wahana || '',
      deskripsi: ev.deskripsi,
      gambar_url: ev.gambar_url || '',
      sumber_referensi: ev.sumber_referensi || '',
    }));
    exportAsJson(payload, 'astrosphere-history-events.json');
    setNotification({
      type: 'success',
      message: `${payload.length} peristiwa sejarah berhasil diekspor ke file JSON.`,
    });
  };

  const handleExportCsv = () => {
    setExportMenuOpen(false);
    if (filteredEvents.length === 0) {
      setNotification({
        type: 'error',
        message: 'Tidak ada peristiwa sejarah pada filter saat ini untuk diekspor.',
      });
      return;
    }
    const rows = filteredEvents.map((ev) => ({
      event_id: ev.event_id,
      planet_id: ev.planet_id,
      era_label: ev.era_label || 'Sejarah Geologi',
      tahun_kejadian: ev.tahun_kejadian,
      kategori_poi: ev.kategori_poi,
      judul: ev.judul,
      ringkasan_singkat: ev.ringkasan_singkat || '',
      nama_wahana: ev.nama_wahana || '',
      deskripsi: ev.deskripsi,
      gambar_url: ev.gambar_url || '',
      sumber_referensi: ev.sumber_referensi || '',
    }));
    exportAsCsv(HISTORY_EXPORT_HEADERS, rows, 'astrosphere-history-events.csv');
    setNotification({
      type: 'success',
      message: `${rows.length} peristiwa sejarah berhasil diekspor ke file CSV.`,
    });
  };

  const handleDownloadCsvTemplate = () => {
    exportAsCsv(
      HISTORY_EXPORT_HEADERS,
      [
        {
          event_id: '',
          planet_id: 'earth',
          era_label: 'Zaman Dinosaurus & Kapur',
          tahun_kejadian: -6600,
          kategori_poi: 'OBSERVATION',
          judul: 'Kawah Asteroid Chicxulub',
          ringkasan_singkat: 'Kawah tumbukan raksasa yang mengakhiri era dinosaurus non-unggas di Bumi.',
          nama_wahana: 'Semenanjung Yucatán, Meksiko • Diameter 180 km',
          deskripsi:
            'Sekitar 66 juta tahun lalu, asteroid selebar 10–15 km menghantam Bumi dan membentuk Kawah Chicxulub serta memicu musim dingin global yang mengakhiri era dinosaurus non-unggas.',
          gambar_url: '/images/poi/earth-06-chicxulub.webp',
          sumber_referensi: 'NASA Earth Science',
        },
        {
          event_id: '',
          planet_id: 'earth',
          era_label: 'Zaman Modern (1500 – Sekarang)',
          tahun_kejadian: 1912,
          kategori_poi: 'OBSERVATION',
          judul: 'Tenggelamnya Kapal RMS Titanic',
          ringkasan_singkat: 'Pelayaran perdana kapal samudra terbesar yang menabrak gunung es Atlantik dan melahirkan hukum keselamatan maritim.',
          nama_wahana: 'Samudra Atlantik Utara • Kedalaman 3.800 m',
          deskripsi:
            'Kapal uap penumpang termegah zamannya menabrak gunung es pada pelayaran perdana tahun 1912. Peristiwa ini mendorong pembentukan Konvensi Internasional Keselamatan Jiwa di Laut (SOLAS).',
          gambar_url: '/images/poi/earth-69-titanic.webp',
          sumber_referensi: 'Maritime History Archive',
        },
      ],
      'template-import-sejarah-astrosphere.csv',
    );
  };

  const handleDownloadJsonTemplate = () => {
    exportAsJson(
      [
        {
          planet_id: 'earth',
          era_label: 'Zaman Dinosaurus & Kapur',
          tahun_kejadian: -6600,
          kategori_poi: 'OBSERVATION',
          judul: 'Kawah Asteroid Chicxulub',
          ringkasan_singkat: 'Kawah tumbukan raksasa yang mengakhiri era dinosaurus non-unggas di Bumi.',
          nama_wahana: 'Semenanjung Yucatán, Meksiko • Diameter 180 km',
          deskripsi:
            'Sekitar 66 juta tahun lalu, asteroid selebar 10–15 km menghantam Bumi dan membentuk Kawah Chicxulub serta memicu musim dingin global yang mengakhiri era dinosaurus non-unggas.',
          gambar_url: '/images/poi/earth-06-chicxulub.webp',
          sumber_referensi: 'NASA Earth Science',
        },
      ],
      'template-import-sejarah-astrosphere.json',
    );
  };

  const validateHistoryImportRows = (
    records: Array<Record<string, unknown>>,
  ): BulkImportValidationResult<ValidatedHistoryImportRow> => {
    const validRows: ValidatedHistoryImportRow[] = [];
    const errors: string[] = [];

    records.forEach((raw, idx) => {
      const rowNum = idx + 1;
      const rawPlanet = String(raw.planet_id ?? '').trim().toLowerCase();
      const mappedPlanet = PLANET_ALIAS_MAP[rawPlanet];
      if (!mappedPlanet) {
        errors.push(
          `Baris ${rowNum}: planet_id "${String(raw.planet_id ?? '')}" tidak dikenali (gunakan: mercury, venus, earth, mars, jupiter, saturn, uranus, neptune).`,
        );
        return;
      }

      const rawYearStr = String(raw.tahun_kejadian ?? '').trim();
      const parsedYear = Number(rawYearStr);
      if (rawYearStr === '' || Number.isNaN(parsedYear) || !Number.isInteger(parsedYear)) {
        errors.push(
          `Baris ${rowNum}: tahun_kejadian "${rawYearStr}" harus bilangan bulat valid (contoh: -66000000 atau 1969).`,
        );
        return;
      }

      const judul = String(raw.judul ?? '').trim();
      if (!judul) {
        errors.push(`Baris ${rowNum}: kolom judul wajib diisi.`);
        return;
      }

      const deskripsi = String(raw.deskripsi ?? '').trim();
      if (!deskripsi) {
        errors.push(`Baris ${rowNum}: kolom deskripsi wajib diisi.`);
        return;
      }

      const rawKategori = String(raw.kategori_poi ?? '').trim().toUpperCase();
      const kategori: PoiCategory = rawKategori
        ? (rawKategori as PoiCategory)
        : 'OBSERVATION';
      if (!VALID_POI_CATEGORIES.includes(kategori)) {
        errors.push(
          `Baris ${rowNum}: kategori_poi "${rawKategori}" tidak valid (pilih: OBSERVATION, SURFACE_LANDING, atau ORBITAL_FLYBY).`,
        );
        return;
      }

      const rawId = raw.event_id !== undefined && raw.event_id !== null ? String(raw.event_id).trim() : '';
      if (rawId && !isValidUuid(rawId)) {
        errors.push(`Baris ${rowNum}: event_id "${rawId}" bukan format UUID yang valid (kosongkan untuk baris baru).`);
        return;
      }

      const rawEra = String(raw.era_label ?? '').trim();
      const matchedEarthEra =
        mappedPlanet === 'earth'
          ? EARTH_ERA_OPTIONS.find((e) => e.toLowerCase() === rawEra.toLowerCase()) ||
            rawEra ||
            EARTH_ERA_OPTIONS[0]
          : rawEra || 'Sejarah Geologi';

      const ringkasanSingkat = String(raw.ringkasan_singkat ?? '').trim();

      const validated: ValidatedHistoryImportRow = {
        ...(rawId ? { event_id: rawId } : {}),
        planet_id: mappedPlanet,
        era_label: matchedEarthEra,
        tahun_kejadian: parsedYear,
        kategori_poi: kategori,
        judul,
        ringkasan_singkat: ringkasanSingkat || deskripsi.slice(0, 140),
        nama_wahana: String(raw.nama_wahana ?? '').trim() || null,
        deskripsi,
        gambar_url: String(raw.gambar_url ?? '').trim(),
        koordinat_lat: 0,
        koordinat_lng: 0,
        sumber_referensi: String(raw.sumber_referensi ?? '').trim(),
      };
      validRows.push(validated);
    });

    return { validRows, errors };
  };

  const handleImportHistoryConfirm = async (rows: ValidatedHistoryImportRow[]) => {
    const upsertRows = rows.filter((row) => Boolean(row.event_id));
    const insertRows = rows
      .filter((row) => !row.event_id)
      .map(({ event_id: _omitted, ...rest }) => {
        void _omitted;
        return rest;
      });

    if (upsertRows.length > 0) {
      const { data, error } = await supabase
        .from('history_events')
        .upsert(upsertRows, { onConflict: 'event_id' })
        .select('event_id');
      if (error) throw new Error(formatSupabaseError(error, 'Gagal memperbarui data (upsert)'));
      if (!data || data.length === 0) {
        throw new Error('Tidak ada baris yang terbarui saat import upsert (periksa izin RLS).');
      }
    }

    if (insertRows.length > 0) {
      const { data, error } = await supabase
        .from('history_events')
        .insert(insertRows)
        .select('event_id');
      if (error) throw new Error(formatSupabaseError(error, 'Gagal menambahkan data baru'));
      if (!data || data.length === 0) {
        throw new Error('Data baru gagal disimpan saat import massal.');
      }
    }

    setNotification({
      type: 'success',
      message: `Import massal berhasil: ${rows.length} peristiwa (${insertRows.length} baru, ${upsertRows.length} diperbarui) disimpan ke Supabase.`,
    });
    await fetchEvents();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card Sesuai Gambar A03 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sejarah &amp; POI
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Kelola linimasa penjelajahan historis antariksa, bentang alam, dan dokumentasi foto peristiwa untuk setiap planet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchEvents();
            }}
            disabled={refreshing}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors"
            title="Segarkan data peristiwa"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-colors"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Export</span>
            </button>
            {exportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setExportMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-30">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span>Export CSV ({filteredEvents.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FileJson className="h-4 w-4 text-blue-600" />
                    <span>Export JSON ({filteredEvents.length})</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-colors"
          >
            <Upload className="h-4 w-4 text-blue-600" />
            <span>Import Massal</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Peristiwa</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-4 text-xs font-medium ${
            notification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">{notification.message}</div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Filter Bar Card Sesuai Gambar A03 (Rentang Waktu Lengkap Tanpa Celah) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Filter Planet */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 uppercase text-[11px] tracking-wider">
              FILTER PLANET:
            </span>
            <select
              value={selectedPlanetFilter}
              onChange={(e) => {
                const nextPlanet = e.target.value;
                setSelectedPlanetFilter(nextPlanet);
                if (nextPlanet !== 'ALL' && nextPlanet !== 'earth') {
                  setSelectedEraFilter('ALL');
                }
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-semibold focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Planet</option>
              {PLANET_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Zaman Baku Bumi */}
          {(selectedPlanetFilter === 'ALL' || selectedPlanetFilter === 'earth') && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600 uppercase text-[11px] tracking-wider">
                ZAMAN BUMI:
              </span>
              <select
                value={selectedEraFilter}
                onChange={(e) => setSelectedEraFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-semibold focus:border-blue-600 focus:outline-none max-w-[230px]"
              >
                <option value="ALL">Semua Zaman</option>
                {EARTH_ERA_OPTIONS.map((era) => (
                  <option key={era} value={era}>
                    {era}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Periode Tahun */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 uppercase text-[11px] tracking-wider">
              PERIODE TAHUN:
            </span>
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-semibold focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Tahun</option>
              <option value="ANCIENT">Zaman Prasejarah &amp; SM (&lt; 1 M)</option>
              <option value="CLASSICAL">Era Klasik &amp; Pertengahan (1 – 1899 M)</option>
              <option value="EARLY_1900S">1900 – 1959 M</option>
              <option value="1960s">Dekade 1960-an</option>
              <option value="1970s">Dekade 1970-an</option>
              <option value="1980s">Dekade 1980-an</option>
              <option value="1990s">Dekade 1990-an</option>
              <option value="2000s">Dekade 2000-an</option>
              <option value="2010s">Dekade 2010-an</option>
              <option value="2020s">Dekade 2020-an ke atas</option>
            </select>
          </div>

          {/* Reset Filter */}
          <button
            type="button"
            onClick={handleResetFilter}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Total Entitas Badge */}
        <div className="flex items-center gap-2 self-start lg:self-auto text-xs">
          <span className="text-slate-500 font-medium">Total Entitas Terdaftar:</span>
          <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800">
            {filteredEvents.length} Peristiwa
          </span>
        </div>
      </div>

      {/* 3. Table Card Sesuai Gambar A03 */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5 w-36">TAHUN</th>
                <th className="px-6 py-3.5">NAMA PERISTIWA</th>
                <th className="px-6 py-3.5 w-32">PLANET</th>
                <th className="px-6 py-3.5 text-right w-28">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span>Memuat linimasa sejarah...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                    Tidak ada peristiwa yang cocok dengan filter atau pencarian yang dipilih.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => {
                  const planetBadge = getPlanetBadgeStyle(event.planet_id);
                  const hasValidImage = Boolean(event.gambar_url && !brokenImageIds[event.event_id]);

                  return (
                    <tr
                      key={event.event_id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* TAHUN */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-mono font-bold text-sm text-blue-600">
                            {formatYearDisplay(event.tahun_kejadian)}
                          </span>
                          {event.era_label && (
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 line-clamp-1 max-w-[170px]"
                              title={event.era_label}
                            >
                              {event.era_label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* NAMA PERISTIWA */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail Foto Peristiwa / Fallback Placeholder Ikon */}
                          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                            {hasValidImage ? (
                              <img
                                src={event.gambar_url as string}
                                alt={event.judul}
                                className="h-full w-full object-cover transition-transform duration-200 hover:scale-110"
                                onError={() =>
                                  setBrokenImageIds((prev) => ({
                                    ...prev,
                                    [event.event_id]: true,
                                  }))
                                }
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 text-sm line-clamp-1" title={event.judul}>
                              {event.judul}
                            </p>
                            <p
                              className="text-slate-500 text-xs mt-0.5 line-clamp-1"
                              title={event.ringkasan_singkat || event.nama_wahana || ''}
                            >
                              {event.ringkasan_singkat || event.nama_wahana || 'Peristiwa / Bentang Alam'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* PLANET BADGE */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${planetBadge.bg}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${planetBadge.dot}`} />
                          <span>{planetBadge.label}</span>
                        </span>
                      </td>

                      {/* AKSI */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(event)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 px-3 py-1.5 text-xs font-medium shadow-sm transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Ubah Data</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEvent(event)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Peristiwa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Functional Pagination (M-02) */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Menampilkan {filteredEvents.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
            {Math.min(currentPage * itemsPerPage, filteredEvents.length)} dari {filteredEvents.length} peristiwa
            {searchQuery && ` (difilter dari "${searchQuery}")`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
            >
              Sebelumnya
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCurrentPage(num)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === num
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* 4. Modal Form: Tambah / Ubah Peristiwa */}
      {(editingEvent || isAdding) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isAdding ? 'Tambah Peristiwa Sejarah Baru' : 'Ubah Data Peristiwa'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tentukan tahun, babak sejarah, foto ilustrasi, dan penjelasan lengkap materi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notifikasi Dalam Modal (Terlihat Langsung di Atas Backdrop) */}
            {modalNotification && (
              <div
                className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-medium ${
                  modalNotification.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {modalNotification.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">{modalNotification.message}</div>
                <button
                  type="button"
                  onClick={() => setModalNotification(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Toggle Mode: Form Edit vs Pratinjau Layar Siswa */}
            <div className="mt-4 flex rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setModalViewMode('EDIT')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  modalViewMode === 'EDIT'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Form Edit Data</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewDetailOpen(false);
                  setModalViewMode('PREVIEW');
                }}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  modalViewMode === 'PREVIEW'
                    ? 'bg-slate-900 text-cyan-300 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Pratinjau Layar Siswa</span>
              </button>
            </div>

            <form noValidate onSubmit={handleSave} className="mt-5 space-y-4">
              <div className={modalViewMode === 'EDIT' ? 'space-y-4' : 'hidden'}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Planet Target */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Planet Target
                  </label>
                  <select
                    value={formData.planet_id || 'earth'}
                    onChange={(e) => {
                      const nextPlanet = e.target.value;
                      const currentEra = (formData.era_label || '').trim();
                      const isBakuEarthEra = (EARTH_ERA_OPTIONS as readonly string[]).includes(currentEra);
                      setFormData({
                        ...formData,
                        planet_id: nextPlanet,
                        era_label:
                          nextPlanet === 'earth' && !isBakuEarthEra
                            ? EARTH_ERA_OPTIONS[0]
                            : formData.era_label,
                      });
                    }}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  >
                    {PLANET_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kategori Sejarah / Misi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Peristiwa / Misi
                  </label>
                  <select
                    value={formData.kategori_poi || 'OBSERVATION'}
                    onChange={(e) =>
                      setFormData({ ...formData, kategori_poi: e.target.value as PoiCategory })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="OBSERVATION">OBSERVATION — Bentang Alam &amp; Sejarah Peradaban</option>
                    <option value="SURFACE_LANDING">SURFACE_LANDING — Pendaratan Permukaan</option>
                    <option value="ORBITAL_FLYBY">ORBITAL_FLYBY — Lintas Wahana / Orbit</option>
                  </select>
                </div>

                {/* Babak / Era Sejarah / Topik Bahasan */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {(formData.planet_id || 'earth') === 'earth'
                      ? 'Zaman Baku (Filter Tingkat 1 Bumi)'
                      : 'Topik Bahasan / Era Sejarah Planet'}
                  </label>
                  {(formData.planet_id || 'earth') === 'earth' ? (
                    <select
                      value={formData.era_label || EARTH_ERA_OPTIONS[0]}
                      onChange={(e) => setFormData({ ...formData, era_label: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-600 focus:outline-none"
                    >
                      {!(EARTH_ERA_OPTIONS as readonly string[]).includes(formData.era_label || '') &&
                        formData.era_label && (
                          <option value={formData.era_label}>
                            {formData.era_label} (Nilai Kustom)
                          </option>
                        )}
                      {EARTH_ERA_OPTIONS.map((era) => (
                        <option key={era} value={era}>
                          {era}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.era_label || ''}
                      onChange={(e) => setFormData({ ...formData, era_label: e.target.value })}
                      placeholder="misal: Sejarah Geologi / Fenomena Kutub / Misi Robotik"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  )}
                </div>

                {/* Tahun Kejadian */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun Filter Urutan (Gunakan angka negatif untuk SM/Prasejarah, misal -2560 untuk 2560 SM)
                  </label>
                  <input
                    type="number"
                    step={1}
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Preview Tahun:{' '}
                    <strong className="text-blue-600 font-mono">
                      {yearInput.trim() !== '' && !Number.isNaN(Number(yearInput))
                        ? formatYearDisplay(Number(yearInput))
                        : '-'}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Judul Singkat List Card */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Singkat Kartu List <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.judul || ''}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  placeholder="misal: Gunung Everest / Tenggelamnya RMS Titanic"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Deskripsi Singkat untuk List Card (1 Kalimat) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Singkat untuk List Card (1 Kalimat) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.ringkasan_singkat || ''}
                  onChange={(e) => setFormData({ ...formData, ringkasan_singkat: e.target.value })}
                  placeholder="1 kalimat ringkas yang tampil di kartu daftar siswa sebelum tombol Detail diklik..."
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Fakta Lokasi, Tinggi & Ukuran (Modal Detail) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fakta Lokasi, Tinggi &amp; Ukuran (Modal Detail)
                </label>
                <input
                  type="text"
                  value={formData.nama_wahana || ''}
                  onChange={(e) => setFormData({ ...formData, nama_wahana: e.target.value })}
                  placeholder="misal: Perbatasan Nepal–Tibet • Puncak 8.848,86 m di atas permukaan laut"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* URL Foto / Gambar Peristiwa & Upload Supabase Storage */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  URL Foto / Gambar Peristiwa (Ilustrasi Sejarah)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={formData.gambar_url || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, gambar_url: e.target.value });
                        setPreviewBroken(false);
                      }}
                      placeholder="https://..., /images/..., atau klik tombol Upload Foto"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 text-xs font-semibold text-blue-700 transition-colors shrink-0 disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-blue-600" />
                        <span>Upload Foto</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Mendukung gambar JPG, PNG, WebP (maks. 5MB). Otomatis disimpan ke bucket{' '}
                  <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">
                    astrosphere-assets/history/
                  </code>
                  .
                </p>

                {/* Live Thumbnail Image Preview dengan Fallback Ikon */}
                {formData.gambar_url && (
                  <div className="relative mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center gap-3">
                    <div className="h-16 w-24 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                      {!previewBroken ? (
                        <img
                          src={formData.gambar_url}
                          alt="Pratinjau Foto Peristiwa"
                          className="h-full w-full object-cover"
                          onError={() => setPreviewBroken(true)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon className="h-5 w-5" />
                          <span className="text-[9px] mt-0.5">Gambar error</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-semibold text-slate-800">
                        {previewBroken ? 'URL Gambar Tidak Dapat Dimuat' : 'Pratinjau Gambar Aktif'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                        {formData.gambar_url}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, gambar_url: '' });
                        setPreviewBroken(false);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Hapus foto"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Penjelasan Lengkap Sejarah, Sains, &amp; Keberadaannya Saat Ini
                </label>
                <textarea
                  rows={3}
                  value={formData.deskripsi || ''}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  required
                  placeholder="Penjelasan latar belakang sejarah, bentang alam, pencapaian sains, dan dampaknya bagi peradaban atau eksplorasi antariksa."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Sumber Referensi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sumber Referensi Ilmiah
                </label>
                <input
                  type="text"
                  value={formData.sumber_referensi || ''}
                  onChange={(e) => setFormData({ ...formData, sumber_referensi: e.target.value })}
                  placeholder="misal: UNESCO World Heritage / NASA Planetary Fact Sheet / Nature"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              </div>

              {modalViewMode === 'PREVIEW' && (() => {
                const parsedYear =
                  yearInput.trim() !== '' &&
                  !Number.isNaN(Number(yearInput)) &&
                  Number.isInteger(Number(yearInput))
                    ? Number(yearInput)
                    : 0;
                const planetMeta = getPlanetBadgeStyle(formData.planet_id || 'earth');
                const trimImg = (formData.gambar_url || '').trim();
                const shortSummary =
                  (formData.ringkasan_singkat || '').trim() ||
                  'Ringkasan 1 kalimat untuk List Card akan tampil di sini.';

                return (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-inner space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                        <HistoryIcon className="h-3.5 w-3.5" />
                        <span>
                          {previewDetailOpen
                            ? 'Pratinjau Modal Detail Siswa'
                            : 'Pratinjau Alur List Card -> Detail Siswa'}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                        <span className={`h-1.5 w-1.5 rounded-full ${planetMeta.dot}`} />
                        Planet {planetMeta.label} • {formData.kategori_poi || 'OBSERVATION'}
                      </span>
                    </div>

                    {!previewDetailOpen ? (
                      /* Step 1: List Card View */
                      <div className="rounded-xl border border-cyan-500/25 bg-slate-900/90 p-3.5 flex flex-col sm:flex-row gap-3.5 items-start">
                        <div className="h-24 w-full sm:w-28 rounded-lg border border-slate-700/80 bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center">
                          {trimImg && !previewBroken ? (
                            <img
                              src={trimImg}
                              alt={formData.judul || 'Ilustrasi Sejarah'}
                              className="h-full w-full object-cover"
                              onError={() => setPreviewBroken(true)}
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded bg-cyan-500/15 border border-cyan-400/30 px-2 py-0.5 text-[10px] font-bold font-mono text-cyan-300">
                              {formatYearDisplay(parsedYear)}
                            </span>
                            <span className="rounded-full bg-indigo-500/15 border border-indigo-400/30 px-2 py-0.5 text-[10px] font-medium text-indigo-200">
                              {(formData.era_label || '').trim() || EARTH_ERA_OPTIONS[0]}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold leading-snug text-white">
                            {(formData.judul || '').trim() || 'Judul Singkat Belum Diisi'}
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                            {shortSummary}
                          </p>
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setPreviewDetailOpen(true)}
                              className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-3 py-1.5 text-[11px] font-bold text-slate-950 transition-colors shadow-sm"
                            >
                              <span>Detail</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Step 2: Modal Detail View */
                      <div className="rounded-xl border border-cyan-500/35 bg-slate-900/95 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDetailOpen(false)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition-colors"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Kembali ke List Card</span>
                          </button>
                          <span className="text-[10px] font-mono text-cyan-300">
                            Mode Modal Detail
                          </span>
                        </div>

                        {trimImg && !previewBroken ? (
                          <div className="relative overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950">
                            <img
                              src={trimImg}
                              alt={formData.judul || 'Ilustrasi Sejarah'}
                              className="h-44 w-full object-cover"
                              onError={() => setPreviewBroken(true)}
                            />
                          </div>
                        ) : (
                          <div className="flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/60 text-slate-500 text-xs gap-1.5">
                            <ImageIcon className="h-5 w-5 text-slate-600" />
                            <span>
                              {trimImg && previewBroken
                                ? 'URL gambar tidak dapat dimuat di pratinjau'
                                : 'Belum ada foto ilustrasi (opsional)'}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-cyan-500/15 border border-cyan-400/30 px-2.5 py-1 text-xs font-bold font-mono text-cyan-300">
                            {formatYearDisplay(parsedYear)}
                          </span>
                          <span className="rounded-full bg-indigo-500/15 border border-indigo-400/30 px-2.5 py-0.5 text-[11px] font-medium text-indigo-200">
                            {(formData.era_label || '').trim() || EARTH_ERA_OPTIONS[0]}
                          </span>
                        </div>

                        <h4 className="text-base font-bold leading-snug text-white">
                          {(formData.judul || '').trim() || 'Judul Singkat Belum Diisi'}
                        </h4>

                        {formData.nama_wahana?.trim() && (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-amber-300">
                            <Rocket className="h-3.5 w-3.5 shrink-0" />
                            <span>{formData.nama_wahana.trim()}</span>
                          </div>
                        )}

                        <p className="text-xs sm:text-sm leading-relaxed text-slate-300 whitespace-pre-line">
                          {(formData.deskripsi || '').trim() ||
                            'Penjelasan lengkap sejarah, sains, dan dampaknya bagi peradaban akan tampil di modal detail ini.'}
                        </p>

                        {formData.sumber_referensi?.trim() && (
                          <div className="pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
                            Sumber ilmiah:{' '}
                            <span className="text-slate-300 font-medium">
                              {formData.sumber_referensi.trim()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {!isAdding && editingEvent && (
                    <button
                      type="button"
                      onClick={() => setDeletingEvent(editingEvent)}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus Peristiwa</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving || uploadingImage}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Menyimpan...' : 'Simpan Data'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Custom (R-03) */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Peristiwa Sejarah?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus peristiwa{' '}
              <strong className="text-slate-900">"{deletingEvent.judul}"</strong>? Catatan peristiwa ini tidak akan lagi ditampilkan pada linimasa sejarah AstroSphere.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Massal CSV / JSON */}
      <BulkImportModal<ValidatedHistoryImportRow>
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Massal Peristiwa Sejarah & POI"
        description="Unggah file JSON atau CSV untuk menambah peristiwa baru sekaligus atau memperbarui peristiwa berdasarkan event_id UUID."
        columnsHint="planet_id, era_label, tahun_kejadian (negatif untuk SM), kategori_poi, judul, ringkasan_singkat, nama_wahana, deskripsi, gambar_url, sumber_referensi, [event_id opsional]"
        onDownloadCsvTemplate={handleDownloadCsvTemplate}
        onDownloadJsonTemplate={handleDownloadJsonTemplate}
        validateRecords={validateHistoryImportRows}
        onImportConfirm={handleImportHistoryConfirm}
        renderPreviewRow={(row) => {
          const planetBadge = getPlanetBadgeStyle(row.planet_id);
          return (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0 ${planetBadge.bg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${planetBadge.dot}`} />
                  {planetBadge.label}
                </span>
                <span className="font-mono text-slate-600 text-[11px] shrink-0">
                  {formatYearDisplay(row.tahun_kejadian)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{row.judul}</p>
                  <p className="text-[11px] text-slate-500 truncate">{row.ringkasan_singkat}</p>
                </div>
              </div>
              {row.event_id ? (
                <span className="rounded bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
                  Perbarui (Upsert)
                </span>
              ) : (
                <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
                  Tambah Baru
                </span>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
