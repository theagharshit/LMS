import React, { useState } from 'react';
import { apiFetch } from '@utils/apiFetch';
import { useApp } from '../../context/AppContext';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { QuizQuestion } from '@lms/shared';

interface QuizBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuizBuilderModal: React.FC<QuizBuilderModalProps> = ({ isOpen, onClose }) => {
  const { addQuiz, classrooms } = useApp();

  const [topic, setTopic] = useState('Algebra & Factorization');
  const [subject, setSubject] = useState('Mathematics');
  const [gradeLevel, setGradeLevel] = useState(8);
  const [selectedClassroomId, setSelectedClassroomId] = useState(
    classrooms[0]?.id || 'cls-math-8a',
  );
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [revealMarksMode, setRevealMarksMode] = useState<'immediate' | 'later'>('immediate');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q-1',
      text: 'Expand (a + b)²',
      type: 'MCQ',
      options: ['a² + b²', 'a² + 2ab + b²', 'a² - 2ab + b²', '2a + 2b'],
      correctAnswer: 'a² + 2ab + b²',
      explanation: 'Standard algebraic square identity formula.',
      points: 5,
    },
  ]);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    const nextNum = questions.length + 1;
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}-${nextNum}`,
        text: `New Question ${nextNum}`,
        type: 'MCQ',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        explanation: 'Add explanation here...',
        points: 5,
      },
    ]);
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
      updated[index] = { ...updated[index], points: Math.max(1, points) };
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
      if (oldVal === currentQ.correctAnswer) {
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

  const handleSelectCorrectAnswer = (qIndex: number, correctAnswerText: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], correctAnswer: correctAnswerText };
      return updated;
    });
  };

  const handleGenerateAiQuiz = async () => {
    setIsAiGenerating(true);
    try {
      const res = await apiFetch('/api/ai/quiz-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subject,
          gradeLevel,
          questionCount: 4,
        }),
        feedback: {
          success: 'AI quiz questions were generated and are ready to review.',
          error: 'Could not generate quiz questions. Please try again.',
          successTitle: 'Quiz draft ready',
        },
      });
      if (!res.ok) throw new Error('Quiz generation request failed.');
      const data = await res.json();
      if (data.quiz && data.quiz.questions) {
        setQuestions(
          data.quiz.questions.map((q: any, i: number) => ({
            ...q,
            id: `q-ai-${Date.now()}-${i}`,
            points: 5,
          })),
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveQuiz = () => {
    const selectedCls = classrooms.find((c) => c.id === selectedClassroomId);
    addQuiz({
      classroomId: selectedClassroomId,
      classroomName: selectedCls?.name || 'Grade 8 Mathematics',
      subject,
      title: `${topic} Quiz (${subject})`,
      description: `Teacher assessment for Grade ${gradeLevel} ${subject}`,
      durationMinutes,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      totalQuestions: questions.length,
      questions,
      published: true,
      revealMarksMode,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 text-xs">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-base">
                Sikshya AI Quiz Creator for Teachers & Assessment Builder
              </h3>
              <p className="text-xs text-purple-100">
                Create, customize, and configure quiz questions & mark release modes
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-white/80 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Overview Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Target Classroom:
              </label>
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Subject:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Quiz Topic:
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Duration (Mins):
              </label>
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
              />
            </div>
          </div>

          {/* Reveal Marks Mode Configurator */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Score & Results Disclosure Setting:
            </label>
            <p className="text-[11px] text-slate-500">
              Control whether students can see their score calculation and answer explanations
              immediately after finishing.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setRevealMarksMode('immediate')}
                className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  revealMarksMode === 'immediate'
                    ? 'border-[#4A6741] bg-[#EBF1E8] text-[#2D2D2A] dark:bg-[#214126] dark:text-emerald-50 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Eye className="w-5 h-5 text-[#4A6741] shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-xs">Show Results Immediately</p>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                    Show instant score, percentage grade, and correct answer explanations upon quiz
                    completion.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRevealMarksMode('later')}
                className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  revealMarksMode === 'later'
                    ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <EyeOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-xs">Hide Until Release by Teacher</p>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                    Hide instant score and solutions until you release the results to students.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* AI Assistance Banner */}
          <div className="p-3.5 rounded-2xl bg-[#EBF1E8]/50 border border-[#EDEAE2] flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-[#4A6741] text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#E88D67]" />
                Auto-Fill Questions with AI
              </h4>
              <p className="text-[11px] text-[#7A7A72]">
                Optionally generate CDC Nepal curriculum standard questions to pre-fill the form
                below.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateAiQuiz}
              disabled={isAiGenerating}
              className="px-3.5 py-2 rounded-xl bg-[#E88D67] text-white font-bold text-xs hover:bg-[#D87B55] transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAiGenerating ? 'Generating...' : 'Auto-Generate AI Questions'}</span>
            </button>
          </div>

          {/* Manual Questions & Options Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Manage Quiz Questions ({questions.length}):
              </h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-200 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Question
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                {/* Question Header Row */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-extrabold text-purple-600 dark:text-purple-400">
                    Question #{qIdx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-500">Points:</label>
                    <input
                      type="number"
                      min={1}
                      value={q.points}
                      onChange={(e) => handleUpdateQuestionPoints(qIdx, Number(e.target.value))}
                      className="w-16 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-center"
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="p-1.5 text-rose-600 hover:text-rose-700 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Remove Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Prompt Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Question Prompt / Text:
                  </label>
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                    placeholder="Enter question text here..."
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                {/* Options List with Radio for Correct Answer */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Answer Options (Select radio button for the Correct Answer):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options?.map((opt, optIdx) => {
                      const isCorrect = opt === q.correctAnswer;
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2 p-2 rounded-2xl border transition-all ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct-ans-${qIdx}`}
                            checked={isCorrect}
                            onChange={() => handleSelectCorrectAnswer(qIdx, opt)}
                            className="w-4 h-4 text-emerald-600 accent-emerald-600"
                            title="Set as correct answer"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className="w-full bg-transparent border-0 font-semibold text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                          />
                          {isCorrect && (
                            <span className="text-[10px] font-extrabold text-emerald-600 shrink-0 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60">
                              ✓ Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Explanation & Solution Concept:
                  </label>
                  <input
                    type="text"
                    value={q.explanation}
                    onChange={(e) => handleUpdateQuestionExplanation(qIdx, e.target.value)}
                    placeholder="Enter detailed explanation for solution..."
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-extrabold text-xs hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Another Question
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            Total Quiz Items: <strong>{questions.length}</strong> • Mode:{' '}
            <strong className="text-purple-600 capitalize">{revealMarksMode}</strong>
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveQuiz}
              className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-md"
            >
              Publish Quiz to Classroom
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
