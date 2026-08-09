import React from 'react';

interface QuizProgressProps {
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
}

export const QuizProgress: React.FC<QuizProgressProps> = ({
  currentIndex,
  totalQuestions,
  answeredCount,
}) => {
  const currentPercentage =
    totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;
  const answeredPercentage =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-1.5 px-6 py-3 bg-slate-50/80 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <span>
          Question{' '}
          <strong className="text-purple-600 dark:text-purple-400">{currentIndex + 1}</strong> of{' '}
          {totalQuestions}
        </span>
        <span>
          {answeredCount} Answered ({answeredPercentage}%)
        </span>
      </div>

      <div className="relative w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
        {/* Background track for answered count */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-purple-200 dark:bg-purple-900/40 transition-all duration-300"
          style={{ width: `${answeredPercentage}%` }}
        />
        {/* Foreground track for current position */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300 shadow-sm"
          style={{ width: `${currentPercentage}%` }}
        />
      </div>
    </div>
  );
};
