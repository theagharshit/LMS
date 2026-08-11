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
    <div className="space-y-1.5 px-6 py-3 bg-[#F9F7F2]/80 dark:bg-[#1d281c] border border-[#EDEAE2] dark:border-[#2b3d2a]">
      <div className="flex items-center justify-between text-[11px] font-bold text-[#7A7A72] dark:text-slate-300">
        <span>
          Question{' '}
          <strong className="text-[#4A6741] dark:text-emerald-400">{currentIndex + 1}</strong> of{' '}
          {totalQuestions}
        </span>
        <span>
          {answeredCount} Answered ({answeredPercentage}%)
        </span>
      </div>

      <div className="relative w-full h-2 rounded-full bg-[#EDEAE2] dark:bg-[#2b3d2a] overflow-hidden">
        {/* Background track for answered count */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-[#EBF1E8] dark:bg-[#214126] transition-all duration-300"
          style={{ width: `${answeredPercentage}%` }}
        />
        {/* Foreground track for current position */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-[#4A6741] transition-all duration-300 shadow-sm"
          style={{ width: `${currentPercentage}%` }}
        />
      </div>
    </div>
  );
};
