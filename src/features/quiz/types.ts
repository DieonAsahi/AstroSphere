export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  poiId: string;
  questionText: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  sortOrder: number;
}

export interface Quiz {
  id: string;
  poiId: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  poiId: string;
  userId: string;
  score: number;
  maxScore: number;
  answers: Record<string, string>;
  completedAt: string;
}
