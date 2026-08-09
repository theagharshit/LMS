import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Award, CheckCircle2, Clock, BookOpen, Eye, ShieldAlert, Sparkles } from 'lucide-react';

interface CompletedQuizzesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewQuiz: (quizId: string) => void;
}

export const CompletedQuizzesModal: React.FC<CompletedQuizzesModalProps> = ({
  isOpen,
  onClose,
  onReviewQuiz,
}) => {
  const { quizzes, quizSubmissions, currentUser, classrooms } = useApp();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all');

  if (!isOpen) return null;

  // Get all quiz submissions for current student
  const studentSubmissions = quizSubmissions.filter((s) => s.studentId === currentUser.id);

  // Map submissions to full quiz objects
  const completedQuizItems = studentSubmissions.map((sub) => {
    const quiz = quizzes.find((q) => q.id === sub.quizId);
    return {
      submission: sub,
      quiz,
    };
  });

  const filteredItems = completedQuizItems.filter(({ quiz }) => {
    if (selectedClassroomId === 'all') return true;
    return quiz?.classroomId === selectedClassroomId;
  });

  const getGradeLabel = (score: number, totalPoints: number) => {
    if (totalPoints === 0) return 'Grade N/A';
    const pct = Math.round((score / totalPoints) * 100);
    if (pct >= 90) return `Grade A+ (${pct}%)`;
    if (pct >= 80) return `Grade A (${pct}%)`;
    if (pct >= 70) return `Grade B (${pct}%)`;
    if (pct >= 60) return `Grade C (${pct}%)`;
    return `Grade D (${pct}%)`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-lg">My Completed Quizzes & Evaluation Dashboard</h2>
              <p className="text-xs text-purple-100">
                Track your finished online assessments, scores, and solution reviews across all
                subjects
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-2xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            Classroom:
          </span>
          <button
            onClick={() => setSelectedClassroomId('all')}
            className={`px-3 py-1.5 rounded-full font-bold text-xs transition-colors shrink-0 ${
              selectedClassroomId === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-300'
            }`}
          >
            All Classes ({completedQuizItems.length})
          </button>

          {classrooms.map((cls) => {
            const count = completedQuizItems.filter(
              ({ quiz }) => quiz?.classroomId === cls.id,
            ).length;
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClassroomId(cls.id)}
                className={`px-3 py-1.5 rounded-full font-bold text-xs transition-colors shrink-0 ${
                  selectedClassroomId === cls.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-300'
                }`}
              >
                {cls.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Completed Quizzes List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                No Completed Quizzes Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Quizzes you complete will appear here with instant grades, scores, and answer
                explanations.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map(({ submission, quiz }) => {
                const isLater = quiz?.revealMarksMode === 'later';
                const totalPoints = quiz
                  ? quiz.questions.reduce((acc, q) => acc + q.points, 0)
                  : submission.totalPoints;
                const gradeText = getGradeLabel(submission.score, totalPoints);

                return (
                  <div
                    key={submission.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {quiz?.subject || 'Assessment'}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {submission.completedAt || 'Recently'}
                        </span>
                      </div>

                      <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                        {quiz?.title || 'Online Quiz Assessment'}
                      </h3>
                      <p className="text-xs text-slate-500">{quiz?.classroomName}</p>

                      {/* Score / Status Card */}
                      {isLater ? (
                        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 space-y-0.5">
                          <p className="font-extrabold text-xs flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Grade Pending Teacher Release
                          </p>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400">
                            Your attempt was recorded. Teacher will release marks later.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase block">
                              Score Achieved
                            </span>
                            <span className="font-black text-base text-emerald-600 dark:text-emerald-400">
                              {submission.score} / {totalPoints} Marks
                            </span>
                          </div>
                          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-600 text-white shadow-xs">
                            {gradeText}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      {isLater ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold text-xs cursor-not-allowed opacity-70 flex items-center justify-center gap-1.5"
                        >
                          <Clock className="w-4 h-4" />
                          <span>Results Under Teacher Review</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (quiz) {
                              onReviewQuiz(quiz.id);
                            }
                          }}
                          className="w-full py-2.5 rounded-2xl border border-purple-600 text-purple-600 dark:text-purple-400 font-extrabold text-xs hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Review Quiz & Solutions</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-purple-600 text-white font-extrabold text-xs hover:bg-purple-700 transition-colors shadow-md"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
