import React from 'react';
import { Play, Clock, HelpCircle, Award, CheckCircle2, ShieldAlert } from 'lucide-react';

interface QuizInstructionsProps {
  title: string;
  description?: string;
  subject: string;
  classroomName: string;
  durationMinutes: number;
  totalQuestions: number;
  totalPoints: number;
  onStart: () => void;
}

export const QuizInstructions: React.FC<QuizInstructionsProps> = ({
  title,
  description,
  subject,
  classroomName,
  durationMinutes,
  totalQuestions,
  totalPoints,
  onStart,
}) => {
  return (
    <div className="py-8 px-6 max-w-xl mx-auto space-y-6 text-slate-800 dark:text-slate-200">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-extrabold text-[11px] uppercase tracking-wider">
          {subject} • {classroomName}
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {description}
          </p>
        )}
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
          <Clock className="w-5 h-5 mx-auto text-purple-600 dark:text-purple-400" />
          <p className="text-[10px] font-bold text-slate-500 uppercase">Duration</p>
          <p className="font-extrabold text-sm text-slate-900 dark:text-white">
            {durationMinutes} Mins
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
          <HelpCircle className="w-5 h-5 mx-auto text-blue-600 dark:text-blue-400" />
          <p className="text-[10px] font-bold text-slate-500 uppercase">Questions</p>
          <p className="font-extrabold text-sm text-slate-900 dark:text-white">
            {totalQuestions} Items
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
          <Award className="w-5 h-5 mx-auto text-amber-500" />
          <p className="text-[10px] font-bold text-slate-500 uppercase">Total Marks</p>
          <p className="font-extrabold text-sm text-slate-900 dark:text-white">
            {totalPoints} Points
          </p>
        </div>
      </div>

      {/* Instructions list */}
      <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-2 text-xs">
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-purple-600" />
          Important Quiz Instructions:
        </h4>
        <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed text-[11px]">
          <li>Ensure a stable internet connection before starting the attempt.</li>
          <li>You can navigate back and forth between questions using the Question Palette.</li>
          <li>Use the ⚑ Flag icon to mark questions for review before submitting.</li>
          <li>The quiz will automatically submit when the countdown timer reaches zero.</li>
        </ul>
      </div>

      <button
        onClick={onStart}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-sm hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      >
        <Play className="w-4 h-4 fill-current" />
        Start Quiz Attempt
      </button>
    </div>
  );
};
