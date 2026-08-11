import React from 'react';
import { Flag, ArrowLeft, ArrowRight, CheckSquare, Layers } from 'lucide-react';
import { Question } from './types/quizTypes';
import { useQuizSession } from './hooks/useQuizSession';
import { QuizHeader } from './QuizHeader';
import { QuizProgress } from './QuizProgress';
import { QuizInstructions } from './QuizInstructions';
import { QuestionRenderer } from './QuestionRenderer';
import { QuestionNavigator } from './QuestionNavigator';
import { SubmissionConfirmModal } from './SubmissionConfirmModal';
import { QuizResultView } from './QuizResultView';
import { QuizReviewView } from './QuizReviewView';

interface QuizContainerProps {
  quizId: string;
  title: string;
  description?: string;
  subject: string;
  classroomName: string;
  durationMinutes: number;
  questions: Question[];
  initialAnswers?: Record<string, string>;
  isAlreadySubmitted?: boolean;
  revealMarksMode?: 'immediate' | 'later';
  dueDate?: string;
  onClose: () => void;
  onSubmitAnswers: (
    answers: Record<string, string>,
    score: number,
    totalPoints: number,
    startedAt?: string,
    timeSpentSeconds?: number,
  ) => void;
}

export const QuizContainer: React.FC<QuizContainerProps> = ({
  quizId,
  title,
  description,
  subject,
  classroomName,
  durationMinutes,
  questions,
  initialAnswers = {},
  isAlreadySubmitted = false,
  revealMarksMode = 'immediate',
  dueDate,
  onClose,
  onSubmitAnswers,
}) => {
  const isPastDue = dueDate ? new Date(`${dueDate}T23:59:59`) < new Date() : false;

  const { state, currentQuestion, resultSummary, actions } = useQuizSession({
    quizId,
    questions,
    durationMinutes,
    initialAnswers,
    isAlreadySubmitted,
    onFinishSubmission: onSubmitAnswers,
  });

  const handleClose = () => {
    if (state.status === 'taking') {
      const confirmed = window.confirm(
        'Leaving will not pause the timer. Your quiz will keep running. Are you sure you want to exit?',
      );
      if (!confirmed) return;
    }
    onClose();
  };

  const totalPoints = questions.reduce((acc, q) => acc + q.points, 0);

  // LANDING / INSTRUCTIONS STATE
  if (state.status === 'landing') {
    return (
      <div className="w-full max-w-4xl max-h-[95vh] bg-white dark:bg-[#1d281c] rounded-2xl md:rounded-3xl shadow-2xl border border-[#EDEAE2] dark:border-[#2b3d2a] overflow-y-auto">
        <QuizHeader
          title={title}
          subject={subject}
          classroomName={classroomName}
          currentQuestionIndex={0}
          totalQuestions={questions.length}
          timeRemainingSeconds={durationMinutes * 60}
          showTimer={false}
          onClose={handleClose}
        />
        {isPastDue ? (
          <div className="p-8 text-center space-y-3">
            <p className="font-bold text-red-600">This quiz is past its due date.</p>
            <p className="text-sm text-slate-500">You can no longer start this assessment.</p>
            <button
              onClick={handleClose}
              className="px-6 py-2 rounded-xl bg-slate-200 font-bold text-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <QuizInstructions
            title={title}
            description={description}
            subject={subject}
            classroomName={classroomName}
            durationMinutes={durationMinutes}
            totalQuestions={questions.length}
            totalPoints={totalPoints}
            onStart={actions.startQuiz}
          />
        )}
      </div>
    );
  }

  // COMPLETED SCORE SUMMARY STATE
  if (state.status === 'completed') {
    return (
      <div className="w-full max-w-3xl max-h-[95vh] bg-white dark:bg-[#1d281c] rounded-2xl md:rounded-3xl shadow-2xl border border-[#EDEAE2] dark:border-[#2b3d2a] overflow-y-auto">
        {state.isTimeUp && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 text-center">
            <p className="font-black text-amber-800 text-sm">Time&apos;s Up!</p>
            <p className="text-xs text-amber-700">Your quiz was automatically submitted.</p>
          </div>
        )}
        <QuizResultView
          title={title}
          result={resultSummary}
          revealMarksMode={revealMarksMode}
          onReview={actions.startReview}
          onClose={handleClose}
        />
      </div>
    );
  }

  // REVIEW ANSWERS MODE STATE
  if (state.status === 'reviewing') {
    return (
      <div className="w-full max-w-4xl max-h-[95vh] bg-white dark:bg-[#1d281c] rounded-2xl md:rounded-3xl shadow-2xl border border-[#EDEAE2] dark:border-[#2b3d2a] overflow-y-auto">
        <QuizReviewView
          questions={questions}
          answers={state.answers}
          onBackToResults={actions.backToResults}
          onClose={handleClose}
        />
      </div>
    );
  }

  // ACTIVE QUIZ-TAKING SESSION STATE ('taking' or 'confirming')
  const isFlagged = currentQuestion ? state.flaggedQuestions.has(currentQuestion.id) : false;
  const isLastQuestion = state.currentQuestionIndex === questions.length - 1;
  const answeredCount = Object.keys(state.answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="w-full h-full md:h-[95vh] md:max-w-6xl bg-white dark:bg-[#1d281c] rounded-none md:rounded-3xl shadow-2xl border-0 md:border border-[#EDEAE2] dark:border-[#2b3d2a] overflow-hidden flex flex-col">
      {/* Top Header */}
      <QuizHeader
        title={title}
        subject={subject}
        classroomName={classroomName}
        currentQuestionIndex={state.currentQuestionIndex}
        totalQuestions={questions.length}
        timeRemainingSeconds={state.timeRemainingSeconds}
        showTimer={true}
        onClose={handleClose}
      />

      {/* Progress Bar */}
      <QuizProgress
        currentIndex={state.currentQuestionIndex}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
      />

      {/* Main Split Body: Question Renderer + Question Palette Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden flex-1">
        {/* Question Area */}
        <div className="lg:col-span-8 p-4 md:p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Question {state.currentQuestionIndex + 1} of {questions.length}
              </span>

              {/* Flag Toggle Button */}
              {currentQuestion && (
                <button
                  onClick={() => actions.toggleFlag(currentQuestion.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isFlagged
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600'
                  }`}
                >
                  <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-current' : ''}`} />
                  <span>{isFlagged ? 'Flagged' : 'Flag Question'}</span>
                </button>
              )}
            </div>

            {/* Renderer */}
            {currentQuestion && (
              <QuestionRenderer
                question={currentQuestion}
                answer={state.answers[currentQuestion.id]}
                onAnswer={actions.setAnswer}
              />
            )}
          </div>

          {/* Bottom Action Toolbar */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              disabled={state.currentQuestionIndex === 0}
              onClick={actions.prevQuestion}
              className="px-4 py-2.5 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] text-[#4A6741] font-bold text-xs hover:bg-[#EBF1E8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-3">
              {!isLastQuestion ? (
                <button
                  onClick={actions.nextQuestion}
                  className="px-6 py-2.5 rounded-2xl bg-[#4A6741] text-white font-extrabold text-xs hover:bg-[#3D5535] transition-colors shadow-md shadow-[#4A6741]/20 flex items-center gap-1.5"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={actions.openConfirmModal}
                  className="px-6 py-2.5 rounded-2xl bg-[#4A6741] text-white font-extrabold text-xs hover:bg-[#3D5535] transition-colors shadow-md shadow-[#4A6741]/20 flex items-center gap-1.5"
                >
                  <CheckSquare className="w-4 h-4" />
                  Review & Submit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Question Palette */}
        <div className="lg:col-span-4 border-t lg:border-t-0 border-slate-200 dark:border-slate-800 overflow-hidden">
          <QuestionNavigator
            questions={questions}
            currentIndex={state.currentQuestionIndex}
            answers={state.answers}
            flaggedQuestions={state.flaggedQuestions}
            visitedQuestions={state.visitedQuestions}
            onSelectQuestion={actions.goToQuestion}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      {state.status === 'confirming' && (
        <SubmissionConfirmModal
          totalQuestions={questions.length}
          answeredCount={answeredCount}
          unansweredCount={unansweredCount}
          flaggedCount={state.flaggedQuestions.size}
          onCancel={actions.closeConfirmModal}
          onConfirm={actions.confirmSubmit}
        />
      )}
    </div>
  );
};
