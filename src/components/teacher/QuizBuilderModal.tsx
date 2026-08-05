import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Sparkles, Plus, Trash2, CheckCircle2, BookOpen } from 'lucide-react';
import { QuizQuestion } from '../../types';

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
  const [questionCount, setQuestionCount] = useState(4);
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

  const handleGenerateAiQuiz = async () => {
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai/quiz-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subject,
          gradeLevel,
          questionCount,
        }),
      });
      const data = await res.json();
      if (data.quiz && data.quiz.questions) {
        setQuestions(
          data.quiz.questions.map((q: any) => ({
            ...q,
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
      description: `Automated assessment for Grade ${gradeLevel} ${subject}`,
      durationMinutes: 10,
      dueDate: '2026-08-05',
      totalQuestions: questions.length,
      questions,
      published: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-xs">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-base">Sikshya AI Quiz Creator for Teachers</h3>
              <p className="text-xs text-purple-100">CDC Nepal Curriculum Standard Question Bank</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-white/80 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          </div>

          {/* AI Generator Button */}
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-purple-900 dark:text-purple-200 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Generate Questions with AI
              </h4>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                Creates balanced MCQs, True/False, and explanations instantly.
              </p>
            </div>

            <button
              onClick={handleGenerateAiQuiz}
              disabled={isAiGenerating}
              className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors shadow-md flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAiGenerating ? 'Generating...' : 'Generate 4 Questions Now'}</span>
            </button>
          </div>

          {/* Questions Preview */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Quiz Questions Preview ({questions.length}):
            </h4>

            {questions.map((q, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-purple-600">
                    Q{idx + 1}. {q.text}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                    {q.type} • {q.points} Pts
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {q.options?.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-xl text-[11px] border ${
                        opt === q.correctAnswer
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {opt} {opt === q.correctAnswer && '✓'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
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
  );
};
