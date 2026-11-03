import { useMemo, useState } from 'react';
import { id } from '../../lib/i18n/id';
import { GlassPanel } from '../../ui/GlassPanel';
import { useAuthStore } from '../classes/authStore';
import { useQuizStore } from './quizStore';
import { QuizQuestionManagerModal } from './QuizQuestionManagerModal';

interface QuizViewProps {
  poiId: string;
  poiName: string;
  onClose?: () => void;
}

export function QuizView({ poiId, poiName, onClose }: QuizViewProps) {
  const user = useAuthStore((state) => state.user);
  const isTeacherOrAdmin = user?.role === 'guru' || user?.role === 'admin';

  const getQuestionsByPoiId = useQuizStore(
    (state) => state.getQuestionsByPoiId,
  );
  const recordAttempt = useQuizStore((state) => state.recordAttempt);
  const getUserAttemptForPoi = useQuizStore(
    (state) => state.getUserAttemptForPoi,
  );

  const questions = useMemo(
    () => getQuestionsByPoiId(poiId),
    [getQuestionsByPoiId, poiId],
  );
  const previousAttempt = useMemo(
    () => getUserAttemptForPoi(poiId, user?.id),
    [getUserAttemptForPoi, poiId, user?.id],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [isSubmitted, setIsSubmitted] = useState<Record<string, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Hitung hasil kuis
  const totalScore = useMemo(() => {
    return questions.reduce((sum, q) => {
      return sum + (selectedAnswers[q.id] === q.correctOptionId ? 1 : 0);
    }, 0);
  }, [questions, selectedAnswers]);

  const scorePct =
    questions.length > 0
      ? Math.round((totalScore / questions.length) * 100)
      : 0;

  if (questions.length === 0) {
    return (
      <div className="quiz-empty-box">
        <p>Belum ada soal kuis yang disiapkan untuk titik minat ini.</p>
        {isTeacherOrAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsManagerOpen(true)}
            style={{ marginTop: '0.75rem' }}
          >
            + {id.quiz.addQuestionBtn}
          </button>
        )}
        {isManagerOpen && (
          <QuizQuestionManagerModal
            poiId={poiId}
            poiName={poiName}
            isOpen={isManagerOpen}
            onClose={() => setIsManagerOpen(false)}
          />
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = selectedAnswers[currentQuestion?.id];
  const hasSubmittedCurrent = Boolean(isSubmitted[currentQuestion?.id]);
  const isCorrect = currentAnswer === currentQuestion?.correctOptionId;

  // Pilih jawaban
  const handleSelectOption = (optionId: string) => {
    if (hasSubmittedCurrent) return;

    const nextAnswers = { ...selectedAnswers, [currentQuestion.id]: optionId };
    setSelectedAnswers(nextAnswers);
    setIsSubmitted({ ...isSubmitted, [currentQuestion.id]: true });
  };

  // Navigasi ke pertanyaan berikutnya atau selesai
  const handleNextOrFinish = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Simpan skor percobaan ke quiz_attempts
      recordAttempt(poiId, selectedAnswers, user?.id);
      setIsFinished(true);
    }
  };

  // Ulangi kuis dari awal
  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setIsSubmitted({});
    setIsFinished(false);
  };

  return (
    <div
      className="quiz-container"
      role="region"
      aria-label={`Kuis ${poiName}`}
    >
      {/* Header Kuis */}
      <div className="quiz-header">
        <div>
          <span className="quiz-badge">Kuis Pemahaman Cepat</span>
          <h3 className="quiz-title">{poiName}</h3>
        </div>

        {isTeacherOrAdmin && (
          <button
            type="button"
            className="btn btn-secondary quiz-btn-manage"
            onClick={() => setIsManagerOpen(true)}
            aria-label={id.quiz.manageQuestions}
          >
            ⚙ {id.quiz.manageQuestions}
          </button>
        )}
      </div>

      {/* TAMPILAN SELESAI */}
      {isFinished ? (
        <GlassPanel className="quiz-result-card">
          <div className="quiz-result-icon" aria-hidden="true">
            {scorePct >= 70 ? '🌟' : '💡'}
          </div>

          <h4 className="quiz-result-title">{id.quiz.scoreTitle}</h4>
          <p className="quiz-result-score">
            {id.quiz.scoreSummary(totalScore, questions.length, scorePct)}
          </p>

          <p className="quiz-result-msg">
            {scorePct === 100
              ? 'Luar biasa! Pemahaman Anda tentang fakta astronomi titik minat ini sempurna.'
              : scorePct >= 70
                ? 'Bagus sekali! Anda memahami poin-poin utama dengan sangat baik.'
                : 'Teruslah bereksplorasi dan pelajari kembali fakta ilmiah pada panel di samping.'}
          </p>

          <div className="quiz-result-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRestart}
            >
              ↻ {id.quiz.retryQuiz}
            </button>
            {onClose && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                {id.quiz.closeQuiz}
              </button>
            )}
          </div>
        </GlassPanel>
      ) : (
        /* TAMPILAN PERTANYAAN AKTIF */
        <div className="quiz-question-box">
          {/* Stepper Progres */}
          <div className="quiz-progress-row">
            <span className="quiz-progress-label">
              {id.quiz.questionCount(currentIndex + 1, questions.length)}
            </span>
            <div className="quiz-progress-bar-bg">
              <div
                className="quiz-progress-bar-fill"
                style={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Teks Pertanyaan */}
          <h4 className="quiz-question-text">{currentQuestion.questionText}</h4>

          {/* Opsi Pilihan Ganda */}
          <div
            className="quiz-options-list"
            role="radiogroup"
            aria-label="Pilihan jawaban"
          >
            {currentQuestion.options.map((option) => {
              const isSelected = currentAnswer === option.id;
              let optionClass = 'quiz-option-btn';

              if (hasSubmittedCurrent) {
                if (option.id === currentQuestion.correctOptionId) {
                  optionClass += ' quiz-option-btn--correct';
                } else if (isSelected) {
                  optionClass += ' quiz-option-btn--incorrect';
                } else {
                  optionClass += ' quiz-option-btn--dimmed';
                }
              } else if (isSelected) {
                optionClass += ' quiz-option-btn--selected';
              }

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={hasSubmittedCurrent}
                  className={optionClass}
                  onClick={() => handleSelectOption(option.id)}
                >
                  <span className="quiz-option-marker">
                    {hasSubmittedCurrent &&
                    option.id === currentQuestion.correctOptionId
                      ? '✓'
                      : hasSubmittedCurrent && isSelected
                        ? '✕'
                        : ''}
                  </span>
                  <span className="quiz-option-text">{option.text}</span>
                </button>
              );
            })}
          </div>

          {/* Kotak Umpan Balik Langsung dengan Penjelasan Ilmiah */}
          {hasSubmittedCurrent && (
            <div
              className={`quiz-feedback-box ${
                isCorrect
                  ? 'quiz-feedback-box--correct'
                  : 'quiz-feedback-box--incorrect'
              }`}
              role="alert"
              aria-live="polite"
            >
              <div className="quiz-feedback-header">
                <span className="quiz-feedback-status">
                  {isCorrect
                    ? `✓ ${id.quiz.correctFeedback}`
                    : `✕ ${id.quiz.incorrectFeedback}`}
                </span>
              </div>
              <p className="quiz-feedback-explanation">
                <strong>{id.quiz.explanationTitle}</strong>{' '}
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* Tombol Lanjut ke Soal Berikutnya */}
          {hasSubmittedCurrent && (
            <div className="quiz-nav-row">
              <button
                type="button"
                className="btn btn-primary quiz-btn-next"
                onClick={handleNextOrFinish}
              >
                {currentIndex < questions.length - 1
                  ? `${id.quiz.nextQuestion} ▶`
                  : id.quiz.seeResults}
              </button>
            </div>
          )}

          {/* Info percobaan sebelumnya jika siswa sudah pernah mengerjakan */}
          {previousAttempt && !hasSubmittedCurrent && (
            <div className="quiz-prev-attempt-note">
              <span>
                Capaian Anda sebelumnya:{' '}
                <strong>
                  {previousAttempt.score}/{previousAttempt.maxScore} (
                  {Math.round(
                    (previousAttempt.score / previousAttempt.maxScore) * 100,
                  )}
                  %)
                </strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Modal Manajemen Soal Kuis (Guru & Admin) */}
      {isManagerOpen && (
        <QuizQuestionManagerModal
          poiId={poiId}
          poiName={poiName}
          isOpen={isManagerOpen}
          onClose={() => setIsManagerOpen(false)}
        />
      )}
    </div>
  );
}
