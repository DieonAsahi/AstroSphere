import { create } from 'zustand';
import type { Quiz, QuizAttempt, QuizQuestion } from './types';
import { useAuthStore } from '../classes/authStore';

const QUIZ_STORAGE_KEY = 'astrosphere_quizzes_data';
const QUESTIONS_STORAGE_KEY = 'astrosphere_quiz_questions_data';
const ATTEMPTS_STORAGE_KEY = 'astrosphere_quiz_attempts_data';

// Data awal kuis per POI (FR-10)
export const INITIAL_QUIZZES: Quiz[] = [
  {
    id: 'quiz-mars-olympus-mons',
    poiId: 'mars-olympus-mons',
    title: 'Kuis Geologi Vulkanik Olympus Mons',
    description:
      'Uji pemahaman tentang struktur, dimensi, dan pembentukan gunung tertinggi di Tata Surya.',
    isPublished: true,
    createdAt: '2026-10-31T08:00:00Z',
    updatedAt: '2026-10-31T08:00:00Z',
  },
  {
    id: 'quiz-jupiter-great-red-spot',
    poiId: 'jupiter-great-red-spot',
    title: 'Kuis Dinamika Badai Merah Raksasa',
    description:
      'Uji pemahaman tentang sistem antisiklonik, rotasi, dan atmosfer planet gas Jupiter.',
    isPublished: true,
    createdAt: '2026-10-31T08:00:00Z',
    updatedAt: '2026-10-31T08:00:00Z',
  },
];

