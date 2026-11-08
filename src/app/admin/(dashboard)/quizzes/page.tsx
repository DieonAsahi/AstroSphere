'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
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
        .order('created_at', { ascending: true });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.soal.trim() || !formData.pembahasan_edukatif.trim()) return;

    if (formData.opsi.some((opt) => !opt.trim())) {
      setNotification({
        type: 'error',
        message: 'Keempat opsi jawaban (A, B, C, D) wajib diisi.',
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
          message: 'Soal kuis berhasil diperbarui di Supabase.',
        });
      } else {
        const { data, error } = await supabase
          .from('questions')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        setQuestions((prev) => [...prev, data as Question]);
        setNotification({
          type: 'success',
          message: `Soal kuis baru berhasil ditambahkan untuk ${payload.planet_id}.`,
        });
      }

      setModalOpen(false);
    } catch (err: unknown) {
      console.error('Error saving question:', err);
      setNotification({
        type: 'error',
        message: 'Gagal menyimpan soal kuis. Pastikan semua field telah diisi.',
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
        message: 'Gagal menghapus soal kuis dari Supabase.',
      });
    } finally {
      setSaving(false);
    }
  };

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
        <div className="flex items-center gap-3 shrink-0">
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
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Soal</span>
          </button>
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
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-44 sm:w-56"
            />
          </div>
        </div>

        {/* Total Questions Badge */}
        <div className="shrink-0 flex items-center justify-end">
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
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredQuestions.map((q) => {
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
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
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
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
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

                {/* Bobot Poin */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Bobot Hadiah Poin
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    step={10}
                    value={formData.bobot_poin}
                    onChange={(e) => setFormData({ ...formData, bobot_poin: Number(e.target.value) })}
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
                    Pilihan Jawaban (A, B, C, D) & Kunci Benar
                  </label>
                  <span className="text-xs text-slate-400">Pilih radio untuk menentukan kunci</span>
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

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
    </div>
  );
}
