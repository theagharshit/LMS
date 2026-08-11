import { ComponentType } from 'react';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuestionData {
  options?: QuestionOption[] | string[];
  [key: string]: any;
}

export interface Question {
  id: string;
  type: string; // e.g. "multiple_choice", "MCQ", "true_false", "short_answer"
  prompt: string; // Question text
  points: number;
  required?: boolean;
  explanation?: string;
  correctAnswer?: string;
  data?: QuestionData;
  options?: string[]; // Fallback for backwards compatibility with existing shared types
}

export interface QuestionComponentProps {
  question: Question;
  answer: string | undefined;
  onAnswer: (questionId: string, answer: string) => void;
  disabled?: boolean;
}

export interface QuestionTypeContract {
  type: string;
  label: string;
  renderer: ComponentType<QuestionComponentProps>;
  validate?: (question: Question, answer: any) => boolean;
  serializeAnswer?: (answer: any) => string;
  deserializeAnswer?: (serialized: string) => any;
  getAnswerSummary?: (
    question: Question,
    answer: any,
  ) => { isCorrect: boolean; displayAnswer: string; correctAnswerDisplay: string };
  calculateScore?: (question: Question, answer: any) => number;
}

export interface QuizSessionState {
  quizId: string;
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> selected answer
  visitedQuestions: Set<string>;
  flaggedQuestions: Set<string>;
  startedAt: string | null;
  submittedAt: string | null;
  timeRemainingSeconds: number;
  status: 'landing' | 'taking' | 'confirming' | 'completed' | 'reviewing';
  isTimeUp?: boolean;
}

export interface QuizResultSummary {
  score: number;
  totalPoints: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
}