// Soal ilmiah terverifikasi NASA per POI
export const INITIAL_QUESTIONS: QuizQuestion[] = [
  // Soal Olympus Mons
  {
    id: 'q-olympus-1',
    quizId: 'quiz-mars-olympus-mons',
    poiId: 'mars-olympus-mons',
    questionText:
      'Berapakah ketinggian puncak Olympus Mons dihitung dari datum referensi Mars?',
    options: [
      { id: 'opt-1a', text: '8,8 km (setara Gunung Everest)' },
      { id: 'opt-1b', text: '21,9 km (hampir 3 kali tinggi Everest)' },
      { id: 'opt-1c', text: '50,2 km' },
      { id: 'opt-1d', text: '102 km' },
    ],
    correctOptionId: 'opt-1b',
    explanation:
      'Data instrumen NASA Mars Global Surveyor (MOLA) mencatat ketinggian Olympus Mons adalah 21,9 km, menjadikannya salah satu gunung berapi tertinggi di seluruh Tata Surya.',
    sortOrder: 1,
  },
  {
    id: 'q-olympus-2',
    quizId: 'quiz-mars-olympus-mons',
    poiId: 'mars-olympus-mons',
    questionText:
      'Mengapa gunung api di Mars dapat tumbuh menjulang raksasa dibanding gunung api di Bumi?',
    options: [
      {
        id: 'opt-2a',
        text: 'Karena gravitasi Mars sangat kuat dan menarik lebih banyak batuan',
      },
      {
        id: 'opt-2b',
        text: 'Karena Mars tidak memiliki lempeng tektonik yang bergerak, sehingga hotspot lava tetap diam di satu titik',
      },
      {
        id: 'opt-2c',
        text: 'Karena atmosfer Mars tebal dan membekukan lava seketika',
      },
      { id: 'opt-2d', text: 'Karena sering tertabrak asteroid es' },
    ],
    correctOptionId: 'opt-2b',
    explanation:
      'Di Bumi, lempeng tektonik terus bergerak di atas hotspot magma sehingga membentuk deretan pulau vulkanik. Di Mars, kerak tidak bergerak sehingga letusan bertumpuk di satu tempat selama ratusan juta tahun.',
    sortOrder: 2,
  },
  {
    id: 'q-olympus-3',
    quizId: 'quiz-mars-olympus-mons',
    poiId: 'mars-olympus-mons',
    questionText:
      'Apakah klasifikasi tipe gunung berapi Olympus Mons berdasarkan karakteristik lerengnya?',
    options: [
      { id: 'opt-3a', text: 'Stratovolcano (kerucut curam berlapis)' },
      {
        id: 'opt-3b',
        text: 'Gunung berapi perisai (Shield volcano) dengan lereng sangat landai',
      },
      { id: 'opt-3c', text: 'Kubah lava asam kental' },
      { id: 'opt-3d', text: 'Kaldera runtuhan es abadi' },
    ],
    correctOptionId: 'opt-3b',
    explanation:
      'Olympus Mons adalah gunung berapi perisai (shield volcano) yang dibentuk oleh lelehan lava basal encer dengan kemiringan rata-rata hanya 5 derajat.',
    sortOrder: 3,
  },

  // Soal Jupiter Great Red Spot
  {
    id: 'q-jupiter-1',
    quizId: 'quiz-jupiter-great-red-spot',
    poiId: 'jupiter-great-red-spot',
    questionText:
      'Fenomena meteorologi apakah sebenarnya Badai Merah Raksasa di belahan selatan Jupiter?',
    options: [
      {
        id: 'opt-j1a',
        text: 'Pusaran antisiklonik bertekanan tinggi yang berputar berlawanan arah jarum jam',
      },
      {
        id: 'opt-j1b',
        text: 'Siklon bertekanan rendah yang berputar searah jarum jam',
      },
      { id: 'opt-j1c', text: 'Kawah tumbukan komet purba yang masih membara' },
      { id: 'opt-j1d', text: 'Kebakaran gas metana abadi' },
    ],
    correctOptionId: 'opt-j1a',
    explanation:
      'Badai Merah Raksasa adalah pusaran antisiklonik raksasa bertekanan tinggi di belahan selatan Jupiter dengan arah putaran berlawanan jarum jam (counterclockwise).',
    sortOrder: 1,
  },
  {
    id: 'q-jupiter-2',
    quizId: 'quiz-jupiter-great-red-spot',
    poiId: 'jupiter-great-red-spot',
    questionText:
      'Faktor utama apa yang memungkinkan badai ini bertahan lebih dari 300 tahun tanpa padam?',
    options: [
      {
        id: 'opt-j2a',
        text: 'Jupiter adalah planet gas tanpa permukaan padat yang memberikan gesekan penahan',
      },
      {
        id: 'opt-j2b',
        text: 'Mendapat pasokan bahan bakar es dari cincin Saturnus',
      },
      { id: 'opt-j2c', text: 'Suhu matahari di orbit Jupiter sangat panas' },
      { id: 'opt-j2d', text: 'Tidak ada angin lain di atmosfer Jupiter' },
    ],
    correctOptionId: 'opt-j2a',
    explanation:
      'Tanpa permukaan padat berbatu yang menimbulkan gaya gesekan mekanis, energi kinetik pusaran atmosfer gas raksasa dapat bertahan selama ratusan tahun.',
    sortOrder: 2,
  },
  {
    id: 'q-jupiter-3',
    quizId: 'quiz-jupiter-great-red-spot',
    poiId: 'jupiter-great-red-spot',
    questionText:
      'Berapakah estimasi kecepatan angin di bagian tepi pusaran Badai Merah Raksasa menurut data observasi NASA?',
    options: [
      { id: 'opt-j3a', text: 'Sekitar 40 km/jam' },
      { id: 'opt-j3b', text: 'Sekitar 120 km/jam' },
      { id: 'opt-j3c', text: 'Mencapai 432 km/jam (120 m/s)' },
      { id: 'opt-j3d', text: 'Melebihi 2.000 km/jam' },
    ],
    correctOptionId: 'opt-j3c',
    explanation:
      'Pengukuran dari wahana antariksa NASA Voyager, Galileo, dan Juno mencatat kecepatan angin tepi pusaran mencapai 432 km/jam.',
    sortOrder: 3,
  },
];

// Data awal hasil kuis siswa demo
export const INITIAL_ATTEMPTS: QuizAttempt[] = [
  {
    id: 'att-demo-001',
    quizId: 'quiz-mars-olympus-mons',
    poiId: 'mars-olympus-mons',
    userId: 'user-siswa-demo-001', // Budi Prakoso
    score: 3,
    maxScore: 3,
    answers: {
      'q-olympus-1': 'opt-1b',
      'q-olympus-2': 'opt-2b',
      'q-olympus-3': 'opt-3b',
    },
    completedAt: '2026-10-31T09:00:00Z',
  },
  {
    id: 'att-demo-002',
    quizId: 'quiz-jupiter-great-red-spot',
    poiId: 'jupiter-great-red-spot',
    userId: 'user-siswa-demo-001',
    score: 2,
    maxScore: 3,
    answers: {
      'q-jupiter-1': 'opt-j1a',
      'q-jupiter-2': 'opt-j2a',
      'q-jupiter-3': 'opt-j3b',
    },
    completedAt: '2026-10-31T09:25:00Z',
  },
];

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function persist<T>(key: string, data: T): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

