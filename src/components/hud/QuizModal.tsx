'use client';

import { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  Award,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { supabase } from '@/lib/supabase/client';
import { FALLBACK_QUESTIONS } from '@/data/fallbackMasterData';
import type { Question } from '@/types/database';

export function QuizModal() {
  const activePlanetId = useSceneStore((state) => state.activePlanetId);
  const mode = useSceneStore((state) => state.mode);
  const switchMode = useSceneStore((state) => state.switchMode);

  const quizBestScores = usePlayerStore((state) => state.quizBestScores);
  const submitQuizScore = usePlayerStore((state) => state.submitQuizScore);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [scoreEarned, setScoreEarned] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [rewardDelta, setRewardDelta] = useState<number | null>(null);

  // Ambil soal kuis dari Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadQuestions() {
      try {
        const { data } = await supabase
          .from('questions')
          .select('*')
          .eq('planet_id', activePlanetId);

        if (isMounted) {
          if (data && data.length > 0) {
            const formattedQuestions: Question[] = (data as unknown as Array<Question & { opsi: string[] }>).map((q) => ({
              ...q,
              opsi: Array.isArray(q.opsi) ? (q.opsi as string[]) : ['A', 'B', 'C', 'D'],
            }));
            setQuestions(formattedQuestions);
          } else {
            setQuestions(FALLBACK_QUESTIONS[activePlanetId] || FALLBACK_QUESTIONS.earth);
          }
        }
      } catch {
        if (isMounted) {
          setQuestions(FALLBACK_QUESTIONS[activePlanetId] || FALLBACK_QUESTIONS.earth);
        }
      }
    }

    if (mode === 'QUIZ') {
      loadQuestions();
      // Reset kuis state
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswerChecked(false);
      setScoreEarned(0);
      setIsFinished(false);
      setRewardDelta(null);

      // Realtime subscription ke tabel questions (M-03)
      const channel = supabase
        .channel(`public:realtime_questions_${activePlanetId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'questions', filter: `planet_id=eq.${activePlanetId}` },
          () => {
            loadQuestions();
          }
        )
        .subscribe();

      const handleFocus = () => loadQuestions();
      window.addEventListener('focus', handleFocus);

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
        window.removeEventListener('focus', handleFocus);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [activePlanetId, mode]);

  if (mode !== 'QUIZ') return null;

  const currentQ = questions[currentIndex];
  const previousBest = quizBestScores[activePlanetId] || 0;

  const handleSelectOption = (idx: number) => {
    if (isAnswerChecked) return;
    setSelectedOption(idx);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null || !currentQ) return;
    setIsAnswerChecked(true);

    if (selectedOption === currentQ.kunci_jawaban) {
      setScoreEarned((prev) => prev + (currentQ.bobot_poin || 25));
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
    } else {
      // Kuis selesai! Hitung delta skor & poin (PRD R10 & T-01 Anti-tampering capping)
      const maxPossibleScore = questions.reduce((acc, q) => acc + (q.bobot_poin || 25), 0);
      const finalScore = Math.min(scoreEarned, maxPossibleScore);
      const { delta } = submitQuizScore(activePlanetId, finalScore, maxPossibleScore);
      setRewardDelta(delta);
      setIsFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setScoreEarned(0);
    setIsFinished(false);
    setRewardDelta(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950/95 p-6 backdrop-blur-2xl shadow-2xl overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Kuis Formatif: {activePlanetId.toUpperCase()}
                </h2>
                <span className="text-[10px] font-mono rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                  Formatif Bebas Tekanan
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Skor Terbaik Sebelumnya: <strong className="text-amber-400">{previousBest} Poin</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => switchMode('EXPLORE')}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quiz Content */}
        {!isFinished && currentQ ? (
          <div className="mt-5 space-y-4">
            {/* Progress bar */}
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>
                Soal <strong className="text-white">{currentIndex + 1}</strong> dari {questions.length}
              </span>
              <span className="font-mono text-cyan-400">
                Nilai Berjalan: {scoreEarned} Poin
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>

            {/* Question Card */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <p className="text-sm font-semibold text-white leading-relaxed">
                {currentQ.soal}
              </p>
            </div>

            {/* 4 Options Grid */}
            <div className="space-y-2">
              {currentQ.opsi.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = isAnswerChecked && idx === currentQ.kunci_jawaban;
                const isWrong = isAnswerChecked && isSelected && idx !== currentQ.kunci_jawaban;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswerChecked}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full flex items-center justify-between rounded-xl border p-3 text-left text-xs transition-all ${
                      isCorrect
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                        : isWrong
                        ? 'border-rose-500/60 bg-rose-500/10 text-rose-200'
                        : isSelected
                        ? 'border-cyan-500 bg-cyan-500/10 text-white font-semibold'
                        : 'border-slate-800/80 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-800 font-mono text-[10px] text-slate-400">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </div>

                    {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                    {isWrong && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Pembahasan Edukatif (PRD R10) */}
            {isAnswerChecked && (
              <div
                className={`rounded-xl border p-4 text-xs leading-relaxed animate-in fade-in duration-200 ${
                  selectedOption === currentQ.kunci_jawaban
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {selectedOption === currentQ.kunci_jawaban
                      ? 'Tepat Sekali!'
                      : 'Pembahasan Edukatif:'}
                  </span>
                </div>
                <p>{currentQ.pembahasan_edukatif}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              {!isAnswerChecked ? (
                <button
                  type="button"
                  disabled={selectedOption === null}
                  onClick={handleCheckAnswer}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 disabled:opacity-40 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Periksa Jawaban
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <span>
                    {currentIndex + 1 < questions.length ? 'Soal Berikutnya' : 'Lihat Hasil Akhir'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Finished Screen */
          <div className="py-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Award className="h-9 w-9" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Kuis {activePlanetId.toUpperCase()} Selesai!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Evaluasi pembelajaran formatif bebas tekanan (PRD R10)
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 max-w-sm mx-auto space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Skor Diperoleh:</span>
                <span className="font-mono font-bold text-white">{scoreEarned} Poin</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Rekor Terbaik Sebelumnya:</span>
                <span className="font-mono text-slate-300">{previousBest} Poin</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-xs">
                <span className="font-semibold text-cyan-400">Poin Tambahan (Delta):</span>
                <span className="font-mono font-bold text-cyan-300">
                  +{rewardDelta || 0} Poin
                </span>
              </div>
            </div>

            {(rewardDelta || 0) > 0 ? (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400">
                <Sparkles className="h-4 w-4" />
                <span>Selamat! Rekor baru tercatat dan poin ditambahkan ke saldo hanggar!</span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Skor Anda sama atau belum melampaui rekor terbaik. Anda selalu dapat mengulang tanpa batas penalti.
              </p>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRestartQuiz}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Ulangi Kuis</span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('EXPLORE')}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20"
              >
                <span>Kembali Jelajah 3D</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
