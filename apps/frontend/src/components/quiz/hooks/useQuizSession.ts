import { useState, useEffect, useCallback, useMemo } from 'react';
import { Question, QuizSessionState, QuizResultSummary } from '../types/quizTypes';
import { questionTypeRegistry } from '../registry/questionTypeRegistry';

interface UseQuizSessionOptions {
  quizId: string;
  questions: Question[];
  durationMinutes?: number;
  initialAnswers?: Record<string, string>;
  isAlreadySubmitted?: boolean;
  onFinishSubmission?: (
    answers: Record<string, string>,
    score: number,
    totalPoints: number,
  ) => void;
}

export function useQuizSession({
  quizId,
  questions,
  durationMinutes = 10,
  initialAnswers = {},
  isAlreadySubmitted = false,
  onFinishSubmission,
}: UseQuizSessionOptions) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(() => new Set());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(() => new Set());
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(
    (durationMinutes || 10) * 60,
  );
  const [status, setStatus] = useState<QuizSessionState['status']>(() =>
    isAlreadySubmitted ? 'completed' : 'landing',
  );

  const currentQuestion = questions[currentQuestionIndex] || questions[0];

  // Track visited questions as user navigates
  useEffect(() => {
    if (currentQuestion && status === 'taking') {
      setVisitedQuestions((prev) => new Set(prev).add(currentQuestion.id));
    }
  }, [currentQuestion, status]);

  // Countdown timer when taking quiz
  useEffect(() => {
    if (status !== 'taking') return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when timer reaches 0
          handleForceSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  const startQuiz = useCallback(() => {
    setStartedAt(new Date().toISOString());
    setStatus('taking');
    if (questions[0]) {
      setVisitedQuestions(new Set([questions[0].id]));
    }
  }, [questions]);

  const setAnswer = useCallback((questionId: string, answerValue: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerValue,
    }));
  }, []);

  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1));
  }, [questions.length]);

  const prevQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToQuestion = useCallback(
    (index: number) => {
      if (index >= 0 && index < questions.length) {
        setCurrentQuestionIndex(index);
      }
    },
    [questions.length],
  );

  const toggleFlag = useCallback((questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  const openConfirmModal = useCallback(() => {
    setStatus('confirming');
  }, []);

  const closeConfirmModal = useCallback(() => {
    setStatus('taking');
  }, []);

  const resultSummary: QuizResultSummary = useMemo(() => {
    let score = 0;
    let totalPoints = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    questions.forEach((q) => {
      totalPoints += q.points;
      const userAns = answers[q.id];
      if (!userAns) {
        unansweredCount++;
      } else {
        const handler = questionTypeRegistry.getHandler(q.type);
        const pts = handler?.calculateScore
          ? handler.calculateScore(q, userAns)
          : userAns === q.correctAnswer
            ? q.points
            : 0;

        score += pts;
        if (pts > 0) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      }
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    return {
      score,
      totalPoints,
      percentage,
      correctCount,
      incorrectCount,
      unansweredCount,
      totalQuestions: questions.length,
    };
  }, [questions, answers]);

  const handleForceSubmit = useCallback(() => {
    setSubmittedAt(new Date().toISOString());
    setStatus('completed');
    if (onFinishSubmission) {
      onFinishSubmission(answers, resultSummary.score, resultSummary.totalPoints);
    }
  }, [answers, resultSummary, onFinishSubmission]);

  const confirmSubmit = useCallback(() => {
    handleForceSubmit();
  }, [handleForceSubmit]);

  const startReview = useCallback(() => {
    setStatus('reviewing');
  }, []);

  return {
    state: {
      quizId,
      currentQuestionIndex,
      answers,
      visitedQuestions,
      flaggedQuestions,
      startedAt,
      submittedAt,
      timeRemainingSeconds,
      status,
    },
    currentQuestion,
    resultSummary,
    actions: {
      startQuiz,
      setAnswer,
      nextQuestion,
      prevQuestion,
      goToQuestion,
      toggleFlag,
      openConfirmModal,
      closeConfirmModal,
      confirmSubmit,
      startReview,
    },
  };
}