interface QuizState {
  quizzes: Quiz[];
  questions: QuizQuestion[];
  attempts: QuizAttempt[];

  getQuizByPoiId: (poiId: string) => Quiz | undefined;
  getQuestionsByPoiId: (poiId: string) => QuizQuestion[];
  getUserAttemptForPoi: (
    poiId: string,
    userId?: string,
  ) => QuizAttempt | undefined;
  recordAttempt: (
    poiId: string,
    answers: Record<string, string>,
    userId?: string,
  ) => QuizAttempt;

  // Manajemen Soal (Guru & Admin)
  addQuestion: (
    poiId: string,
    data: {
      questionText: string;
      options: { id: string; text: string }[];
      correctOptionId: string;
      explanation: string;
    },
  ) => QuizQuestion;
  updateQuestion: (questionId: string, updates: Partial<QuizQuestion>) => void;
  deleteQuestion: (questionId: string) => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: loadStored(QUIZ_STORAGE_KEY, INITIAL_QUIZZES),
  questions: loadStored(QUESTIONS_STORAGE_KEY, INITIAL_QUESTIONS),
  attempts: loadStored(ATTEMPTS_STORAGE_KEY, INITIAL_ATTEMPTS),

  getQuizByPoiId: (poiId) => {
    return get().quizzes.find((q) => q.poiId === poiId);
  },

  getQuestionsByPoiId: (poiId) => {
    return get()
      .questions.filter((q) => q.poiId === poiId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getUserAttemptForPoi: (poiId, userId) => {
    const targetUserId =
      userId || useAuthStore.getState().user?.id || 'guest-user';
    return get().attempts.find(
      (a) => a.poiId === poiId && a.userId === targetUserId,
    );
  },

  recordAttempt: (poiId, answers, userId) => {
    const targetUserId =
      userId || useAuthStore.getState().user?.id || 'guest-user';
    const questions = get().getQuestionsByPoiId(poiId);
    const quiz = get().getQuizByPoiId(poiId);
    const quizId = quiz?.id || `quiz-${poiId}`;

    // Hitung skor objektif
    let score = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctOptionId) {
        score += 1;
      }
    });

    const newAttempt: QuizAttempt = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      quizId,
      poiId,
      userId: targetUserId,
      score,
      maxScore: questions.length,
      answers,
      completedAt: new Date().toISOString(),
    };

    // Upsert percobaan terbaru pengguna untuk POI ini
    const filtered = get().attempts.filter(
      (a) => !(a.poiId === poiId && a.userId === targetUserId),
    );
    const nextAttempts = [newAttempt, ...filtered];

    persist(ATTEMPTS_STORAGE_KEY, nextAttempts);
    set({ attempts: nextAttempts });
    return newAttempt;
  },

  addQuestion: (poiId, data) => {
    const quiz = get().getQuizByPoiId(poiId);
    const quizId = quiz?.id || `quiz-${poiId}`;
    const existing = get().getQuestionsByPoiId(poiId);

    const newQuestion: QuizQuestion = {
      id: `q-${poiId}-${Date.now()}`,
      quizId,
      poiId,
      questionText: data.questionText.trim(),
      options: data.options,
      correctOptionId: data.correctOptionId,
      explanation: data.explanation.trim(),
      sortOrder: existing.length + 1,
    };

    const nextQuestions = [...get().questions, newQuestion];
    persist(QUESTIONS_STORAGE_KEY, nextQuestions);
    set({ questions: nextQuestions });
    return newQuestion;
  },

  updateQuestion: (questionId, updates) => {
    const nextQuestions = get().questions.map((q) =>
      q.id === questionId ? { ...q, ...updates } : q,
    );
    persist(QUESTIONS_STORAGE_KEY, nextQuestions);
    set({ questions: nextQuestions });
  },

  deleteQuestion: (questionId) => {
    const nextQuestions = get().questions.filter((q) => q.id !== questionId);
    persist(QUESTIONS_STORAGE_KEY, nextQuestions);
    set({ questions: nextQuestions });
  },
}));
