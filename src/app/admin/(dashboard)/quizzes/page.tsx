'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Award,
  Eye,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import type { Question, PlanetSlug } from '../../../../types/database';

const PLANET_OPTIONS: { id: PlanetSlug; label: string }[] = [
  { id: 'mercury', label: 'Merkurius' },
  { id: 'venus', label: 'Venus' },
  { id: 'earth', label: 'Bumi' },
  { id: 'mars', label: 'Mars' },
  { id: 'jupiter', label: 'Jupiter' },
  { id: 'saturn', label: 'Saturnus' },
  { id: 'uranus', label: 'Uranus' },
  { id: 'neptune', label: 'Neptunus' },
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function AdminQuizzesPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedPlanet, setSelectedPlanet] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<{
    question_id?: string;
    planet_id: string;
    soal: string;
    opsi: [string, string, string, string];
    kunci_jawaban: number;
    pembahasan_edukatif: string;
    bobot_poin: number;
  }>({
    planet_id: 'earth',
    soal: '',
    opsi: ['', '', '', ''],
    kunci_jawaban: 0,
    pembahasan_edukatif: '',
    bobot_poin: 50,
  });

  // Preview Modal State (PRD R10)
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [previewSelectedOption, setPreviewSelectedOption] = useState<number | null>(null);

  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);

  // Alerts
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchQuestions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions((data || []) as Question[]);
    } catch (err: unknown) {
      console.error('Error fetching questions:', err);
      setNotification({
        type: 'error',
        message: 'Gagal memuat bank soal kuis dari Supabase.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedPlanet !== 'all' && q.planet_id !== selectedPlanet) return false;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchSoal = q.soal.toLowerCase().includes(query);
        const matchPembahasan = q.pembahasan_edukatif.toLowerCase().includes(query);
        if (!matchSoal && !matchPembahasan) return false;
      }
      return true;
    });
  }, [questions, selectedPlanet, searchQuery]);

  // Total Poin pada planet yang difilter
  const selectedPlanetTotalPoints = useMemo(() => {
    return filteredQuestions.reduce((sum, q) => sum + (Number(q.bobot_poin) || 50), 0);
  }, [filteredQuestions]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      planet_id: selectedPlanet !== 'all' ? selectedPlanet : 'earth',
      soal: '',
      opsi: ['', '', '', ''],
      kunci_jawaban: 0,
      pembahasan_edukatif: '',
      bobot_poin: 50,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setIsEditing(true);
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
      bobot_poin: Number(q.bobot_poin) || 50,
    });
    setModalOpen(true);
  };

  const handleOpenPreview = (q: Question) => {
    setPreviewQuestion(q);
    setPreviewSelectedOption(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.soal.trim() || !formData.pembahasan_edukatif.trim()) return;

    if (formData.opsi.some((opt) => !opt.trim())) {
      setNotification({
        type: 'error',
        message: 'Keempat pilihan jawaban (A, B, C, D) wajib diisi.',
      });
      return;
    }

    try {
      setSaving(true);
      setNotification(null);

      const payload = {
        planet_id: formData.planet_id,
        soal: formData.soal.trim(),
        opsi: formData.opsi.map((opt) => opt.trim()),
        kunci_jawaban: Number(formData.kunci_jawaban),
        pembahasan_edukatif: formData.pembahasan_edukatif.trim(),
        bobot_poin: Number(formData.bobot_poin) || 50,
      };

      if (isEditing && formData.question_id) {
        const { data, error } = await supabase
          .from('questions')
          .update(payload)
          .eq('question_id', formData.question_id)
          .select()
          .single();

        if (error) throw error;

        setQuestions((prev) =>
          prev.map((q) => (q.question_id === formData.question_id ? (data as Question) : q))
        );
        setNotification({
          type: 'success',
          message: 'Soal kuis berhasil diperbarui.',
        });
      } else {
        const { data, error } = await supabase
          .from('questions')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        setQuestions((prev) => [data as Question, ...prev]);
        setNotification({
          type: 'success',
          message: `Soal kuis baru berhasil ditambahkan ke ${payload.planet_id}.`,
        });
      }

      setModalOpen(false);
    } catch (err: unknown) {
      console.error('Error saving question:', err);
      setNotification({
        type: 'error',
        message: 'Gagal menyimpan soal kuis. Pastikan form terisi dengan benar.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingQuestion) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('question_id', deletingQuestion.question_id);

      if (error) throw error;

      setQuestions((prev) => prev.filter((q) => q.question_id !== deletingQuestion.question_id));
      setNotification({
        type: 'success',
        message: 'Soal kuis berhasil dihapus.',
      });
      setDeletingQuestion(null);
    } catch (err: unknown) {
      console.error('Error deleting question:', err);
      setNotification({
        type: 'error',
        message: 'Gagal menghapus soal kuis.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Manajemen Bank Soal & Simulator Kartu Kuis
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
              PRD R10 & Bagian 9
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Kelola soal formatif, 4 opsi pilihan berganda, bobot poin, dan uji langsung tampilan feedback bebas tekanan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchQuestions();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Soal Baru</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border p-4 text-xs ${
            notification.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter Bar with Planet Points Summary */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4.5 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-400 shrink-0">Filter Planet:</label>
          <select
            value={selectedPlanet}
            onChange={(e) => setSelectedPlanet(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">Semua Planet ({questions.length} Soal)</option>
            {PLANET_OPTIONS.map((p) => {
              const count = questions.filter((q) => q.planet_id === p.id).length;
              return (
                <option key={p.id} value={p.id}>
                  {p.label} ({count} Soal)
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Badge Total Poin Terfilter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-mono text-amber-300">
            <Award className="h-4 w-4 text-amber-400" />
            <span className="font-bold">{selectedPlanetTotalPoints} Poin</span>
            <span className="text-[10px] text-amber-400/80">
              ({selectedPlanet === 'all' ? 'Tata Surya' : selectedPlanet})
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pertanyaan / materi..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table of Questions */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Planet</th>
                <th className="px-5 py-3 font-semibold">Soal Pertanyaan</th>
                <th className="px-5 py-3 font-semibold text-center">Kunci Jawaban</th>
                <th className="px-5 py-3 font-semibold text-center">Bobot</th>
                <th className="px-5 py-3 font-semibold">Pembahasan Edukatif</th>
                <th className="px-5 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      <span>Memuat bank soal...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Tidak ada soal kuis yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q) => {
                  const opts = Array.isArray(q.opsi) ? q.opsi : [];
                  const correctOptionText = opts[q.kunci_jawaban] || '-';

                  return (
                    <tr key={q.question_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 capitalize font-medium text-slate-300">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] border border-slate-700">
                          {q.planet_id}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-white max-w-xs">
                        <div className="line-clamp-2">{q.soal}</div>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono">
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300 font-bold border border-emerald-500/30">
                          {OPTION_LABELS[q.kunci_jawaban]}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[120px]">
                          {correctOptionText}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-amber-300 font-bold">
                        +{q.bobot_poin || 50}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 max-w-sm">
                        <p className="line-clamp-2 text-[11px] text-slate-400">
                          {q.pembahasan_edukatif}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Preview Kartu Kuis (PRD R10) */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(q)}
                            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 p-1.5 text-cyan-300 transition-colors"
                            title="Simulasi / Preview Kartu Kuis Siswa"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(q)}
                            className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 p-1.5 text-slate-300 hover:text-white transition-colors"
                            title="Edit Soal"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingQuestion(q)}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 p-1.5 text-red-400 hover:text-red-300 transition-colors"
                            title="Hapus Soal"
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
      </div>

      {/* Modal Tambah & Edit Soal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {isEditing ? 'Edit Soal Kuis Formatif' : 'Tambah Soal Kuis Baru'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sistem evaluasi kurikulum berbasis formative assessment bebas stres
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Planet */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Planet Terkait
                  </label>
                  <select
                    value={formData.planet_id}
                    onChange={(e) => setFormData({ ...formData, planet_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    {PLANET_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bobot Poin */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Bobot Poin (Standar PRD: 50 Poin)
                  </label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="100"
                    value={formData.bobot_poin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bobot_poin: parseInt(e.target.value) || 50,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Teks Pertanyaan */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Teks Pertanyaan Soal
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.soal}
                  onChange={(e) => setFormData({ ...formData, soal: e.target.value })}
                  placeholder="Ketik pertanyaan ilmiah..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* 4 Pilihan Jawaban (A, B, C, D) */}
              <div className="space-y-2.5">
                <label className="block text-xs font-medium text-slate-300">
                  4 Pilihan Jawaban & Penentu Kunci (Klik radio button untuk kunci):
                </label>

                {OPTION_LABELS.map((label, idx) => {
                  const isKey = formData.kunci_jawaban === idx;
                  return (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 transition-all ${
                        isKey
                          ? 'border-emerald-500/60 bg-emerald-950/20'
                          : 'border-slate-800 bg-slate-950/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, kunci_jawaban: idx })}
                        className={`flex h-6 w-6 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all ${
                          isKey
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                        title="Jadikan Kunci Jawaban Benar"
                      >
                        {label}
                      </button>

                      <input
                        type="text"
                        required
                        value={formData.opsi[idx]}
                        onChange={(e) => {
                          const newOpts = [...formData.opsi] as [string, string, string, string];
                          newOpts[idx] = e.target.value;
                          setFormData({ ...formData, opsi: newOpts });
                        }}
                        placeholder={`Teks pilihan jawaban ${label}...`}
                        className="flex-1 bg-transparent border-0 px-2 py-1 text-xs text-white focus:outline-none"
                      />

                      {isKey && (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 shrink-0">
                          KUNCI BENAR
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pembahasan Edukatif (PRD R10) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pembahasan Edukatif (Tampil otomatis saat siswa menjawab untuk pembelajaran bebas stres)
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.pembahasan_edukatif}
                  onChange={(e) =>
                    setFormData({ ...formData, pembahasan_edukatif: e.target.value })
                  }
                  placeholder="Jelaskan alasan ilmiah mengapa jawaban ini benar..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>{saving ? 'Menyimpan...' : 'Simpan Soal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SIMULASI / PREVIEW KARTU KUIS SISWA (PRD R10) */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Simulasi Kartu Kuis Siswa (PRD R10)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Planet: <span className="font-semibold capitalize text-cyan-300">{previewQuestion.planet_id}</span> &bull; {previewQuestion.bobot_poin} Poin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Soal */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs font-semibold text-white leading-relaxed">
                  {previewQuestion.soal}
                </p>
              </div>

              {/* 4 Opsi Interaktif */}
              <div className="space-y-2">
                {(Array.isArray(previewQuestion.opsi) ? previewQuestion.opsi : []).map(
                  (opt, idx) => {
                    const isSelected = previewSelectedOption === idx;
                    const isKey = previewQuestion.kunci_jawaban === idx;
                    const hasAnswered = previewSelectedOption !== null;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewSelectedOption(idx)}
                        className={`w-full flex items-center justify-between rounded-xl border p-3 text-left text-xs transition-all ${
                          hasAnswered && isKey
                            ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                            : hasAnswered && isSelected && !isKey
                            ? 'border-rose-500/60 bg-rose-500/10 text-rose-200'
                            : isSelected
                            ? 'border-cyan-500 bg-cyan-500/10 text-white font-semibold'
                            : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-800 font-mono text-[10px] text-slate-400">
                            {OPTION_LABELS[idx]}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {hasAnswered && isKey && (
                          <span className="text-[10px] font-bold text-emerald-400">BENAR</span>
                        )}
                        {hasAnswered && isSelected && !isKey && (
                          <span className="text-[10px] font-bold text-rose-400">SALAH</span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              {/* Pembahasan Edukatif Otomatis Muncul */}
              {previewSelectedOption !== null && (
                <div
                  className={`rounded-xl border p-4 text-xs leading-relaxed animate-in fade-in duration-200 ${
                    previewSelectedOption === previewQuestion.kunci_jawaban
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <BookOpen className="h-4 w-4" />
                    <span>
                      {previewSelectedOption === previewQuestion.kunci_jawaban
                        ? 'Tepat Sekali!'
                        : 'Umpan Balik Bebas Stres:'}
                    </span>
                  </div>
                  <p>{previewQuestion.pembahasan_edukatif}</p>
                </div>
              )}

              {/* Reset Uji Coba */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewSelectedOption(null)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Ulangi Simulasi Jawaban</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewQuestion(null)}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200"
                >
                  Tutup Simulator
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hapus Soal Kuis</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus soal ini dari planet {deletingQuestion.planet_id}?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-red-600/20"
              >
                {saving ? 'Menghapus...' : 'Ya, Hapus Soal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
