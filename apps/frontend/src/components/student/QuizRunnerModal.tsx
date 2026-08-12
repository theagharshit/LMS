import React from 'react';
import { useApp } from '../../context/AppContext';
import { QuizContainer } from '../quiz/QuizContainer';
import { Question } from '../quiz/types/quizTypes';
import { isQuizTakeable } from '@lms/shared';
import { Hourglass, X } from 'lucide-react';

interface QuizRunnerModalProps {
  quizId: string | null;
  onClose: () => void;
}

export const QuizRunnerModal: React.FC<QuizRunnerModalProps> = ({ quizId, onClose }) => {
  const { quizzes, submitQuizAnswers, quizSubmissions, currentUser } = useApp();

  if (!quizId) return null;

  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz) return null;

  const existingSubmission = quizSubmissions.find(
    (s) => s.quizId === quizId && s.studentId === currentUser?.id,
  );

  if (!existingSubmission && !isQuizTakeable(quiz)) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center mx-auto">
            <Hourglass className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-[#2D2D2A] dark:text-white font-serif">
              {quiz.title}
            </h3>
            <p className="text-sm text-[#7A7A72] dark:text-slate-400">
              Your teacher has assigned this quiz, but the test has not started yet. Please wait
              until they click &quot;Start Test&quot; in the classroom.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#4A6741] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    );
  }

  // Map shared QuizQuestion objects to generic Question model
  const questions: Question[] = quiz.questions.map((q, idx) => ({
    id: q.id || `q-${idx}`,
    type: q.type || 'multiple_choice',
    prompt: q.text,
    points: q.points || 1,
    required: true,
    explanation: q.explanation,
    correctAnswer: q.correctAnswer,
    data: {
      options: q.options || [],
    },
    options: q.options || [],
  }));

  const handleSubmit = (
    answers: Record<string, string>,
    score: number,
    totalPoints: number,
    startedAt?: string,
    timeSpentSeconds?: number,
  ) => {
    submitQuizAnswers(quizId, answers, score, totalPoints, startedAt, timeSpentSeconds);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 md:p-3 sm:p-1 animate-in fade-in duration-200">
      <QuizContainer
        quizId={quiz.id}
        title={quiz.title}
        description={quiz.description}
        subject={quiz.subject}
        classroomName={quiz.classroomName}
        durationMinutes={quiz.durationMinutes || 10}
        dueDate={quiz.dueDate}
        questions={questions}
        initialAnswers={existingSubmission?.answers || {}}
        isAlreadySubmitted={Boolean(existingSubmission)}
        revealMarksMode={quiz.revealMarksMode}
        onClose={onClose}
        onSubmitAnswers={handleSubmit}
      />
    </div>
  );
};
