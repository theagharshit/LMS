import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, ArrowLeft, Filter } from 'lucide-react';
import { Question } from './types/quizTypes';
import { questionTypeRegistry } from './registry/questionTypeRegistry';

interface QuizReviewViewProps {
  questions: Question[];
  answers: Record<string, string>;
  onBackToResults: () => void;
  onClose: () => void;
}

export const QuizReviewView: React.FC<QuizReviewViewProps> = ({
  questions,
  answers,
  onBackToResults,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');

  const reviewedQuestions = questions.map((q, index) => {
    const handler = questionTypeRegistry.getHandler(q.type);
    const summary = handler?.getAnswerSummary
      ? handler.getAnswerSummary(q, answers[q.id])
      : {
          isCorrect: answers[q.id] === q.correctAnswer,
          displayAnswer: answers[q.id] || 'Not Answered',
          correctAnswerDisplay: q.correctAnswer || 'N/A',
        };

    return {
      question: q,
      index,
      summary,
    };
  });

  const filteredItems = reviewedQuestions.filter((item) => {
    if (filter === 'correct') return item.summary.isCorrect;
    if (filter === 'incorrect') return !item.summary.isCorrect;
    return true;
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 text-slate-800 dark:text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Solutions & Answer Review
          </h2>
          <p className="text-xs text-slate-500">
            Review your responses against official correct answers and explanations.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg transition-colors ${filter === 'all' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs' : 'text-slate-500'}`}
          >
            All ({questions.length})
          </button>
          <button
            onClick={() => setFilter('correct')}
            className={`px-3 py-1 rounded-lg transition-colors ${filter === 'correct' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}
          >
            Correct
          </button>
          <button
            onClick={() => setFilter('incorrect')}
            className={`px-3 py-1 rounded-lg transition-colors ${filter === 'incorrect' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-slate-500'}`}
          >
            Incorrect
          </button>
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            {filter === 'correct' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xl font-black">
                  💪
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Keep Pushing & Work Harder!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  No correct answers in this section yet. Don't get discouraged — review the lesson
                  concepts, practice more problems, and you'll master this next time!
                </p>
              </>
            ) : filter === 'incorrect' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl font-black">
                  🌟
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Flawless Perfection! You're Doing Great!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Zero incorrect answers! You got every question right. Keep up the fantastic effort
                  and brilliant work!
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500 font-bold">No questions found to display.</p>
            )}
          </div>
        ) : (
          filteredItems.map(({ question: q, index: i, summary }) => {
            return (
              <div
                key={q.id}
                className={`p-5 rounded-3xl border space-y-3 transition-all ${
                  summary.isCorrect
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-extrabold text-slate-500 uppercase">
                    Question {i + 1} ({q.points} {q.points === 1 ? 'Point' : 'Points'})
                  </span>
                  {summary.isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+{q.points})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 rounded-full">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect (0/{q.points})
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed">
                  {q.prompt}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Your Answer</p>
                    <p
                      className={`font-extrabold mt-0.5 ${summary.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {summary.displayAnswer}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Correct Answer</p>
                    <p className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {summary.correctAnswerDisplay}
                    </p>
                  </div>
                </div>

                {q.explanation && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 text-xs space-y-1">
                    <p className="font-extrabold text-purple-700 dark:text-purple-300 text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" /> Explanation & Concept
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={onBackToResults}
          className="px-5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Score Summary
        </button>

        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-2xl bg-purple-600 text-white font-extrabold text-xs hover:bg-purple-700 transition-colors shadow-md"
        >
          Close Review
        </button>
      </div>
    </div>
  );
};
