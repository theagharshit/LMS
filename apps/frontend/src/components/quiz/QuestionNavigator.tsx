import React, { useState } from 'react';
import { Flag, CheckCircle, Circle, Bookmark } from 'lucide-react';
import { Question } from './types/quizTypes';

interface QuestionNavigatorProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  visitedQuestions: Set<string>;
  onSelectQuestion: (index: number) => void;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentIndex,
  answers,
  flaggedQuestions,
  visitedQuestions,
  onSelectQuestion,
}) => {
  const [filter, setFilter] = useState<'all' | 'answered' | 'unanswered' | 'flagged'>('all');

  const filteredIndexes = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => {
      const isAnswered = Boolean(answers[q.id]);
      const isFlagged = flaggedQuestions.has(q.id);
      if (filter === 'answered') return isAnswered;
      if (filter === 'unanswered') return !isAnswered;
      if (filter === 'flagged') return isFlagged;
      return true;
    });

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flaggedQuestions.size;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  return (
    <div className="w-full h-full bg-[#F9F7F2] dark:bg-[#1d281c] border-l border-[#EDEAE2] dark:border-[#2b3d2a] p-4 flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Bookmark className="w-4 h-4 text-[#4A6741]" />
          Question Palette
        </h3>
        <span className="text-[11px] font-semibold text-slate-500">
          {answeredCount}/{questions.length} Answered
        </span>
      </div>

      {/* Filter tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#EBF1E8] dark:bg-[#214126] text-[10px] font-bold border border-[#EDEAE2] dark:border-[#2b3d2a]">
        <button
          onClick={() => setFilter('all')}
          className={`py-1.5 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-white dark:bg-[#214126] text-[#4A6741] dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          All ({questions.length})
        </button>
        <button
          onClick={() => setFilter('answered')}
          className={`py-1.5 rounded-lg transition-colors ${
            filter === 'answered'
              ? 'bg-white dark:bg-[#214126] text-[#4A6741] dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Done ({answeredCount})
        </button>
        <button
          onClick={() => setFilter('unanswered')}
          className={`py-1.5 rounded-lg transition-colors ${
            filter === 'unanswered'
              ? 'bg-white dark:bg-[#214126] text-[#4A6741] dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Left ({unansweredCount})
        </button>
        <button
          onClick={() => setFilter('flagged')}
          className={`py-1.5 rounded-lg transition-colors ${
            filter === 'flagged'
              ? 'bg-white dark:bg-[#214126] text-[#4A6741] dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Flag ({flaggedCount})
        </button>
      </div>

      {/* Grid of Question Buttons */}
      <div className="grid grid-cols-5 sm:grid-cols-4 md:grid-cols-5 gap-2 overflow-y-auto max-h-60 sm:max-h-80 pr-1">
        {filteredIndexes.map(({ q, i }) => {
          const isCurrent = i === currentIndex;
          const isAnswered = Boolean(answers[q.id]);
          const isFlagged = flaggedQuestions.has(q.id);

          return (
            <button
              key={q.id}
              onClick={() => onSelectQuestion(i)}
              className={`relative h-10 rounded-xl font-extrabold text-xs flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[#4A6741] ${
                isCurrent
                  ? 'bg-[#4A6741] text-white ring-2 ring-[#4A6741] ring-offset-2 dark:ring-offset-[#1d281c] shadow-md'
                  : isAnswered
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-white dark:bg-[#1d281c] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2b3d2a] hover:border-[#88A070]'
              }`}
            >
              <span>{i + 1}</span>
              {isFlagged && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px] shadow-xs">
                  ⚑
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status Legend */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-[#4A6741]" />
          <span>Current Position</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700" />
          <span>Answered Question</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
          <span>Unanswered Question</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 text-white text-[8px] flex items-center justify-center font-bold">
            ⚑
          </div>
          <span>Flagged for Review</span>
        </div>
      </div>
    </div>
  );
};
