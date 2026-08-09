import React from 'react';
import { useApp } from '../../context/AppContext';
import { QuizContainer } from '../quiz/QuizContainer';
import { Question } from '../quiz/types/quizTypes';

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

  const handleSubmit = (answers: Record<string, string>, score: number, totalPoints: number) => {
    submitQuizAnswers(quizId, answers, score, totalPoints);
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
        questions={questions}
        initialAnswers={existingSubmission?.answers || {}}
        isAlreadySubmitted={Boolean(existingSubmission)}
        onClose={onClose}
        onSubmitAnswers={handleSubmit}
      />
    </div>
  );
};
