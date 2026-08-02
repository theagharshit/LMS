import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Clock, CheckCircle2, AlertCircle, Award, CheckSquare, RefreshCw } from 'lucide-react';

interface QuizRunnerModalProps {
  quizId: string | null;
  onClose: () => void;
}

export const QuizRunnerModal: React.FC<QuizRunnerModalProps> = ({ quizId, onClose }) => {
  const { quizzes, submitQuizAnswers, quizSubmissions, currentUser } = useApp();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(600); // 10 mins

  if (!quizId) return null;

  const quiz = quizzes.find(q => q.id === quizId);
  if (!quiz) return null;

  const existingResult = quizSubmissions.find(s => s.quizId === quizId && s.studentId === currentUser.id);

  useEffect(() => {
    if (quiz.durationMinutes) {
      setTimeLeftSeconds(quiz.durationMinutes * 60);
    }
  }, [quiz]);

  const handleOptionSelect = (qId: string, option: string) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleFinishQuiz = () => {
    let score = 0;
    let totalPoints = 0;

    quiz.questions.forEach(q => {
      totalPoints += q.points;
      if (selectedAnswers[q.id] === q.correctAnswer) {
        score += q.points;
      }
    });

    submitQuizAnswers(quizId, selectedAnswers, score, totalPoints);
    setIsCompleted(true);
  };

  const minutesLeft = Math.floor(timeLeftSeconds / 60);
  const secondsLeft = timeLeftSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
              {quiz.subject} Quiz
            </span>
            <h3 className="font-bold text-base mt-1">{quiz.title}</h3>
            <p className="text-xs text-purple-100">{quiz.classroomName} • {quiz.questions.length} Questions</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          
          {/* If already completed or taking quiz */}
          {existingResult || isCompleted ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                🏆
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Quiz Completed!</h3>
                <p className="text-slate-500 text-xs">Your results have been logged into your Sikshya LMS Profile.</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 max-w-sm mx-auto">
                <p className="font-extrabold text-2xl text-emerald-600">
                  {existingResult?.score || 20} / {quiz.questions.reduce((acc, q) => acc + q.points, 0)} Marks
                </p>
                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mt-1">Grade: A+ (100% Correct)</p>
              </div>

              {/* Question Breakdown with Explanations */}
              <div className="text-left space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Solutions & Explanations:</h4>
                {quiz.questions.map((q, i) => (
                  <div key={q.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">Q{i + 1}. {q.text}</p>
                    <p className="text-emerald-600 font-bold">Correct Answer: {q.correctAnswer}</p>
                    <p className="text-slate-500 text-[11px]">Explanation: {q.explanation}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-md"
              >
                Close Results
              </button>
            </div>
          ) : (
            <>
              {/* Timer Bar */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>Time Remaining:</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-bold text-sm">
                    {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
                  </span>
                </div>
                <span className="font-bold text-slate-500">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </span>
              </div>

              {/* Current Question */}
              {quiz.questions[currentQuestionIndex] && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-purple-600 uppercase">
                      Question {currentQuestionIndex + 1} ({quiz.questions[currentQuestionIndex].points} Points)
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed">
                      {quiz.questions[currentQuestionIndex].text}
                    </h4>
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {quiz.questions[currentQuestionIndex].options?.map((opt, i) => {
                      const isSelected = selectedAnswers[quiz.questions[currentQuestionIndex].id] === opt;
                      return (
                        <button
                          key={i}
                          onClick={() => handleOptionSelect(quiz.questions[currentQuestionIndex].id, opt)}
                          className={`w-full p-3.5 rounded-2xl border text-left font-semibold text-xs transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-600 text-purple-900 dark:text-purple-200 font-extrabold shadow-sm'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <span>{opt}</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation controls */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold disabled:opacity-40"
                >
                  Previous
                </button>

                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={handleFinishQuiz}
                    className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-md"
                  >
                    Submit Quiz
                  </button>
                )}
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
