import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    startedAt?: string,
    timeSpentSeconds?: number,
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
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [status, setStatus] = useState<QuizSessionState['status']>(() =>
    isAlreadySubmitted ? 'completed' : 'landing',
  );

  const answersRef = useRef(answers);
  const onFinishRef = useRef(onFinishSubmission);
  const startedAtRef = useRef<string | null>(null);
  const durationRef = useRef(durationMinutes);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    onFinishRef.current = onFinishSubmission;
  }, [onFinishSubmission]);

  useEffect(() => {
    durationRef.current = durationMinutes;
  }, [durationMinutes]);

  const currentQuestion = questions[currentQuestionIndex] || questions[0];

  useEffect(() => {
    if (currentQuestion && status === 'taking') {
      setVisitedQuestions((prev) => new Set(prev).add(currentQuestion.id));
    }
  }, [currentQuestion, status]);

  const computeResult = useCallback(
    (answerMap: Record<string, string>): QuizResultSummary => {
      let score = 0;
      let totalPoints = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;

      questions.forEach((q) => {
        totalPoints += q.points;
        const userAns = answerMap[q.id];
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
    },
    [questions],
  );

  const handleForceSubmit = useCallback(() => {
    const result = computeResult(answersRef.current);
    const endTime = new Date();
    const startTime = startedAtRef.current ? new Date(startedAtRef.current) : endTime;
    const timeSpentSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    setSubmittedAt(endTime.toISOString());
    setStatus('completed');
    setIsTimeUp(true);

    if (onFinishRef.current) {
      onFinishRef.current(
        answersRef.current,
        result.score,
        result.totalPoints,
        startedAtRef.current || undefined,
        timeSpentSeconds,
      );
    }
  }, [computeResult]);

  useEffect(() => {
    if (status !== 'taking') return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleForceSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, handleForceSubmit]);

  const startQuiz = useCallback(() => {
    const now = new Date().toISOString();
    startedAtRef.current = now;
    setStartedAt(now);
    setStatus('taking');
    setTimeRemainingSeconds((durationRef.current || 10) * 60);
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

  const resultSummary: QuizResultSummary = useMemo(
    () => computeResult(answers),
    [answers, computeResult],
  );

  const confirmSubmit = useCallback(() => {
    handleForceSubmit();
  }, [handleForceSubmit]);

  const startReview = useCallback(() => {
    setStatus('reviewing');
  }, []);

  const backToResults = useCallback(() => {
    setStatus('completed');
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
      isTimeUp,
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
      backToResults,
    },
  };
}
