import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QuizQuestion } from '@lms/shared';
import {
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  UserCheck,
  Award,
  Layers,
  FileCheck,
  Zap,
} from 'lucide-react';

export const TeacherQuizHubView: React.FC = () => {
  const { classrooms, addQuiz, quizzes, quizSubmissions, studentProfiles, updateQuizMarksMode } =
    useApp();

  // Active Tab: 'creator' | 'evaluation'
  const [activeTab, setActiveTab] = useState<'creator' | 'evaluation'>('creator');

  // --- QUIZ CREATOR STATE ---
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(
    classrooms[0]?.id || 'cls-math-8a',
  );
  const [subject, setSubject] = useState('Mathematics');
  const [topic, setTopic] = useState('Algebra & Factorization');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [revealMarksMode, setRevealMarksMode] = useState<'immediate' | 'later'>('immediate');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q-1',
      text: 'What is the correct expansion of (a + b)²?',
      type: 'MCQ',
      options: ['a² + b²', 'a² + 2ab + b²', 'a² - 2ab + b²', '2a + 2b'],
      correctAnswer: 'a² + 2ab + b²',
      explanation: 'Using the algebraic identity, (a + b)² = (a + b)(a + b) = a² + 2ab + b².',
      points: 5,
    },
    {
      id: 'q-2',
      text: 'Factorize: x² - 9',
      type: 'MCQ',
      options: ['(x - 3)(x - 3)', '(x + 3)(x - 3)', '(x + 9)(x - 1)', '(x - 9)(x + 1)'],
      correctAnswer: '(x + 3)(x - 3)',
      explanation: 'Difference of squares formula: a² - b² = (a + b)(a - b). Here b = 3.',
      points: 5,
    },
  ]);

  // --- QUIZ EVALUATION STATE ---
  const [selectedEvalQuizId, setSelectedEvalQuizId] = useState<string | null>(
    quizzes[0]?.id || null,
  );
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);

  // --- CREATOR HANDLERS ---
  const handleAddQuestion = () => {
    const nextNum = questions.length + 1;
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      text: `New question #${nextNum} prompt text`,
      type: 'MCQ',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: 'Explanation for correct answer',
      points: 5,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuestionText = (index: number, text: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
  };

  const handleUpdateQuestionPoints = (index: number, points: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], points };
      return updated;
    });
  };

  const handleUpdateQuestionExplanation = (index: number, explanation: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], explanation };
      return updated;
    });
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, newOptionText: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const currentQ = updated[qIndex];
      const newOptions = [...(currentQ.options || [])];
      const oldVal = newOptions[optIndex];
      newOptions[optIndex] = newOptionText;

      let newCorrect = currentQ.correctAnswer;
      if (currentQ.correctAnswer === oldVal) {
        newCorrect = newOptionText;
      }

      updated[qIndex] = {
        ...currentQ,
        options: newOptions,
        correctAnswer: newCorrect,
      };
      return updated;
    });
  };

  const handleSelectCorrectOption = (qIndex: number, optionText: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], correctAnswer: optionText };
      return updated;
    });
  };

  const handleAiAutoGenerate = async () => {
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai/quiz-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          topic,
          gradeLevel: 'Grade 8',
          questionCount: 3,
        }),
      });
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error('[QuizHub] AI generation error', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handlePublishNewQuiz = () => {
    const targetClass = classrooms.find((c) => c.id === selectedClassroomId) || classrooms[0];
    addQuiz({
      classroomId: targetClass ? targetClass.id : 'cls-math-8a',
      classroomName: targetClass ? targetClass.name : 'Grade 8 Mathematics - Sec A',
      subject,
      title: `${topic} Quiz (${subject})`,
      description: `Teacher assessment for ${subject} - ${topic}`,
      durationMinutes,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      totalQuestions: questions.length,
      questions,
      published: true,
      revealMarksMode,
    });

    setCreateSuccessMsg(`Quiz "${topic}" published successfully to ${targetClass?.name}!`);
    setTimeout(() => setCreateSuccessMsg(null), 4000);
    setActiveTab('evaluation');
  };

  // --- EVALUATION DESK HELPERS ---
  const activeEvalQuiz = quizzes.find((q) => q.id === selectedEvalQuizId) || quizzes[0];
  const activeQuizSubmissions = activeEvalQuiz
    ? quizSubmissions.filter((s) => s.quizId === activeEvalQuiz.id)
    : [];

  const pendingReleaseCount = quizzes.filter((q) => q.revealMarksMode === 'later').length;

  const handlePublishMarks = (quizId: string) => {
    updateQuizMarksMode(quizId, 'immediate');
    setPublishSuccessMsg('Marks & detailed solution explanations released to students!');
    setTimeout(() => setPublishSuccessMsg(null), 4000);
  };

  const getStudentProfile = (studentId: string) => {
    return studentProfiles.find((s) => s.id === studentId);
  };

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
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl natural-banner p-6 md:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold">
              <span>👨‍🏫 Teacher Faculty Portal & Assessment Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif">
              Quiz Creator & Evaluation Management Desk
            </h1>
            <p className="text-xs text-[#FDEEDC] max-w-xl leading-relaxed">
              Design customized multiple-choice tests, configure mark disclosure controls, inspect
              student responses item-by-item, and release final grades.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('creator')}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-sm flex items-center gap-2 ${
                activeTab === 'creator'
                  ? 'bg-white text-[#2D2D2A]'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Create New Quiz</span>
            </button>

            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-sm flex items-center gap-2 ${
                activeTab === 'evaluation'
                  ? 'bg-white text-[#2D2D2A]'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Evaluation Desk ({quizzes.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {createSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-md animate-in slide-in-from-top duration-200">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{createSuccessMsg}</span>
        </div>
      )}

      {publishSuccessMsg && (
        <div className="p-4 rounded-2xl bg-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-md animate-in slide-in-from-top duration-200">
          <Send className="w-5 h-5 shrink-0" />
          <span>{publishSuccessMsg}</span>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'creator' ? (
        /* ================= TAB 1: QUIZ CREATOR ================= */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#EDEAE2] dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-6">
          <div className="flex items-center justify-between border-b border-[#EDEAE2] dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-[#2D2D2A] dark:text-white font-serif">
                Create & Configure Assessment
              </h2>
              <p className="text-xs text-[#7A7A72] dark:text-slate-400">
                Specify class target, question prompts, option choices, points, and score disclosure
                mode
              </p>
            </div>

            <button
              onClick={handleAiAutoGenerate}
              disabled={isAiGenerating}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>{isAiGenerating ? 'AI Generating...' : '✨ Auto-Generate Questions'}</span>
            </button>
          </div>

          {/* Configuration Form Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1 text-[#2D2D2A] dark:text-slate-300">
                Target Classroom:
              </label>
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 font-semibold text-[#2D2D2A] dark:text-slate-200"
              >
                {classrooms.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.subject})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#2D2D2A] dark:text-slate-300">
                Subject Name:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 font-semibold text-[#2D2D2A] dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#2D2D2A] dark:text-slate-300">
                Quiz Topic / Title:
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 font-semibold text-[#2D2D2A] dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#2D2D2A] dark:text-slate-300">
                Duration (Minutes):
              </label>
              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 10)}
                className="w-full p-3 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 font-semibold text-[#2D2D2A] dark:text-slate-200"
              />
            </div>
          </div>

          {/* Reveal Marks Setting Card */}
          <div className="p-4 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800/80 border border-[#EDEAE2] dark:border-slate-700 space-y-2 text-xs">
            <label className="block font-extrabold text-[#2D2D2A] dark:text-slate-200">
              Score & Results Disclosure Setting:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRevealMarksMode('immediate')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  revealMarksMode === 'immediate'
                    ? 'bg-[#EBF1E8] border-[#88A070] text-[#2D2D2A] shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-[#EDEAE2] dark:border-slate-700 text-[#7A7A72]'
                }`}
              >
                <Zap className="w-5 h-5 text-[#4A6741] shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-xs">Reveal Marks Immediately</span>
                  <span className="text-[11px] opacity-80 leading-tight block">
                    Students see instant scores, percentages, and solution explanations upon
                    submission.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRevealMarksMode('later')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  revealMarksMode === 'later'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-[#EDEAE2] dark:border-slate-700 text-[#7A7A72]'
                }`}
              >
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-xs">
                    Share Marks Later (Teacher Review)
                  </span>
                  <span className="text-[11px] opacity-80 leading-tight block">
                    Scores and solutions are withheld until released by the teacher via the
                    Evaluation Desk.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Manage Questions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-[#2D2D2A] dark:text-slate-200 uppercase tracking-wider">
                Manage Quiz Questions ({questions.length}):
              </h3>

              <button
                onClick={handleAddQuestion}
                className="px-3.5 py-1.5 rounded-xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535] transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id}
                  className="p-5 rounded-3xl bg-[#F9F7F2] dark:bg-slate-800/80 border border-[#EDEAE2] dark:border-slate-700 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-black text-xs text-[#4A6741] dark:text-emerald-400 uppercase tracking-wider">
                      Question #{qIndex + 1}
                    </span>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[#7A7A72]">Marks:</span>
                        <input
                          type="number"
                          min="1"
                          value={q.points}
                          onChange={(e) =>
                            handleUpdateQuestionPoints(qIndex, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-14 p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#EDEAE2] dark:border-slate-700 font-bold text-center text-xs"
                        />
                      </div>

                      {questions.length > 1 && (
                        <button
                          onClick={() => handleRemoveQuestion(qIndex)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded-xl hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#7A7A72] mb-1">
                      Question Prompt:
                    </label>
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => handleUpdateQuestionText(qIndex, e.target.value)}
                      className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#EDEAE2] dark:border-slate-700 font-bold text-xs text-[#2D2D2A] dark:text-slate-200"
                    />
                  </div>

                  {/* 4 Options Grid */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-[#7A7A72]">
                      Options & Correct Answer Selector:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(q.options || []).map((optText, optIdx) => {
                        const isCorrect = q.correctAnswer === optText;

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-2xl border flex items-center gap-2 transition-colors ${
                              isCorrect
                                ? 'bg-[#EBF1E8] border-[#88A070]'
                                : 'bg-white dark:bg-slate-900 border-[#EDEAE2] dark:border-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct-radio-${qIndex}`}
                              checked={isCorrect}
                              onChange={() => handleSelectCorrectOption(qIndex, optText)}
                              className="w-4 h-4 text-[#4A6741] cursor-pointer"
                            />
                            <input
                              type="text"
                              value={optText}
                              onChange={(e) => handleUpdateOption(qIndex, optIdx, e.target.value)}
                              className="w-full bg-transparent font-bold text-xs text-[#2D2D2A] dark:text-slate-200 focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#7A7A72] mb-1">
                      Concept Solution & Answer Explanation:
                    </label>
                    <textarea
                      rows={2}
                      value={q.explanation || ''}
                      onChange={(e) => handleUpdateQuestionExplanation(qIndex, e.target.value)}
                      className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#EDEAE2] dark:border-slate-700 text-xs text-[#2D2D2A] dark:text-slate-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-[#EDEAE2] dark:border-slate-800 flex justify-end">
            <button
              onClick={handlePublishNewQuiz}
              className="px-6 py-3 rounded-2xl bg-[#4A6741] text-white font-extrabold text-xs hover:bg-[#3D5535] transition-colors shadow-md flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Publish Quiz Assessment to Classroom</span>
            </button>
          </div>
        </div>
      ) : (
        /* ================= TAB 2: EVALUATION & MARKS DESK ================= */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#EDEAE2] dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-6">
          <div className="flex items-center justify-between border-b border-[#EDEAE2] dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-[#2D2D2A] dark:text-white font-serif">
                Quiz Evaluation & Marks Publishing Portal
              </h2>
              <p className="text-xs text-[#7A7A72] dark:text-slate-400">
                Inspect student response logs, review total marks, and release pending grades
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-[#7A7A72] uppercase block">
                Pending Marks Release:
              </span>
              <span className="font-black text-sm text-amber-600">
                {pendingReleaseCount} Quizzes Withheld
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Quiz Selector List */}
            <div className="md:col-span-4 space-y-3">
              <h3 className="font-extrabold text-xs text-[#7A7A72] uppercase tracking-wider">
                Select Assessment ({quizzes.length}):
              </h3>

              {quizzes.map((q) => {
                const subsCount = quizSubmissions.filter((s) => s.quizId === q.id).length;
                const isSelected = selectedEvalQuizId === q.id;
                const isLater = q.revealMarksMode === 'later';

                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      setSelectedEvalQuizId(q.id);
                      setInspectStudentId(null);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? 'bg-[#EBF1E8] border-[#88A070] shadow-xs'
                        : 'bg-[#F9F7F2] dark:bg-slate-800/80 border-[#EDEAE2] dark:border-slate-700 hover:border-[#88A070]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-900 text-[#4A6741] dark:text-emerald-400 border border-[#88A070]/40">
                        {q.subject}
                      </span>

                      {isLater ? (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending Release
                        </span>
                      ) : (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Marks Live
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-xs text-[#2D2D2A] dark:text-white font-serif">
                      {q.title}
                    </h4>
                    <p className="text-[11px] text-[#7A7A72]">{q.classroomName}</p>

                    <div className="pt-2 border-t border-[#EDEAE2] dark:border-slate-700 flex items-center justify-between text-[11px] font-bold text-[#7A7A72]">
                      <span>{q.questions.length} Questions</span>
                      <span className="text-[#4A6741] dark:text-emerald-400 font-extrabold">
                        {subsCount} Attempts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Selected Assessment Evaluation Desk */}
            <div className="md:col-span-8 space-y-4">
              {activeEvalQuiz ? (
                <>
                  {/* Selected Quiz Top Card */}
                  <div className="p-5 rounded-3xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-[#4A6741] uppercase tracking-wider">
                          {activeEvalQuiz.classroomName} • {activeEvalQuiz.subject}
                        </span>
                        <h3 className="text-base font-black text-[#2D2D2A] dark:text-white font-serif">
                          {activeEvalQuiz.title}
                        </h3>
                        <p className="text-xs text-[#7A7A72]">{activeEvalQuiz.description}</p>
                      </div>

                      {activeEvalQuiz.revealMarksMode === 'later' ? (
                        <button
                          onClick={() => handlePublishMarks(activeEvalQuiz.id)}
                          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 shrink-0"
                        >
                          <Send className="w-4 h-4" />
                          <span>Publish Marks & Solutions to Students</span>
                        </button>
                      ) : (
                        <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs flex items-center gap-1.5 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Marks Released & Visible to Students</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submissions Section */}
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-xs text-[#2D2D2A] dark:text-slate-200 uppercase tracking-wider">
                      Student Submission Breakdown ({activeQuizSubmissions.length})
                    </h4>

                    {activeQuizSubmissions.length === 0 ? (
                      <div className="text-center py-10 bg-[#F9F7F2] dark:bg-slate-800/40 rounded-3xl border border-dashed border-[#EDEAE2] text-[#7A7A72] space-y-2 text-xs">
                        <UserCheck className="w-8 h-8 text-[#7A7A72] mx-auto" />
                        <p className="font-bold text-[#2D2D2A]">No Submissions Recorded Yet</p>
                        <p className="text-[11px]">
                          Student attempts for this quiz will appear here with itemized answer logs.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeQuizSubmissions.map((sub) => {
                          const student = getStudentProfile(sub.studentId);
                          const totalPoints = activeEvalQuiz.questions.reduce(
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
                                  ? 'bg-[#EBF1E8] border-[#88A070]'
                                  : 'bg-[#F9F7F2] dark:bg-slate-800 border-[#EDEAE2] dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-[#4A6741] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                    {student?.name ? student.name.charAt(0) : 'S'}
                                  </div>
                                  <div>
                                    <h5 className="font-extrabold text-xs text-[#2D2D2A] dark:text-white">
                                      {student?.name || `Student ID: ${sub.studentId}`}
                                    </h5>
                                    <p className="text-[11px] text-[#7A7A72]">
                                      Completed at {sub.completedAt || 'Recently'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <span className="font-black text-sm text-[#4A6741] dark:text-emerald-400 block">
                                      {sub.score} / {totalPoints} Marks
                                    </span>
                                    <span className="text-[10px] font-bold text-[#7A7A72]">
                                      {grade}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() =>
                                      setInspectStudentId(isInspected ? null : sub.studentId)
                                    }
                                    className="px-3 py-1.5 rounded-xl border border-[#4A6741] text-[#4A6741] dark:text-emerald-400 font-bold text-xs hover:bg-[#4A6741]/10 transition-colors flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{isInspected ? 'Hide Logs' : 'Inspect Answers'}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Itemized Answer Log */}
                              {isInspected && (
                                <div className="pt-3 border-t border-[#88A070]/30 space-y-3 animate-in fade-in duration-200">
                                  <h6 className="font-extrabold text-[11px] text-[#4A6741] dark:text-emerald-300 uppercase">
                                    Itemized Student Response Log:
                                  </h6>

                                  {activeEvalQuiz.questions.map((q, qIdx) => {
                                    const studentAnswer = sub.answers[q.id];
                                    const isCorrect = studentAnswer === q.correctAnswer;

                                    return (
                                      <div
                                        key={q.id}
                                        className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#EDEAE2] dark:border-slate-800 space-y-1.5 text-xs"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="font-bold text-[#2D2D2A] dark:text-slate-200">
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
                                          <div className="p-2 rounded-xl bg-[#F9F7F2] dark:bg-slate-800">
                                            <span className="text-[10px] font-bold text-[#7A7A72] block">
                                              Selected Answer:
                                            </span>
                                            <span
                                              className={`font-extrabold ${
                                                isCorrect ? 'text-emerald-600' : 'text-rose-600'
                                              }`}
                                            >
                                              {studentAnswer || 'Not Answered'}
                                            </span>
                                          </div>

                                          <div className="p-2 rounded-xl bg-[#EBF1E8] dark:bg-emerald-950/40">
                                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block">
                                              Official Correct Answer:
                                            </span>
                                            <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                                              {q.correctAnswer}
                                            </span>
                                          </div>
                                        </div>

                                        {q.explanation && (
                                          <p className="text-[10px] text-[#7A7A72] italic pt-1">
                                            Explanation: {q.explanation}
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
                <div className="text-center py-20 text-[#7A7A72] font-bold text-xs">
                  Select a quiz from the left panel to evaluate student submission records.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
