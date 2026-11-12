'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Check,
  ShieldCheck,
  HelpCircle,
  Award,
  Download,
  Upload,
  Eye,
  FileJson,
  FileSpreadsheet,
  BookOpen,
  Trophy,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import { formatSupabaseError } from '../../../../lib/supabase/adminAuth';
import {
  exportAsCsv,
  exportAsJson,
  isValidUuid,
} from '../../../../lib/utils/importExport';
import {
  BulkImportModal,
  type BulkImportValidationResult,
} from '../../../../components/admin/BulkImportModal';
import type { Question, PlanetSlug } from '../../../../types/database';

const PLANET_OPTIONS: { id: PlanetSlug; label: string; dotColor: string; badgeBg: string }[] = [
  { id: 'mercury', label: 'Merkurius', dotColor: 'bg-slate-400', badgeBg: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'venus', label: 'Venus', dotColor: 'bg-amber-500', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'earth', label: 'Bumi', dotColor: 'bg-blue-500', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'mars', label: 'Mars', dotColor: 'bg-red-500', badgeBg: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'jupiter', label: 'Jupiter', dotColor: 'bg-purple-500', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'saturn', label: 'Saturnus', dotColor: 'bg-yellow-500', badgeBg: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { id: 'uranus', label: 'Uranus', dotColor: 'bg-teal-500', badgeBg: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'neptune', label: 'Neptunus', dotColor: 'bg-indigo-500', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const PLANET_ALIAS_MAP: Record<string, PlanetSlug> = {
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

const QUIZ_EXPORT_HEADERS = [
  'question_id',
  'planet_id',
  'soal',
  'opsi_a',
  'opsi_b',
  'opsi_c',
  'opsi_d',
  'kunci_jawaban',
  'bobot_poin',
  'pembahasan_edukatif',
];

interface ValidatedQuizImportRow {
  question_id?: string;
  planet_id: PlanetSlug;
  soal: string;
  opsi: [string, string, string, string];
  kunci_jawaban: number;
  pembahasan_edukatif: string;
  bobot_poin: number;
}

function matchesQuestionQuery(q: Question, query: string): boolean {
  if (!query) return true;
  const inOptions = Array.isArray(q.opsi)
    ? q.opsi.some((opt) => String(opt).toLowerCase().includes(query))
    : false;
  return (
    q.soal.toLowerCase().includes(query) ||
    q.pembahasan_edukatif.toLowerCase().includes(query) ||
    q.planet_id.toLowerCase().includes(query) ||
    inOptions
  );
}

export default function AdminQuizzesPage() {
  const { searchQuery: topSearchQuery = '' } = useOutletContext<{ searchQuery?: string }>() || {};
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedPlanet, setSelectedPlanet] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State (M-02)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalViewMode, setModalViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [previewSelectedOption, setPreviewSelectedOption] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    question_id?: string;
    planet_id: string;
    soal: string;
    opsi: [string, string, string, string];
    kunci_jawaban: number;
    pembahasan_edukatif: string;
    bobot_poin: string;
  }>({
    planet_id: 'earth',
    soal: '',
    opsi: ['', '', '', ''],
    kunci_jawaban: 0,
    pembahasan_edukatif: '',
    bobot_poin: '50',
  });

  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Alerts
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [modalError, setModalError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQuestions((data || []) as Question[]);
    } catch (err: unknown) {
      console.error('Error fetching questions:', err);
      setNotification({
        type: 'error',
        message: formatSupabaseError(err, 'Gagal memuat bank soal kuis dari Supabase'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Ringkasan distribusi jumlah soal & total poin per planet
  const planetDistribution = useMemo(() => {
    return PLANET_OPTIONS.map((planet) => {
      const planetQuestions = questions.filter((q) => q.planet_id === planet.id);
      const totalPoints = planetQuestions.reduce(
        (sum, q) => sum + (Number(q.bobot_poin) || 0),
        0
      );
      return {
        ...planet,
        count: planetQuestions.length,
        totalPoints,
      };
    });
  }, [questions]);

  const topQ = topSearchQuery.trim().toLowerCase();
  const localQ = searchQuery.trim().toLowerCase();

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedPlanet !== 'all' && q.planet_id !== selectedPlanet) return false;
      if (!matchesQuestionQuery(q, topQ)) return false;
      if (!matchesQuestionQuery(q, localQ)) return false;
      return true;
    });
  }, [questions, selectedPlanet, topQ, localQ]);

  // Reset pagination saat filter berganti
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlanet, topQ, localQ]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / itemsPerPage));
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQuestions.slice(start, start + itemsPerPage);
  }, [filteredQuestions, currentPage, itemsPerPage]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setModalViewMode('EDIT');
    setPreviewSelectedOption(null);
    setModalError(null);
    setFormData({
      planet_id: selectedPlanet !== 'all' ? selectedPlanet : 'earth',
      soal: '',
      opsi: ['', '', '', ''],
      kunci_jawaban: 0,
      pembahasan_edukatif: '',
      bobot_poin: '50',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setIsEditing(true);
    setModalViewMode('EDIT');
    setPreviewSelectedOption(null);
    setModalError(null);
    const parsedOptions = Array.isArray(q.opsi) ? q.opsi : ['', '', '', ''];
    setFormData({
      question_id: q.question_id,
      planet_id: q.planet_id,
      soal: q.soal,
      opsi: [
        parsedOptions[0] || '',
        parsedOptions[1] || '',
        parsedOptions[2] || '',
        parsedOptions[3] || '',
      ],
      kunci_jawaban: q.kunci_jawaban,
      pembahasan_edukatif: q.pembahasan_edukatif,
      bobot_poin: String(Number(q.bobot_poin) || 50),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.soal.trim()) {
      setModalError('Teks pertanyaan kuis wajib diisi.');
      return;
    }

    const trimmedOptions = formData.opsi.map((opt) => opt.trim());
    if (trimmedOptions.some((opt) => !opt)) {
      setModalError('Keempat opsi jawaban (A, B, C, D) wajib diisi dan tidak boleh hanya spasi.');
      return;
    }

    // Validasi cegah opsi kembar identik (case-insensitive)
    const lowerOptions = trimmedOptions.map((opt) => opt.toLowerCase());
    if (new Set(lowerOptions).size < trimmedOptions.length) {
      setModalError(
        'Terdapat pilihan jawaban yang kembar identik. Pastikan opsi A, B, C, dan D berbeda satu sama lain.'
      );
      return;
    }

    const parsedPoints = Number(formData.bobot_poin);
    if (
      formData.bobot_poin.trim() === '' ||
      Number.isNaN(parsedPoints) ||
      !Number.isInteger(parsedPoints) ||
      parsedPoints < 1 ||
      parsedPoints > 500
    ) {
      setModalError('Bobot hadiah poin harus berupa bilangan bulat antara 1 s/d 500.');
      return;
    }

    if (!formData.pembahasan_edukatif.trim()) {
      setModalError('Pembahasan edukatif wajib diisi untuk mendampingi umpan balik siswa.');
      return;
    }

    const parsedKey = Number(formData.kunci_jawaban);
    if (!Number.isInteger(parsedKey) || parsedKey < 0 || parsedKey > 3) {
      setModalError('Kunci jawaban harus dipilih antara opsi A, B, C, atau D.');
      return;
    }

    try {
      setSaving(true);
      setNotification(null);

      const payload = {
        planet_id: formData.planet_id,
        soal: formData.soal.trim(),
        opsi: trimmedOptions,
        kunci_jawaban: parsedKey,
        pembahasan_edukatif: formData.pembahasan_edukatif.trim(),
        bobot_poin: parsedPoints,
      };

      if (isEditing && formData.question_id) {
        const { data, error } = await supabase
          .from('questions')
          .update(payload)
          .eq('question_id', formData.question_id)
          .select('question_id')
          .single();

        if (error) throw error;
        if (!data) {
          throw new Error('Perubahan soal kuis tidak tersimpan di database.');
        }

        setNotification({
          type: 'success',
          message: 'Soal kuis berhasil diperbarui di Supabase.',
        });
      } else {
        const { data, error } = await supabase
          .from('questions')
          .insert([payload])
          .select('question_id')
          .single();

        if (error) throw error;
        if (!data) {
          throw new Error('Soal kuis baru gagal dikonfirmasi oleh database.');
        }

        setNotification({
          type: 'success',
          message: `Soal kuis baru berhasil ditambahkan untuk ${payload.planet_id}.`,
        });
      }

      setModalOpen(false);
      setModalError(null);
      await fetchQuestions();
    } catch (err: unknown) {
      console.error('Error saving question:', err);
      setModalError(
        formatSupabaseError(
          err,
          'Gagal menyimpan soal kuis. Pastikan semua field telah diisi dengan benar'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingQuestion) return;

    try {
      setSaving(true);
      const { data: deletedRows, error } = await supabase
        .from('questions')
        .delete()
        .eq('question_id', deletingQuestion.question_id)
        .select('question_id');

      if (error) throw error;
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error(
          'Soal kuis tidak ditemukan atau penghapusan ditolak oleh kebijakan RLS Supabase.'
        );
      }

      setNotification({
        type: 'success',
        message: 'Soal kuis berhasil dihapus dari Supabase.',
      });
      setDeletingQuestion(null);
      await fetchQuestions();
    } catch (err: unknown) {
      console.error('Error deleting question:', err);
      setDeletingQuestion(null);
      setNotification({
        type: 'error',
        message: formatSupabaseError(err, 'Gagal menghapus soal kuis dari Supabase'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportJson = () => {
    setExportMenuOpen(false);
    if (filteredQuestions.length === 0) {
      setNotification({
        type: 'error',
        message: 'Tidak ada soal kuis pada filter saat ini untuk diekspor.',
      });
      return;
    }
    const payload = filteredQuestions.map((q) => ({
      question_id: q.question_id,
      planet_id: q.planet_id,
      soal: q.soal,
      opsi: Array.isArray(q.opsi) ? q.opsi : [],
      kunci_jawaban: q.kunci_jawaban,
      bobot_poin: Number(q.bobot_poin) || 50,
      pembahasan_edukatif: q.pembahasan_edukatif,
    }));
    exportAsJson(payload, 'astrosphere-quizzes.json');
    setNotification({
      type: 'success',
      message: `${payload.length} soal kuis berhasil diekspor ke file JSON.`,
    });
  };

  const handleExportCsv = () => {
    setExportMenuOpen(false);
    if (filteredQuestions.length === 0) {
      setNotification({
        type: 'error',
        message: 'Tidak ada soal kuis pada filter saat ini untuk diekspor.',
      });
      return;
    }
    const rows = filteredQuestions.map((q) => {
      const opts = Array.isArray(q.opsi) ? q.opsi : [];
      return {
        question_id: q.question_id,
        planet_id: q.planet_id,
        soal: q.soal,
        opsi_a: opts[0] ?? '',
        opsi_b: opts[1] ?? '',
        opsi_c: opts[2] ?? '',
        opsi_d: opts[3] ?? '',
        kunci_jawaban: q.kunci_jawaban,
        bobot_poin: Number(q.bobot_poin) || 50,
        pembahasan_edukatif: q.pembahasan_edukatif,
      };
    });
    exportAsCsv(QUIZ_EXPORT_HEADERS, rows, 'astrosphere-quizzes.csv');
    setNotification({
      type: 'success',
      message: `${rows.length} soal kuis berhasil diekspor ke file CSV.`,
    });
  };

  const handleDownloadCsvTemplate = () => {
    exportAsCsv(
      QUIZ_EXPORT_HEADERS,
      [
        {
          question_id: '',
          planet_id: 'earth',
          soal: 'Apa yang menyebabkan terjadinya pergantian musim di Bumi?',
          opsi_a: 'Jarak Bumi ke Matahari berubah drastis',
          opsi_b: 'Kemiringan sumbu rotasi Bumi sekitar 23,5 derajat',
          opsi_c: 'Perubahan kecepatan rotasi Bulan',
          opsi_d: 'Aktivitas pasang surut atmosfer luar',
          kunci_jawaban: 'B',
          bobot_poin: 50,
          pembahasan_edukatif:
            'Kemiringan sumbu Bumi 23,5 derajat membuat belahan utara dan selatan menerima intensitas sinar Matahari berbeda sepanjang orbit tahunannya.',
        },
        {
          question_id: '',
          planet_id: 'mars',
          soal: 'Mengapa permukaan planet Mars tampak berwarna kemerahan?',
          opsi_a: 'Dipenuhi lahar cair di seluruh permukaan',
          opsi_b: 'Kandungan oksida besi (karat) yang tinggi pada debu dan batuan',
          opsi_c: 'Pantulan cahaya cincin asteroid merah',
          opsi_d: 'Suhu permukaan melebihi 400 derajat Celsius',
          kunci_jawaban: 1,
          bobot_poin: 50,
          pembahasan_edukatif:
            'Tanah Mars kaya akan mineral besi yang mengalami oksidasi, menciptakan lapisan debu oksida besi berwarna karat merah.',
        },
      ],
      'template-import-kuis-astrosphere.csv',
    );
  };

  const handleDownloadJsonTemplate = () => {
    exportAsJson(
      [
        {
          planet_id: 'earth',
          soal: 'Apa yang menyebabkan terjadinya pergantian musim di Bumi?',
          opsi: [
            'Jarak Bumi ke Matahari berubah drastis',
            'Kemiringan sumbu rotasi Bumi sekitar 23,5 derajat',
            'Perubahan kecepatan rotasi Bulan',
            'Aktivitas pasang surut atmosfer luar',
          ],
          kunci_jawaban: 1,
          bobot_poin: 50,
          pembahasan_edukatif:
            'Kemiringan sumbu Bumi 23,5 derajat membuat belahan utara dan selatan menerima intensitas sinar Matahari berbeda sepanjang orbit tahunannya.',
        },
      ],
      'template-import-kuis-astrosphere.json',
    );
  };

  const validateQuizImportRows = (
    records: Array<Record<string, unknown>>,
  ): BulkImportValidationResult<ValidatedQuizImportRow> => {
    const validRows: ValidatedQuizImportRow[] = [];
    const errors: string[] = [];

    records.forEach((raw, idx) => {
      const rowNum = idx + 1;
      const rawPlanet = String(raw.planet_id ?? '').trim().toLowerCase();
      const mappedPlanet = PLANET_ALIAS_MAP[rawPlanet];
      if (!mappedPlanet) {
        errors.push(
          `Baris ${rowNum}: planet_id "${String(raw.planet_id ?? '')}" tidak dikenali (gunakan slug planet seperti earth, mars, jupiter, dst.).`,
        );
        return;
      }

      const soal = String(raw.soal ?? '').trim();
      if (!soal) {
        errors.push(`Baris ${rowNum}: teks pertanyaan (soal) wajib diisi.`);
        return;
      }

      let rawOptions: unknown[] = [];
      if (Array.isArray(raw.opsi)) {
        rawOptions = raw.opsi;
      } else if (typeof raw.opsi === 'string' && raw.opsi.trim().startsWith('[')) {
        try {
          const parsedArr = JSON.parse(raw.opsi);
          if (Array.isArray(parsedArr)) rawOptions = parsedArr;
        } catch {
          rawOptions = [];
        }
      } else {
        rawOptions = [raw.opsi_a, raw.opsi_b, raw.opsi_c, raw.opsi_d];
      }

      if (rawOptions.length !== 4) {
        errors.push(`Baris ${rowNum}: harus memiliki tepat 4 pilihan jawaban (opsi_a s/d opsi_d atau array opsi).`);
        return;
      }

      const trimmedOpts = rawOptions.map((o) => String(o ?? '').trim());
      if (trimmedOpts.some((o) => !o)) {
        errors.push(`Baris ${rowNum}: keempat opsi jawaban (A, B, C, D) wajib diisi lengkap.`);
        return;
      }

      if (new Set(trimmedOpts.map((o) => o.toLowerCase())).size < 4) {
        errors.push(`Baris ${rowNum}: ditemukan pilihan jawaban kembar identik antar opsi A-D.`);
        return;
      }

      const rawKey = String(raw.kunci_jawaban ?? '').trim().toUpperCase();
      let kunciIdx = -1;
      if (rawKey === '0' || rawKey === 'A') kunciIdx = 0;
      else if (rawKey === '1' || rawKey === 'B') kunciIdx = 1;
      else if (rawKey === '2' || rawKey === 'C') kunciIdx = 2;
      else if (rawKey === '3' || rawKey === 'D') kunciIdx = 3;

      if (kunciIdx < 0 || kunciIdx > 3) {
        errors.push(
          `Baris ${rowNum}: kunci_jawaban "${String(raw.kunci_jawaban ?? '')}" tidak valid (isi 0-3 atau A-D).`,
        );
        return;
      }

      const rawPoinStr = raw.bobot_poin !== undefined && raw.bobot_poin !== null && String(raw.bobot_poin).trim() !== ''
        ? String(raw.bobot_poin).trim()
        : '50';
      const bobotPoin = Number(rawPoinStr);
      if (Number.isNaN(bobotPoin) || !Number.isInteger(bobotPoin) || bobotPoin < 1 || bobotPoin > 500) {
        errors.push(`Baris ${rowNum}: bobot_poin "${rawPoinStr}" harus bilangan bulat antara 1 s/d 500.`);
        return;
      }

      const pembahasan = String(raw.pembahasan_edukatif ?? '').trim();
      if (!pembahasan) {
        errors.push(`Baris ${rowNum}: pembahasan_edukatif wajib diisi.`);
        return;
      }

      const rawId = raw.question_id !== undefined && raw.question_id !== null ? String(raw.question_id).trim() : '';
      if (rawId && !isValidUuid(rawId)) {
        errors.push(`Baris ${rowNum}: question_id "${rawId}" bukan UUID yang valid (kosongkan untuk soal baru).`);
        return;
      }

      validRows.push({
        ...(rawId ? { question_id: rawId } : {}),
        planet_id: mappedPlanet,
        soal,
        opsi: [trimmedOpts[0], trimmedOpts[1], trimmedOpts[2], trimmedOpts[3]],
        kunci_jawaban: kunciIdx,
        pembahasan_edukatif: pembahasan,
        bobot_poin: bobotPoin,
      });
    });

    return { validRows, errors };
  };

  const handleImportQuizConfirm = async (rows: ValidatedQuizImportRow[]) => {
    const upsertRows = rows.filter((row) => Boolean(row.question_id));
    const insertRows = rows
      .filter((row) => !row.question_id)
      .map(({ question_id: _omitted, ...rest }) => {
        void _omitted;
        return rest;
      });

    if (upsertRows.length > 0) {
      const { data, error } = await supabase
        .from('questions')
        .upsert(upsertRows, { onConflict: 'question_id' })
        .select('question_id');
      if (error) throw new Error(formatSupabaseError(error, 'Gagal memperbarui soal (upsert)'));
      if (!data || data.length === 0) {
        throw new Error('Tidak ada soal yang terbarui saat import upsert (periksa izin RLS).');
      }
    }

    if (insertRows.length > 0) {
      const { data, error } = await supabase
        .from('questions')
        .insert(insertRows)
        .select('question_id');
      if (error) throw new Error(formatSupabaseError(error, 'Gagal menambahkan soal baru'));
      if (!data || data.length === 0) {
        throw new Error('Soal baru gagal disimpan saat import massal.');
      }
    }

    setNotification({
      type: 'success',
      message: `Import massal berhasil: ${rows.length} soal (${insertRows.length} baru, ${upsertRows.length} diperbarui) disimpan ke Supabase.`,
    });
    await fetchQuestions();
  };

  const activeFilterTags = [topSearchQuery.trim(), searchQuery.trim()].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-sm border ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section (Matching Mockup A05) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Kuis</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Kelola pertanyaan edukatif berbasis planet untuk evaluasi pemahaman siswa di AstroSphere.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchQuestions();
            }}
            disabled={refreshing}
            className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Muat ulang bank soal"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-500" />
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
                    <span>Export CSV ({filteredQuestions.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FileJson className="h-4 w-4 text-blue-600" />
                    <span>Export JSON ({filteredQuestions.length})</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Import Massal</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Soal</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Distribusi Soal & Total Poin per Planet */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Ringkasan Distribusi Soal &amp; Total Poin per Planet
          </span>
          {selectedPlanet !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedPlanet('all')}
              className="text-blue-600 hover:underline font-semibold text-[11px]"
            >
              Tampilkan Semua Planet
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {planetDistribution.map((planet) => {
            const isSelected = selectedPlanet === planet.id;
            const isEmpty = planet.count === 0;
            return (
              <button
                key={planet.id}
                type="button"
                onClick={() =>
                  setSelectedPlanet((prev) => (prev === planet.id ? 'all' : planet.id))
                }
                className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-xs'
                    : isEmpty
                    ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${planet.dotColor}`} />
                  <span className="text-xs font-bold text-slate-900 truncate">{planet.label}</span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-1 text-[11px]">
                  <span className={`font-semibold ${isEmpty ? 'text-amber-700' : 'text-slate-700'}`}>
                    {planet.count} soal
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {planet.totalPoints}p
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Card (Matching Mockup A05) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Filter Planet:</span>
          <select
            value={selectedPlanet}
            onChange={(e) => setSelectedPlanet(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="all">Semua Planet</option>
            {PLANET_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari materi soal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-44 sm:w-56"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Bersihkan pencarian kuis"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Total Questions Badge */}
        <div className="shrink-0 flex items-center justify-end gap-2">
          {topQ && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Header: "{topSearchQuery.trim()}"
            </span>
          )}
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            Menampilkan {filteredQuestions.length} Soal
          </span>
        </div>
      </div>

      {/* Questions Table (Matching Mockup A05) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm font-medium">Memuat bank soal kuis...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Tidak ada soal ditemukan</h3>
            <p className="text-xs text-slate-500 mt-1">
              Belum ada soal pada filter ini. Klik tombol Tambah Soal untuk membuat pertanyaan baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Pertanyaan</th>
                  <th className="py-3 px-6">Planet</th>
                  <th className="py-3 px-6">Bobot Poin</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedQuestions.map((q) => {
                  const planetInfo = PLANET_OPTIONS.find((p) => p.id === q.planet_id) || {
                    id: q.planet_id,
                    label: q.planet_id,
                    dotColor: 'bg-slate-400',
                    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  const optionsList = Array.isArray(q.opsi) ? q.opsi : [];
                  const correctOptionText =
                    optionsList[q.kunci_jawaban] !== undefined
                      ? optionsList[q.kunci_jawaban]
                      : `Opsi ${OPTION_LABELS[q.kunci_jawaban] || q.kunci_jawaban}`;

                  return (
                    <tr
                      key={q.question_id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Pertanyaan */}
                      <td className="py-4 px-6 max-w-xl">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {q.soal}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            {optionsList.length} Opsi Jawaban
                          </span>
                          <span>•</span>
                          <span>
                            Kunci Benar:{' '}
                            <strong className="text-slate-800 font-semibold">
                              {correctOptionText}
                            </strong>
                          </span>
                        </div>
                      </td>

                      {/* Planet Badge with Dot */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${planetInfo.badgeBg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${planetInfo.dotColor}`} />
                          {planetInfo.label}
                        </span>
                      </td>

                      {/* Bobot Poin Badge */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold font-mono text-amber-700">
                          <Award className="h-3.5 w-3.5 text-amber-500" />
                          <span>{Number(q.bobot_poin) || 0} Poin</span>
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleOpenEdit(q)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm hover:text-blue-600"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Ubah Soal</span>
                          </button>
                          <button
                            onClick={() => setDeletingQuestion(q)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Soal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer with Functional Pagination (M-02) */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Menampilkan {filteredQuestions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
            {Math.min(currentPage * itemsPerPage, filteredQuestions.length)} dari {filteredQuestions.length} soal
            {activeFilterTags.length > 0 && ` (difilter: "${activeFilterTags.join('", "')}")`}
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

      {/* Format Pedagogis Suportif Banner (Exact Match to Mockup A05) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">
            Format Pedagogis Suportif AstroSphere
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Seluruh soal kuis disusun tanpa pengurangan poin yang menekan. Saat siswa memilih opsi yang
            belum tepat, sistem otomatis menampilkan{' '}
            <strong className="text-slate-900 font-semibold">Pembahasan Edukatif</strong> untuk
            memperkuat wawasan astronomi secara berkelanjutan.
          </p>
        </div>
      </div>

      {/* Add / Edit Question Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isEditing ? 'Ubah Pertanyaan Kuis' : 'Tambah Pertanyaan Kuis Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi soal pilihan ganda, kunci jawaban, dan pembahasan edukatif.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setModalError(null);
                  setPreviewSelectedOption(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Mode Switch: Form Edit vs Pratinjau Layar Siswa */}
            <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-white">
              <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setModalViewMode('EDIT')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    modalViewMode === 'EDIT'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Form Edit Soal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewSelectedOption(null);
                    setModalViewMode('PREVIEW');
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    modalViewMode === 'PREVIEW'
                      ? 'bg-slate-900 text-cyan-300 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Pratinjau Layar Siswa</span>
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form noValidate onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Error Banner di Dalam Modal */}
              {modalError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{modalError}</div>
                  <button
                    type="button"
                    onClick={() => setModalError(null)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className={modalViewMode === 'EDIT' ? 'space-y-5' : 'hidden'}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Planet Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Planet Terkait
                  </label>
                  <select
                    value={formData.planet_id}
                    onChange={(e) => setFormData({ ...formData, planet_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  >
                    {PLANET_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bobot Poin (Fleksibel 1-500, tanpa step=10 kaku) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Bobot Hadiah Poin (1 – 500)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    step={1}
                    value={formData.bobot_poin}
                    onChange={(e) => setFormData({ ...formData, bobot_poin: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Soal Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Teks Pertanyaan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tuliskan pertanyaan astronomi yang memancing rasa ingin tahu siswa..."
                  value={formData.soal}
                  onChange={(e) => setFormData({ ...formData, soal: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 4 Opsi Jawaban with Correct Key Radio */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Pilihan Jawaban (A, B, C, D) &amp; Kunci Benar
                  </label>
                  <span className="text-xs text-slate-400">Keempat opsi harus unik</span>
                </div>

                <div className="space-y-2.5">
                  {formData.opsi.map((opt, idx) => {
                    const isKey = formData.kunci_jawaban === idx;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                          isKey
                            ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer shrink-0">
                          <input
                            type="radio"
                            name="kunci_jawaban"
                            checked={isKey}
                            onChange={() => setFormData({ ...formData, kunci_jawaban: idx })}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isKey
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {OPTION_LABELS[idx]}
                          </span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={`Jawaban opsi ${OPTION_LABELS[idx]}...`}
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...formData.opsi] as [string, string, string, string];
                            newOptions[idx] = e.target.value;
                            setFormData({ ...formData, opsi: newOptions });
                          }}
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {isKey && (
                          <span className="text-xs font-semibold text-blue-700 px-2 py-0.5 rounded bg-blue-100/70 shrink-0">
                            Kunci Jawaban
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pembahasan Edukatif */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pembahasan Edukatif (Feedback Saat Salah) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan fakta ilmiah mengapa kunci tersebut benar sehingga siswa tetap mendapat pelajaran bermakna..."
                  value={formData.pembahasan_edukatif}
                  onChange={(e) => setFormData({ ...formData, pembahasan_edukatif: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              </div>

              {modalViewMode === 'PREVIEW' && (() => {
                const planetMeta =
                  PLANET_OPTIONS.find((p) => p.id === formData.planet_id) || PLANET_OPTIONS[2];
                const parsedPoints = Number(formData.bobot_poin) || 0;
                const hasAnswered = previewSelectedOption !== null;
                const isAnswerCorrect = previewSelectedOption === formData.kunci_jawaban;

                return (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-inner space-y-4">
                    {/* HUD Quiz Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-300">
                          <Trophy className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            Pratinjau Kuis Siswa • {planetMeta.label}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Klik salah satu opsi A–D untuk mencoba simulasi umpan balik
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-500/15 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                          +{parsedPoints} Poin
                        </span>
                        {hasAnswered && (
                          <button
                            type="button"
                            onClick={() => setPreviewSelectedOption(null)}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-cyan-300 hover:bg-slate-800"
                          >
                            Reset Simulasi
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Soal 1 dari 1 (Live Preview)</span>
                        <span>Kunci Resmi: Opsi {OPTION_LABELS[formData.kunci_jawaban]}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" />
                      </div>
                    </div>

                    {/* Question Box */}
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                      <p className="text-sm font-semibold leading-relaxed text-white">
                        {formData.soal.trim() || 'Teks pertanyaan astronomi akan tampil di bagian ini...'}
                      </p>
                    </div>

                    {/* 4 Interactive Option Buttons */}
                    <div className="space-y-2">
                      {formData.opsi.map((opt, idx) => {
                        const isKey = idx === formData.kunci_jawaban;
                        const isSelected = previewSelectedOption === idx;

                        let cardCls =
                          'border-slate-800 bg-slate-900/90 text-slate-200 hover:border-cyan-500/50 hover:bg-slate-900';
                        let badgeCls = 'bg-slate-800 text-slate-300 border-slate-700';

                        if (hasAnswered) {
                          if (isKey) {
                            cardCls = 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100';
                            badgeCls = 'bg-emerald-500 text-slate-950 border-emerald-400';
                          } else if (isSelected) {
                            cardCls = 'border-rose-500/60 bg-rose-500/15 text-rose-100';
                            badgeCls = 'bg-rose-500 text-white border-rose-400';
                          } else {
                            cardCls = 'border-slate-800/60 bg-slate-950/60 text-slate-500 opacity-70';
                          }
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewSelectedOption(idx)}
                            className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left text-xs sm:text-sm transition-all ${cardCls}`}
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${badgeCls}`}
                            >
                              {OPTION_LABELS[idx]}
                            </span>
                            <span className="flex-1">
                              {opt.trim() || `(Opsi ${OPTION_LABELS[idx]} belum diisi)`}
                            </span>
                            {hasAnswered && isKey && (
                              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Educational Feedback Card */}
                    <div
                      className={`rounded-xl border p-4 space-y-1.5 ${
                        !hasAnswered
                          ? 'border-cyan-500/25 bg-slate-900/70 text-slate-300'
                          : isAnswerCorrect
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <BookOpen className="h-4 w-4 shrink-0 text-cyan-300" />
                        <span>
                          {!hasAnswered
                            ? 'Pratinjau Kotak Pembahasan Edukatif'
                            : isAnswerCorrect
                              ? `Tepat Sekali! Siswa mendapat +${parsedPoints} Poin`
                              : 'Hampir Tepat — Pembahasan Suportif Ditampilkan'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-300">
                        {formData.pembahasan_edukatif.trim() ||
                          'Pembahasan ilmiah akan tampil di sini saat siswa menjawab pertanyaan.'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setModalError(null);
                    setPreviewSelectedOption(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Soal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Soal Kuis?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus pertanyaan ini dari bank soal{' '}
              <strong className="text-slate-900 font-semibold">{deletingQuestion.planet_id}</strong>?
            </p>
            <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200 line-clamp-2">
              "{deletingQuestion.soal}"
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingQuestion(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
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

      {/* Modal Import Massal CSV / JSON Soal Kuis */}
      <BulkImportModal<ValidatedQuizImportRow>
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Massal Soal Kuis"
        description="Unggah file JSON atau CSV untuk menambahkan bank soal secara batch atau memperbarui soal yang sudah memiliki question_id UUID."
        columnsHint="planet_id, soal, opsi_a, opsi_b, opsi_c, opsi_d (atau array opsi di JSON), kunci_jawaban (0-3 atau A-D), bobot_poin (1-500), pembahasan_edukatif, [question_id opsional]"
        onDownloadCsvTemplate={handleDownloadCsvTemplate}
        onDownloadJsonTemplate={handleDownloadJsonTemplate}
        validateRecords={validateQuizImportRows}
        onImportConfirm={handleImportQuizConfirm}
        renderPreviewRow={(row, idx) => {
          const planetMeta =
            PLANET_OPTIONS.find((p) => p.id === row.planet_id) || PLANET_OPTIONS[2];
          return (
            <tr key={row.question_id ?? `${row.planet_id}-${idx}`} className="bg-white">
              <td className="px-3 py-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${planetMeta.badgeBg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${planetMeta.dotColor}`} />
                  {planetMeta.label}
                </span>
              </td>
              <td className="px-3 py-2 font-medium text-slate-900 max-w-xs truncate">
                {row.soal}
              </td>
              <td className="px-3 py-2 text-slate-700 font-semibold whitespace-nowrap">
                Opsi {OPTION_LABELS[row.kunci_jawaban]} • +{row.bobot_poin} Poin
              </td>
              <td className="px-3 py-2">
                {row.question_id ? (
                  <span className="rounded bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold">
                    Perbarui (Upsert)
                  </span>
                ) : (
                  <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold">
                    Tambah Baru
                  </span>
                )}
              </td>
            </tr>
          );
        }}
      />
    </div>
  );
}
