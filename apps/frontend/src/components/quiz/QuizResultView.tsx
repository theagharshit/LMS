import React from 'react';
import { Award, CheckCircle2, XCircle, AlertCircle, Eye, X } from 'lucide-react';
import { QuizResultSummary } from './types/quizTypes';

interface QuizResultViewProps {
  title: string;
  result: QuizResultSummary;
  onReview: () => void;
  onClose: () => void;
}

export const QuizResultView: React.FC<QuizResultViewProps> = ({
  title,
  result,
  onReview,
  onClose,
}) => {
  const getGrade = (percentage: number) => {
    if (percentage >= 90)
      return {
        label: 'A+ (Outstanding)',
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300',
      };
    if (percentage >= 80)
      return {
        label: 'A (Excellent)',
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300',
      };
    if (percentage >= 70)
      return {
        label: 'B (Very Good)',
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 border-blue-300',
      };
    if (percentage >= 60)
      return {
        label: 'C (Good)',
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 border-purple-300',
      };
    return {
      label: 'D (Needs Practice)',
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-300',
    };
  };

  const grade = getGrade(result.percentage);

  return (
    <div className="py-8 px-6 max-w-xl mx-auto space-y-6 text-center text-slate-800 dark:text-slate-200">
      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-900 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-amber-500/20">
        🏆
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Quiz Complete!</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Your attempt for <strong>{title}</strong> has been logged into your Sikshya LMS Profile.
        </p>
      </div>

      {/* Main Score Banner */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
          Your Score
        </p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-4xl font-black text-purple-600 dark:text-purple-400">
            {result.score}
          </span>
          <span className="text-lg font-bold text-slate-400">/ {result.totalPoints} Marks</span>
          <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 ml-2">
            ({result.percentage}%)
          </span>
        </div>
        <div
          className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold border ${grade.color}`}
        >
          Grade: {grade.label}
        </div>
      </div>

      {/* Breakdown Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-1">
          <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-600 dark:text-emerald-400" />
          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
            Correct
          </p>
          <p className="font-black text-base text-emerald-600 dark:text-emerald-400">
            {result.correctCount}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 space-y-1">
          <XCircle className="w-5 h-5 mx-auto text-rose-600 dark:text-rose-400" />
          <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">
            Incorrect
          </p>
          <p className="font-black text-base text-rose-600 dark:text-rose-400">
            {result.incorrectCount}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-1">
          <AlertCircle className="w-5 h-5 mx-auto text-amber-600 dark:text-amber-400" />
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
            Unanswered
          </p>
          <p className="font-black text-base text-amber-600 dark:text-amber-400">
            {result.unansweredCount}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={onReview}
          className="py-3 rounded-2xl border border-purple-600 text-purple-600 dark:text-purple-400 font-extrabold text-xs hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Eye className="w-4 h-4" />
          Review Answers & Solutions
        </button>

        <button
          onClick={onClose}
          className="py-3 rounded-2xl bg-purple-600 text-white font-extrabold text-xs hover:bg-purple-700 transition-colors shadow-md flex items-center justify-center gap-1.5"
        >
          <X className="w-4 h-4" />
          Close & Back to Course
        </button>
      </div>
    </div>
  );
};
