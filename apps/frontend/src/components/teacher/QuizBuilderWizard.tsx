import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '@context/AppContext';
import { Quiz, QuizQuestion, StudyResource } from '@lms/shared';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  FileText,
  CheckCircle2,
  Eye,
  EyeOff,
  Edit3,
} from 'lucide-react';

interface QuizBuilderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  editingQuiz?: Quiz | null;
  hasSubmissions?: boolean;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;
type CreationMode = 'ai' | 'blank';

const emptyQuestion = (index: number, points: number): QuizQuestion => ({
  id: `q-${Date.now()}-${index}`,
  text: `Question ${index + 1}`,
  type: 'MCQ',
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  correctAnswer: 'Option A',
  explanation: 'Add explanation here...',
  points,
});

export const QuizBuilderWizard: React.FC<QuizBuilderWizardProps> = ({
  isOpen,
  onClose,
  editingQuiz,
  hasSubmissions = false,
}) => {
  const {
    classrooms,
    resources,
    streamPosts,
    addQuiz,
    updateQuiz,
    currentUser,
  } = useApp();

  const isEditMode = Boolean(editingQuiz);
  const readOnly = isEditMode && hasSubmissions;

  const [step, setStep] = useState<WizardStep>(isEditMode ? 4 : 1);
  const [selectedClassroomId, setSelectedClassroomId] = useState(
    editingQuiz?.classroomId || classrooms[0]?.id || '',
  );
  const [title, setTitle] = useState(editingQuiz?.title || '');
  const [subject, setSubject] = useState(editingQuiz?.subject || 'Mathematics');
  const [topic, setTopic] = useState('');
  const [dueDate, setDueDate] = useState(
    editingQuiz?.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  );
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(
    editingQuiz?.sourceResourceIds || [],
  );
  const [showAllResources, setShowAllResources] = useState(false);
  const [questionCount, setQuestionCount] = useState(editingQuiz?.totalQuestions || 5);
  const [defaultPoints, setDefaultPoints] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(editingQuiz?.durationMinutes || 60);
  const [revealMarksMode, setRevealMarksMode] = useState<'immediate' | 'later'>(
    editingQuiz?.revealMarksMode || 'immediate',
  );
  const [creationMode, setCreationMode] = useState<CreationMode>('ai');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGenerationError, setAiGenerationError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    editingQuiz?.questions || [emptyQuestion(0, 5)],
  );

  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId);

  const availableResources = useMemo(() => {
    const fromLibrary = showAllResources
      ? resources.filter((r) => r.teacherId === currentUser.id)
      : resources.filter((r) => r.classroomId === selectedClassroomId);

    const fromStream: StudyResource[] = streamPosts
      .filter((p) => p.classroomId === selectedClassroomId && p.attachments?.length)
      .flatMap((p) =>
        (p.attachments || []).map(
          (att, i): StudyResource => ({
            id: `stream-${p.id}-${i}`,
            classroomId: p.classroomId,
            teacherId: currentUser.id,
            title: att.title,
            type: att.type === 'pdf' ? 'pdf' : att.type === 'video' ? 'video' : 'doc',
            url: att.url,
            sizeFormatted: att.size,
            createdAt: p.createdAt,
          }),
        ),
      );

    const merged = [...fromLibrary];
    fromStream.forEach((sr) => {
      if (!merged.some((m) => m.title === sr.title && m.url === sr.url)) {
        merged.push(sr);
      }
    });
    return merged;
  }, [resources, streamPosts, selectedClassroomId, showAllResources, currentUser.id]);

  const selectedResources = availableResources.filter((r) =>
    selectedResourceIds.includes(r.id),
  );

  // Prevent stale resource IDs (e.g. after classroom change) from producing an empty AI context.
  useEffect(() => {
    setSelectedResourceIds((prev) =>
      prev.filter((id) => availableResources.some((r) => r.id === id)),
    );
  }, [availableResources]);

  const totalMarks = questions.reduce((acc, q) => acc + q.points, 0);

  const toggleResource = (id: string) => {
    setSelectedResourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const generateQuestions = async () => {
    setIsGenerating(true);
    setAiGenerationError(null);

    try {
      if (creationMode === 'blank') {
        setQuestions(
          Array.from({ length: questionCount }, (_, i) => emptyQuestion(i, defaultPoints)),
        );
        setStep(4);
        return;
      }

      if (creationMode === 'ai' && selectedResources.length === 0) {
        setAiGenerationError('Please select at least one study material before generating questions.');
        setStep(2);
        return;
      }

      const res = await fetch('/api/ai/quiz-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic || title,
          subject,
          gradeLevel: selectedClassroom?.gradeLevel || 8,
          questionCount,
          defaultPoints,
          resourceTitles: selectedResources.map((r) => r.title),
          resourceDescriptions: selectedResources.map((r) => r.description || r.title),
          resourceUrls: selectedResources.map((r) => r.url),
          resourceTypes: selectedResources.map((r) => r.type),
          resourceMimeTypes: selectedResources.map((r) => r.mimeType || ''),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          (data && (data.error || data.message)) ||
          'Quiz generation failed. Please try again.';
        setAiGenerationError(message);
        return;
      }

      const generated = data?.quiz?.questions || data?.questions || [];
      if (!Array.isArray(generated) || generated.length === 0) {
        setAiGenerationError('AI returned no questions. Please select different resources and try again.');
        return;
      }

      setQuestions(
        generated.map((q: QuizQuestion, i: number) => ({
          ...q,
          id: q.id || `q-${Date.now()}-${i}`,
          points: q.points || defaultPoints,
        })),
      );
      setStep(4);
    } catch (err: any) {
      setAiGenerationError(err?.message || 'Network error while generating quiz.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveQuiz = (publish: boolean) => {
    const cls = selectedClassroom;
    const quizPayload: Omit<Quiz, 'id'> = {
      classroomId: selectedClassroomId,
      classroomName: cls?.name || 'Classroom',
      subject,
      title: title || `${topic} Quiz`,
      description: `Assessment based on ${selectedResources.length} study material(s)`,
      durationMinutes,
      dueDate,
      totalQuestions: questions.length,
      questions,
      published: publish,
      status: publish ? 'published' : 'draft',
      revealMarksMode,
      sourceResourceIds: selectedResourceIds.filter((id) => !id.startsWith('stream-')),
    };

    if (isEditMode && editingQuiz) {
      updateQuiz(editingQuiz.id, quizPayload);
    } else {
      addQuiz(quizPayload);
    }
    onClose();
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion(prev.length, defaultPoints)]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  const stepLabels = ['Setup', 'Resources', 'Configure', 'Questions', 'Publish'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#EDEAE2] shrink-0">
          <div>
            <h2 className="font-bold text-[#2D2D2A] font-serif text-lg">
              {isEditMode ? 'Edit Quiz' : 'Create Quiz'}
            </h2>
            {readOnly && (
              <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                Read-only: students have already submitted. Duplicate to create a new draft.
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F9F7F2] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-4 py-3 gap-1 border-b border-[#EDEAE2] shrink-0 overflow-x-auto">
          {stepLabels.map((label, i) => {
            const stepNum = (i + 1) as WizardStep;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div
                key={label}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                  isActive
                    ? 'bg-[#4A6741] text-white'
                    : isDone
                      ? 'bg-[#EBF1E8] text-[#4A6741]'
                      : 'text-[#7A7A72]'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : <span>{stepNum}</span>}
                {label}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="text-xs font-bold text-[#7A7A72]">Classroom</label>
                <select
                  value={selectedClassroomId}
                  onChange={(e) => {
                    setSelectedClassroomId(e.target.value);
                    const cls = classrooms.find((c) => c.id === e.target.value);
                    if (cls) setSubject(cls.subject);
                  }}
                  disabled={readOnly}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#EDEAE2] text-sm"
                >
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Grade {c.gradeLevel}-{c.section}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#7A7A72]">Quiz Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unit 4 Algebra Test"
                  disabled={readOnly}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#EDEAE2] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#7A7A72]">Subject</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={readOnly}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#EDEAE2] text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#7A7A72]">Topic</label>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Factorization"
                    disabled={readOnly}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#EDEAE2] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#7A7A72]">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={readOnly}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#EDEAE2] text-sm"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#7A7A72]">
                  Select study materials to base this quiz on ({selectedResourceIds.length} selected)
                </p>
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#4A6741] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllResources}
                    onChange={(e) => setShowAllResources(e.target.checked)}
                    className="rounded"
                  />
                  All my resources
                </label>
              </div>
              {availableResources.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#7A7A72]">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No materials found. Upload study materials from the Classroom Classwork tab first.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableResources.map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-colors ${
                        selectedResourceIds.includes(r.id)
                          ? 'border-[#4A6741] bg-[#EBF1E8]'
                          : 'border-[#EDEAE2] hover:bg-[#F9F7F2]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedResourceIds.includes(r.id)}
                        onChange={() => toggleResource(r.id)}
                        disabled={readOnly}
                        className="rounded"
                      />
                      <FileText className="w-4 h-4 text-[#4A6741] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#2D2D2A] truncate">{r.title}</p>
                        <p className="text-[10px] text-[#7A7A72]">{r.type.toUpperCase()}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#7A7A72]">Number of Questions</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Math.min(50, Math.max(1, Number(e.target.value))))}
                    disabled={readOnly}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#EDEAE2] text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#7A7A72]">Marks per Question</label>
                  <input
                    type="number"
                    min={1}
                    value={defaultPoints}
                    onChange={(e) => setDefaultPoints(Math.max(1, Number(e.target.value)))}
                    disabled={readOnly}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#EDEAE2] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#7A7A72] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Timer Duration (minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(5, Number(e.target.value)))}
                  disabled={readOnly}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#EDEAE2] text-sm"
                />
                <p className="text-[10px] text-[#7A7A72] mt-1">
                  Quiz auto-submits when timer reaches zero.
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-[#7A7A72]">Results Visibility</label>
                <div className="flex gap-2 mt-1">
                  {(['immediate', 'later'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setRevealMarksMode(mode)}
                      disabled={readOnly}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                        revealMarksMode === mode
                          ? 'bg-[#4A6741] text-white'
                          : 'bg-[#F9F7F2] border border-[#EDEAE2]'
                      }`}
                    >
                      {mode === 'immediate' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {mode === 'immediate' ? 'Show Now' : 'Hide Until Release'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#7A7A72] mt-1">
                  Grading uses the correct answers (answer key) you enter in the Questions step. Choose whether
                  students can see their scores and solutions immediately or only after you release them.
                </p>
              </div>
              {!readOnly && (
                <div>
                  <label className="text-xs font-bold text-[#7A7A72]">Creation Mode</label>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setCreationMode('ai')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                        creationMode === 'ai'
                          ? 'bg-[#E88D67] text-white'
                          : 'bg-[#F9F7F2] border border-[#EDEAE2]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Draft from Resources
                    </button>
                    <button
                      onClick={() => setCreationMode('blank')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                        creationMode === 'blank'
                          ? 'bg-[#4A6741] text-white'
                          : 'bg-[#F9F7F2] border border-[#EDEAE2]'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Blank Form
                    </button>
                  </div>
                </div>
              )}
              {aiGenerationError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-bold">
                  {aiGenerationError}
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#2D2D2A]">
                  {questions.length} questions • {totalMarks} total marks
                </p>
                {!readOnly && (
                  <button
                    onClick={addQuestion}
                    className="px-3 py-1.5 rounded-lg bg-[#EBF1E8] text-[#4A6741] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </button>
                )}
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-black text-[#4A6741] bg-white px-2 py-0.5 rounded">
                        Q{idx + 1}
                      </span>
                      {!readOnly && questions.length > 1 && (
                        <button
                          onClick={() => removeQuestion(idx)}
                          className="p-1 rounded hover:bg-red-50 text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      value={q.text}
                      onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                      disabled={readOnly}
                      placeholder="Question text"
                      className="w-full px-3 py-2 rounded-xl border border-[#EDEAE2] text-xs bg-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={q.type}
                        onChange={(e) =>
                          updateQuestion(idx, {
                            type: e.target.value as QuizQuestion['type'],
                            options:
                              e.target.value === 'True/False'
                                ? ['True', 'False']
                                : e.target.value === 'ShortAnswer'
                                  ? []
                                  : q.options || ['A', 'B', 'C', 'D'],
                          })
                        }
                        disabled={readOnly}
                        className="px-2 py-1.5 rounded-lg border border-[#EDEAE2] text-xs bg-white"
                      >
                        <option value="MCQ">Multiple Choice</option>
                        <option value="True/False">True / False</option>
                        <option value="ShortAnswer">Short Answer</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={q.points}
                        onChange={(e) => updateQuestion(idx, { points: Math.max(1, Number(e.target.value)) })}
                        disabled={readOnly}
                        placeholder="Marks"
                        className="px-2 py-1.5 rounded-lg border border-[#EDEAE2] text-xs bg-white"
                      />
                    </div>
                    {q.type !== 'ShortAnswer' &&
                      (q.options || []).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${idx}`}
                            checked={q.correctAnswer === opt}
                            onChange={() => updateQuestion(idx, { correctAnswer: opt })}
                            disabled={readOnly}
                          />
                          <input
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(q.options || [])];
                              const wasCorrect = q.correctAnswer === opt;
                              newOpts[oi] = e.target.value;
                              updateQuestion(idx, {
                                options: newOpts,
                                correctAnswer: wasCorrect ? e.target.value : q.correctAnswer,
                              });
                            }}
                            disabled={readOnly}
                            className="flex-1 px-2 py-1 rounded-lg border border-[#EDEAE2] text-xs bg-white"
                          />
                        </div>
                      ))}
                    {q.type === 'ShortAnswer' && (
                      <input
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(idx, { correctAnswer: e.target.value })}
                        disabled={readOnly}
                        placeholder="Expected answer"
                        className="w-full px-2 py-1.5 rounded-lg border border-[#EDEAE2] text-xs bg-white"
                      />
                    )}
                    <input
                      value={q.explanation}
                      onChange={(e) => updateQuestion(idx, { explanation: e.target.value })}
                      disabled={readOnly}
                      placeholder="Explanation (shown after submission)"
                      className="w-full px-2 py-1.5 rounded-lg border border-[#EDEAE2] text-xs bg-white"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] space-y-2">
                <h4 className="font-bold text-sm text-[#2D2D2A]">{title || `${topic} Quiz`}</h4>
                <p className="text-xs text-[#7A7A72]">
                  {selectedClassroom?.name} • {subject}
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center p-2 rounded-xl bg-white border border-[#EDEAE2]">
                    <p className="text-lg font-black text-[#4A6741]">{questions.length}</p>
                    <p className="text-[10px] text-[#7A7A72]">Questions</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-white border border-[#EDEAE2]">
                    <p className="text-lg font-black text-[#4A6741]">{totalMarks}</p>
                    <p className="text-[10px] text-[#7A7A72]">Total Marks</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-white border border-[#EDEAE2]">
                    <p className="text-lg font-black text-[#E88D67]">{durationMinutes}m</p>
                    <p className="text-[10px] text-[#7A7A72]">Timer</p>
                  </div>
                </div>
                {selectedResources.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-[#7A7A72] uppercase mb-1">
                      Based on {selectedResources.length} resource(s)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedResources.map((r) => (
                        <span
                          key={r.id}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF1E8] text-[#4A6741] font-bold"
                        >
                          {r.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {!readOnly && (
                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
                  Publishing assigns the quiz to students but does not start the timer. After
                  publishing, use <strong>Start Test</strong> from the Quiz Hub when you are ready
                  for students to begin.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between p-4 border-t border-[#EDEAE2] shrink-0">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1) as WizardStep)}
            disabled={step === 1}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex gap-2">
            {step === 5 && !readOnly && (
              <>
                <button
                  onClick={() => saveQuiz(false)}
                  className="px-4 py-2 rounded-xl bg-[#F9F7F2] border border-[#EDEAE2] text-xs font-bold cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => saveQuiz(true)}
                  className="px-5 py-2 rounded-xl bg-[#4A6741] text-white text-xs font-bold cursor-pointer"
                >
                  Publish to Students
                </button>
              </>
            )}
            {step === 3 && !readOnly && (
              <button
                onClick={generateQuestions}
                disabled={isGenerating}
                className="px-5 py-2 rounded-xl bg-[#E88D67] text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Generate Questions'}
              </button>
            )}
            {step < 5 && step !== 3 && (
              <button
                onClick={() => setStep((s) => Math.min(5, s + 1) as WizardStep)}
                className="px-5 py-2 rounded-xl bg-[#4A6741] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 4 && (
              <button
                onClick={() => setStep(5)}
                className="px-5 py-2 rounded-xl bg-[#4A6741] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                Review <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
