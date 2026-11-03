import { useId, useState } from 'react';
import { id } from '../../lib/i18n/id';
import { GlassPanel } from '../../ui/GlassPanel';
import { useQuizStore } from './quizStore';

interface QuizQuestionManagerModalProps {
  poiId: string;
  poiName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QuizQuestionManagerModal({
  poiId,
  poiName,
  isOpen,
  onClose,
}: QuizQuestionManagerModalProps) {
  const getQuestionsByPoiId = useQuizStore(
    (state) => state.getQuestionsByPoiId,
  );
  const addQuestion = useQuizStore((state) => state.addQuestion);
  const deleteQuestion = useQuizStore((state) => state.deleteQuestion);

  const questions = getQuestionsByPoiId(poiId);

  const [isAdding, setIsAdding] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([
    { id: 'opt-a', text: '' },
    { id: 'opt-b', text: '' },
    { id: 'opt-c', text: '' },
    { id: 'opt-d', text: '' },
  ]);
  const [correctOptionId, setCorrectOptionId] = useState('opt-a');
  const [explanation, setExplanation] = useState('');

  const qTextId = useId();
  const explId = useId();

  if (!isOpen) return null;

  const handleOptionChange = (idx: number, text: string) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], text };
    setOptions(updated);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      alert('Teks pertanyaan wajib diisi.');
      return;
    }
    const emptyOption = options.find((o) => !o.text.trim());
    if (emptyOption) {
      alert('Semua pilihan jawaban wajib diisi.');
      return;
    }
    if (!explanation.trim()) {
      alert('Penjelasan ilmiah wajib diisi untuk edukasi siswa.');
      return;
    }

    addQuestion(poiId, {
      questionText: questionText.trim(),
      options: options.map((o) => ({ ...o, text: o.text.trim() })),
      correctOptionId,
      explanation: explanation.trim(),
    });

    // Reset form
    setQuestionText('');
    setOptions([
      { id: 'opt-a', text: '' },
      { id: 'opt-b', text: '' },
      { id: 'opt-c', text: '' },
      { id: 'opt-d', text: '' },
    ]);
    setCorrectOptionId('opt-a');
    setExplanation('');
    setIsAdding(false);
  };

  return (
    <div
      className="tour-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-manager-title"
    >
      <GlassPanel className="quiz-manager-card">
        {/* Header Modal */}
        <div className="tour-builder-header">
          <div>
            <h2 id="quiz-manager-title" className="tour-builder-title">
              {id.quiz.manageTitle}
            </h2>
            <p className="tour-builder-subtitle">
              Kelola butir soal evaluasi pemahaman untuk titik minat:{' '}
              <strong>{poiName}</strong>
            </p>
          </div>
          <button
            type="button"
            className="tour-btn-close-modal"
            onClick={onClose}
            aria-label={id.tours.builder.close}
          >
            ✕
          </button>
        </div>

        {/* Isi Modal */}
        <div className="tour-builder-body">
          {/* Tombol Tambah Soal */}
          {!isAdding && (
            <div className="quiz-manager-action-bar">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsAdding(true)}
              >
                + {id.quiz.addQuestionBtn}
              </button>
            </div>
          )}

          {/* Form Tambah Soal Baru */}
          {isAdding && (
            <form onSubmit={handleSaveQuestion} className="quiz-add-form">
              <h3 className="quiz-add-title">Buat Butir Soal Baru</h3>

              <div className="form-group">
                <label htmlFor={qTextId} className="form-label">
                  {id.quiz.questionTextLabel} *
                </label>
                <textarea
                  id={qTextId}
                  required
                  rows={2}
                  className="form-input"
                  placeholder="Tuliskan pertanyaan astronomi..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                />
              </div>

              <div className="form-group">
                <span className="form-label">
                  {id.quiz.optionsLabel} (Pilih yang benar) *
                </span>
                <div className="quiz-options-edit-grid">
                  {options.map((opt, idx) => {
                    const letters = ['A', 'B', 'C', 'D'];
                    return (
                      <div key={opt.id} className="quiz-option-edit-row">
                        <input
                          type="radio"
                          name="correctOption"
                          id={`radio-${opt.id}`}
                          checked={correctOptionId === opt.id}
                          onChange={() => setCorrectOptionId(opt.id)}
                          aria-label={`Jadikan opsi ${letters[idx]} sebagai jawaban benar`}
                        />
                        <span className="quiz-option-letter">
                          {letters[idx]}.
                        </span>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder={`Teks pilihan ${letters[idx]}...`}
                          value={opt.text}
                          onChange={(e) =>
                            handleOptionChange(idx, e.target.value)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor={explId} className="form-label">
                  {id.quiz.explanationLabel} *
                </label>
                <textarea
                  id={explId}
                  required
                  rows={2}
                  className="form-input"
                  placeholder="Penjelasan ilmiah yang akan muncul saat siswa memilih jawaban..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </div>

              <div className="quiz-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAdding(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {id.quiz.saveQuestion}
                </button>
              </div>
            </form>
          )}

          {/* Daftar Soal Tersimpan */}
          <div className="quiz-questions-list">
            <h3 className="quiz-list-heading">
              Daftar Soal Aktif ({questions.length} Soal)
            </h3>

            {questions.map((q, idx) => (
              <div key={q.id} className="quiz-question-item-card">
                <div className="quiz-question-item-header">
                  <span className="quiz-q-num">Soal #{idx + 1}</span>
                  <button
                    type="button"
                    className="btn-icon-tiny btn-icon-danger"
                    onClick={() => deleteQuestion(q.id)}
                    aria-label={`Hapus soal nomor ${idx + 1}`}
                    title="Hapus soal ini"
                  >
                    ✕
                  </button>
                </div>

                <p className="quiz-q-text">{q.questionText}</p>

                <ul className="quiz-q-opts">
                  {q.options.map((opt) => (
                    <li
                      key={opt.id}
                      className={
                        opt.id === q.correctOptionId
                          ? 'quiz-opt--correct-tag'
                          : ''
                      }
                    >
                      {opt.text}{' '}
                      {opt.id === q.correctOptionId ? ' (Benar ✓)' : ''}
                    </li>
                  ))}
                </ul>

                <p className="quiz-q-expl">
                  <strong>Penjelasan:</strong> {q.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="tour-builder-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Selesai
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}
