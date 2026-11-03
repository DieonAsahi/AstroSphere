import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../classes/authStore';
import { QuizQuestionManagerModal } from './QuizQuestionManagerModal';
import { QuizView } from './QuizView';
import { INITIAL_QUESTIONS, INITIAL_QUIZZES, useQuizStore } from './quizStore';

describe('Quiz Feature & Formative Assessment (FR-10)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null });
    useQuizStore.setState({
      quizzes: JSON.parse(JSON.stringify(INITIAL_QUIZZES)),
      questions: JSON.parse(JSON.stringify(INITIAL_QUESTIONS)),
      attempts: [],
    });
  });

  describe('1. Store: Questions, Scoring, and Management', () => {
    it('loads verified scientific NASA questions per POI', () => {
      const store = useQuizStore.getState();
      const olympusQuestions = store.getQuestionsByPoiId('mars-olympus-mons');
      const jupiterQuestions = store.getQuestionsByPoiId(
        'jupiter-great-red-spot',
      );

      expect(olympusQuestions).toHaveLength(3);
      expect(jupiterQuestions).toHaveLength(3);

      expect(olympusQuestions[0].questionText).toContain(
        'ketinggian puncak Olympus Mons',
      );
      expect(olympusQuestions[0].options).toHaveLength(4);
      expect(olympusQuestions[0].correctOptionId).toBe('opt-1b');
      expect(olympusQuestions[0].explanation).toContain('MOLA');
    });

    it('records quiz attempt, calculates score accurately, and upserts per user and POI', () => {
      const store = useQuizStore.getState();

      // Budi answers 2 correctly out of 3 for Olympus Mons
      const attempt1 = store.recordAttempt(
        'mars-olympus-mons',
        {
          'q-olympus-1': 'opt-1b', // Benar
          'q-olympus-2': 'opt-2b', // Benar
          'q-olympus-3': 'opt-3a', // Salah
        },
        'student-budi',
      );

      expect(attempt1.score).toBe(2);
      expect(attempt1.maxScore).toBe(3);
      expect(useQuizStore.getState().attempts).toHaveLength(1);

      // Budi retries and gets all 3 right
      const attempt2 = store.recordAttempt(
        'mars-olympus-mons',
        {
          'q-olympus-1': 'opt-1b', // Benar
          'q-olympus-2': 'opt-2b', // Benar
          'q-olympus-3': 'opt-3b', // Benar
        },
        'student-budi',
      );

      expect(attempt2.score).toBe(3);
      expect(attempt2.maxScore).toBe(3);

      // Pastikan upsert: jumlah percobaan tersimpan tetap 1 (tidak duplikat)
      expect(useQuizStore.getState().attempts).toHaveLength(1);
      const latestAttempt = store.getUserAttemptForPoi(
        'mars-olympus-mons',
        'student-budi',
      );
      expect(latestAttempt?.score).toBe(3);
    });

    it('supports question management (add, update, delete) for teachers/admins', () => {
      const store = useQuizStore.getState();

      // Tambah soal baru
      const newQ = store.addQuestion('mars-olympus-mons', {
        questionText: 'Berapa diameter kaldera puncak Olympus Mons?',
        options: [
          { id: 'opt-k1', text: '80 km' },
          { id: 'opt-k2', text: '10 km' },
          { id: 'opt-k3', text: '300 km' },
          { id: 'opt-k4', text: '5 km' },
        ],
        correctOptionId: 'opt-k1',
        explanation:
          'Kaldera puncak memiliki kompleks runtuhan sepanjang 80 km.',
      });

      expect(store.getQuestionsByPoiId('mars-olympus-mons')).toHaveLength(4);
      expect(newQ.questionText).toContain('diameter kaldera');

      // Perbarui soal
      store.updateQuestion(newQ.id, {
        questionText:
          'Berapa diameter kaldera puncak Olympus Mons (terverifikasi MGS)?',
      });
      const updatedQ = store
        .getQuestionsByPoiId('mars-olympus-mons')
        .find((q) => q.id === newQ.id);
      expect(updatedQ?.questionText).toContain('terverifikasi MGS');

      // Hapus soal
      store.deleteQuestion(newQ.id);
      expect(store.getQuestionsByPoiId('mars-olympus-mons')).toHaveLength(3);
    });
  });

  describe('2. UI: QuizView Flow, Immediate Feedback, and Accessibility', () => {
    it('displays questions, options, and question counter', () => {
      render(<QuizView poiId="mars-olympus-mons" poiName="Olympus Mons" />);

      expect(screen.getByText('Olympus Mons')).toBeInTheDocument();
      expect(screen.getByText(/Pertanyaan 1 dari 3/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          'Berapakah ketinggian puncak Olympus Mons dihitung dari datum referensi Mars?',
        ),
      ).toBeInTheDocument();

      // 4 opsi pilihan ganda
      const options = screen.getAllByRole('radio');
      expect(options).toHaveLength(4);
    });

    it('gives immediate feedback with scientific explanation upon selecting an option', async () => {
      const user = userEvent.setup();
      render(<QuizView poiId="mars-olympus-mons" poiName="Olympus Mons" />);

      // Klik opsi yang benar (21,9 km)
      const correctOption = screen.getByText(/21,9 km/i);
      await user.click(correctOption);

      // Verifikasi muncul umpan balik sukses langsung
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Benar!/i)).toBeInTheDocument();
      expect(screen.getByText(/Penjelasan Ilmiah:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Data instrumen NASA Mars Global Surveyor \(MOLA\)/i),
      ).toBeInTheDocument();

      // Opsi terkunci (disabled) setelah dipilih agar tidak bisa diubah-ubah sembarangan
      const options = screen.getAllByRole('radio');
      options.forEach((opt) => {
        expect(opt).toBeDisabled();
      });

      // Tombol lanjut ke pertanyaan berikutnya muncul
      const nextBtn = screen.getByRole('button', { name: /Soal Berikutnya/i });
      expect(nextBtn).toBeInTheDocument();
    });

    it('completes the full quiz flow and renders score summary card with retry option', async () => {
      const user = userEvent.setup();
      render(<QuizView poiId="mars-olympus-mons" poiName="Olympus Mons" />);

      // Soal 1: Jawab benar (21,9 km)
      await user.click(screen.getByText(/21,9 km/i));
      await user.click(
        screen.getByRole('button', { name: /Soal Berikutnya/i }),
      );

      // Soal 2: Jawab benar (lempeng tektonik)
      expect(screen.getByText(/Pertanyaan 2 dari 3/i)).toBeInTheDocument();
      await user.click(screen.getByText(/tidak memiliki lempeng tektonik/i));
      await user.click(
        screen.getByRole('button', { name: /Soal Berikutnya/i }),
      );

      // Soal 3: Jawab benar (shield volcano)
      expect(screen.getByText(/Pertanyaan 3 dari 3/i)).toBeInTheDocument();
      await user.click(screen.getByText(/Gunung berapi perisai/i));

      // Tombol Lihat Hasil Akhir
      const finishBtn = screen.getByRole('button', {
        name: /Lihat Hasil Akhir/i,
      });
      await user.click(finishBtn);

      // Verifikasi kartu skor
      expect(screen.getByText('Hasil Kuis Astronomi')).toBeInTheDocument();
      expect(
        screen.getByText(/Skor Anda: 3 dari 3 \(100%\)/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Luar biasa!/i)).toBeInTheDocument();

      // Tombol ulangi kuis
      const retryBtn = screen.getByRole('button', { name: /Ulangi Kuis/i });
      expect(retryBtn).toBeInTheDocument();

      await user.click(retryBtn);
      // Kembali ke pertanyaan 1
      expect(screen.getByText(/Pertanyaan 1 dari 3/i)).toBeInTheDocument();
    });

    it('shows question management button only for teachers or admins', () => {
      // Siswa: tombol Kelola Soal tidak muncul
      act(() => {
        useAuthStore.setState({
          user: {
            id: 's1',
            email: 's@test.com',
            name: 'Siswa',
            role: 'siswa',
            schoolName: undefined,
          },
        });
      });

      const { rerender } = render(
        <QuizView poiId="mars-olympus-mons" poiName="Olympus Mons" />,
      );
      expect(
        screen.queryByRole('button', { name: /Kelola Soal/i }),
      ).not.toBeInTheDocument();

      // Guru: tombol Kelola Soal muncul
      act(() => {
        useAuthStore.setState({
          user: {
            id: 'g1',
            email: 'g@test.com',
            name: 'Guru',
            role: 'guru',
            schoolName: 'SMP 1',
          },
        });
      });

      rerender(<QuizView poiId="mars-olympus-mons" poiName="Olympus Mons" />);
      expect(
        screen.getByRole('button', { name: /Kelola Soal/i }),
      ).toBeInTheDocument();
    });

    it('passes axe accessibility audit on QuizView and QuizQuestionManagerModal', async () => {
      const { container } = render(
        <QuizView poiId="mars-olympus-mons" poiName="Olympus Mons" />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      const { container: modalContainer } = render(
        <QuizQuestionManagerModal
          poiId="mars-olympus-mons"
          poiName="Olympus Mons"
          isOpen={true}
          onClose={() => {}}
        />,
      );
      const modalResults = await axe(modalContainer);
      expect(modalResults).toHaveNoViolations();
    });
  });
});
