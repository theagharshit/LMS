import type { Quiz } from './types';

export type QuizStatus = 'draft' | 'published' | 'live';

/** Resolve quiz status; legacy quizzes with only `published: true` remain takeable as live. */
export function getQuizStatus(quiz: Quiz): QuizStatus {
  if (quiz.status) return quiz.status;
  if (quiz.published) return 'live';
  return 'draft';
}

export function isQuizVisibleToStudents(quiz: Quiz): boolean {
  const status = getQuizStatus(quiz);
  return status === 'published' || status === 'live';
}

export function isQuizTakeable(quiz: Quiz): boolean {
  return getQuizStatus(quiz) === 'live';
}
