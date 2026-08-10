import React from 'react';
import { AlertCircle, HelpCircle, Flag, ArrowLeft, Send } from 'lucide-react';

interface SubmissionConfirmModalProps {
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const SubmissionConfirmModal: React.FC<SubmissionConfirmModalProps> = ({
  totalQuestions,
  answeredCount,
  unansweredCount,
  flaggedCount,
  onCancel,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center mx-auto text-xl shadow-xs">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Submit Quiz?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Are you sure you want to finish and submit your attempt?
          </p>
        </div>

        {/* Breakdown Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
          <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Answered Questions:
            </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
              {answeredCount} of {totalQuestions}
            </strong>
          </div>

          <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Unanswered Questions:
            </span>
            <strong
              className={
                unansweredCount > 0
                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-slate-500'
              }
            >
              {unansweredCount}
            </strong>
          </div>

          {flaggedCount > 0 && (
            <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Flag className="w-3.5 h-3.5" />
                Flagged for Review:
              </span>
              <strong className="text-amber-600 dark:text-amber-400 font-bold">
                {flaggedCount}
              </strong>
            </div>
          )}
        </div>

        {unansweredCount > 0 && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-center font-medium">
            ⚠️ You still have {unansweredCount} unanswered{' '}
            {unansweredCount === 1 ? 'question' : 'questions'}.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onCancel}
            className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className="py-2.5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            Submit Quiz
          </button>
        </div>
      </div>
    </div>
  );
};
