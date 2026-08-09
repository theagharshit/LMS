import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  UserCheck,
  Search,
  Sparkles,
  ChevronRight,
  AlertCircle,
  FileCheck,
  Check,
} from 'lucide-react';

interface TeacherQuizManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeacherQuizManagementModal: React.FC<TeacherQuizManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { quizzes, quizSubmissions, studentProfiles, updateQuizMarksMode } = useApp();
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(quizzes[0]?.id || null);
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeQuiz = quizzes.find((q) => q.id === selectedQuizId) || quizzes[0];
  const activeQuizSubmissions = activeQuiz
    ? quizSubmissions.filter((s) => s.quizId === activeQuiz.id)
    : [];

  const pendingReleaseCount = quizzes.filter((q) => q.revealMarksMode === 'later').length;

  const handlePublishMarks = (quizId: string) => {
    updateQuizMarksMode(quizId, 'immediate');
    setPublishSuccessMsg('Marks and detailed solutions have been published to students!');
    setTimeout(() => setPublishSuccessMsg(null), 4000);
  };

  const getStudentProfile = (studentId: string) => {
    return studentProfiles.find((s) => s.id === studentId);
  };

  const activeSubmissionDetail = inspectStudentId
    ? activeQuizSubmissions.find((s) => s.studentId === inspectStudentId)
    : null;

  const getGrade = (score: number, totalPoints: number) => {
    if (totalPoints === 0) return 'N/A';
    const pct = Math.round((score / totalPoints) * 100);
    if (pct >= 90) return `Grade A+ (${pct}%)`;
    if (pct >= 80) return `Grade A (${pct}%)`;
    if (pct >= 70) return `Grade B (${pct}%)`;
    if (pct >= 60) return `Grade C (${pct}%)`;
    return `Grade D (${pct}%)`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-lg">
                Teacher Quiz Evaluation & Marks Publishing Desk
              </h2>
              <p className="text-xs text-purple-100">
                Inspect student attempts, review itemized response logs, and publish scores to
                students
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

        {/* Top Metric Bar */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-500">Total Quizzes</span>
            <p className="font-black text-base text-purple-600 dark:text-purple-400">
              {quizzes.length} Quizzes Created
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-500">Student Attempts</span>
            <p className="font-black text-base text-emerald-600 dark:text-emerald-400">
              {quizSubmissions.length} Submissions
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-500">Pending Release</span>
            <p className="font-black text-base text-amber-600 dark:text-amber-400">
              {pendingReleaseCount} Quizzes Withheld
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-500">Selected Quiz</span>
            <p className="font-black text-base text-slate-800 dark:text-slate-200 truncate">
              {activeQuiz?.title || 'None'}
            </p>
          </div>
        </div>

        {/* Banner Alert if Published */}
        {publishSuccessMsg && (
          <div className="px-5 py-3 bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>{publishSuccessMsg}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Panel: Quiz Selector */}
          <div className="md:col-span-4 p-4 border-r border-slate-200 dark:border-slate-800 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">
              Select Assessment ({quizzes.length})
            </h3>

            {quizzes.map((q) => {
              const subsCount = quizSubmissions.filter((s) => s.quizId === q.id).length;
              const isSelected = selectedQuizId === q.id;
              const isLater = q.revealMarksMode === 'later';

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setSelectedQuizId(q.id);
                    setInspectStudentId(null);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 dark:border-purple-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                      {q.subject}
                    </span>
                    {isLater ? (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending Release
                      </span>
                    ) : (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Published
                      </span>
                    )}
                  </div>

                  <h4 className="font-black text-xs text-slate-900 dark:text-white">{q.title}</h4>
                  <p className="text-[11px] text-slate-500">{q.classroomName}</p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <span>{q.questions.length} Questions</span>
                    <span className="text-purple-600 dark:text-purple-400 font-extrabold">
                      {subsCount} Student Attempts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Panel: Quiz Evaluation Desk */}
          <div className="md:col-span-8 p-6 overflow-y-auto space-y-5 flex flex-col">
            {activeQuiz ? (
              <>
                {/* Active Quiz Header & Publish Action */}
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                        {activeQuiz.classroomName} • {activeQuiz.subject}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {activeQuiz.title}
                      </h3>
                      <p className="text-xs text-slate-500">{activeQuiz.description}</p>
                    </div>

                    {/* Publish Marks Control */}
                    {activeQuiz.revealMarksMode === 'later' ? (
                      <button
                        onClick={() => handlePublishMarks(activeQuiz.id)}
                        className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                        <span>Publish Marks & Solutions to Students</span>
                      </button>
                    ) : (
                      <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center gap-1.5 shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Marks Live & Released to Students</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submissions Section */}
                <div className="space-y-3 flex-1">
                  <h4 className="font-black text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Student Submissions & Evaluation Records ({activeQuizSubmissions.length})
                  </h4>

                  {activeQuizSubmissions.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 space-y-2">
                      <UserCheck className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-bold text-xs">No Submissions Recorded Yet</p>
                      <p className="text-[11px]">
                        As soon as students complete this quiz, their full response logs will appear
                        here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeQuizSubmissions.map((sub) => {
                        const student = getStudentProfile(sub.studentId);
                        const totalPoints = activeQuiz.questions.reduce(
                          (acc, q) => acc + q.points,
                          0,
                        );
                        const grade = getGrade(sub.score, totalPoints);
                        const isInspected = inspectStudentId === sub.studentId;

                        return (
                          <div
                            key={sub.id}
                            className={`p-4 rounded-2xl border transition-all space-y-3 ${
                              isInspected
                                ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-400'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                  {student?.name ? student.name.charAt(0) : 'S'}
                                </div>
                                <div>
                                  <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                                    {student?.name || `Student ID: ${sub.studentId}`}
                                  </h5>
                                  <p className="text-[11px] text-slate-500">
                                    Submitted at {sub.completedAt || 'Recently'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="font-black text-sm text-purple-600 dark:text-purple-400 block">
                                    {sub.score} / {totalPoints} Marks
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {grade}
                                  </span>
                                </div>

                                <button
                                  onClick={() =>
                                    setInspectStudentId(isInspected ? null : sub.studentId)
                                  }
                                  className="px-3 py-1.5 rounded-xl border border-purple-600 text-purple-600 dark:text-purple-400 font-bold text-xs hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{isInspected ? 'Hide Logs' : 'Inspect Answers'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Itemized Answer Log when Inspected */}
                            {isInspected && (
                              <div className="pt-3 border-t border-purple-200 dark:border-purple-900/60 space-y-3 animate-in fade-in duration-200">
                                <h6 className="font-extrabold text-[11px] text-purple-900 dark:text-purple-200 uppercase">
                                  Itemized Student Answer Breakdown:
                                </h6>

                                {activeQuiz.questions.map((q, qIdx) => {
                                  const studentAnswer = sub.answers[q.id];
                                  const isCorrect = studentAnswer === q.correctAnswer;

                                  return (
                                    <div
                                      key={q.id}
                                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="font-bold text-slate-800 dark:text-slate-200">
                                          Q{qIdx + 1}. {q.text}
                                        </p>
                                        <span
                                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                                            isCorrect
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-rose-100 text-rose-800'
                                          }`}
                                        >
                                          {isCorrect ? `+${q.points} Marks (Correct)` : '0 Marks'}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                          <span className="text-[10px] font-bold text-slate-500 block">
                                            Student's Selected Answer:
                                          </span>
                                          <span
                                            className={`font-extrabold ${
                                              isCorrect ? 'text-emerald-600' : 'text-rose-600'
                                            }`}
                                          >
                                            {studentAnswer || 'Not Answered'}
                                          </span>
                                        </div>

                                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block">
                                            Official Correct Answer:
                                          </span>
                                          <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                                            {q.correctAnswer}
                                          </span>
                                        </div>
                                      </div>

                                      {q.explanation && (
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic pt-1">
                                          Solution Note: {q.explanation}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-slate-400 font-bold">
                Select a quiz from the left panel to inspect student evaluation records.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-purple-600 text-white font-extrabold text-xs hover:bg-purple-700 transition-colors shadow-md"
          >
            Close Evaluation Portal
          </button>
        </div>
      </div>
    </div>
  );
};
