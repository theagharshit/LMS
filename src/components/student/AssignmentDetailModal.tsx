import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  FileText,
  Upload,
  Sparkles,
  CheckCircle,
  Send,
  Paperclip,
  Download,
  AlertCircle,
} from 'lucide-react';

interface AssignmentDetailModalProps {
  assignmentId: string | null;
  onClose: () => void;
}

export const AssignmentDetailModal: React.FC<AssignmentDetailModalProps> = ({
  assignmentId,
  onClose,
}) => {
  const { assignments, submissions, submitHomework, currentUser } = useApp();

  const [responseText, setResponseText] = useState('');
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState<'submit' | 'ai-helper'>('submit');
  const [aiHelperQuery, setAiHelperQuery] = useState('');
  const [aiHelperResult, setAiHelperResult] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  if (!assignmentId) return null;

  const assignment = assignments.find((a) => a.id === assignmentId);
  if (!assignment) return null;

  const existingSubmission = submissions.find(
    (s) => s.assignmentId === assignmentId && s.studentId === currentUser.id,
  );

  const studentGrade = currentUser.gradeLevel ?? 8;
  const isBelowClass9 = studentGrade < 9;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultFileName = isBelowClass9
      ? `Direct_Submission_Grade_${studentGrade}.pdf`
      : `${currentUser.name.replace(/\s+/g, '_')}_${assignment.title.slice(0, 15)}.pdf`;
    const finalFileName = fileName.trim() || defaultFileName;
    const finalResponseText =
      responseText.trim() ||
      (isBelowClass9 ? `Submitted directly by Grade ${studentGrade} student.` : '');
    submitHomework(assignmentId, finalFileName, finalFileName, finalResponseText);
  };

  const handleAiHelperAsk = async () => {
    if (!aiHelperQuery.trim() || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/homework-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentTitle: assignment.title,
          assignmentDescription: assignment.instructions,
          questionText: aiHelperQuery,
          gradeLevel: currentUser.gradeLevel || 8,
        }),
      });
      const data = await res.json();
      setAiHelperResult(data.text);
    } catch (err) {
      setAiHelperResult(
        'Here are key steps to complete this homework:\n1. Identify the core mathematical or scientific principle.\n2. Write down your given variables.\n3. Solve step-by-step.',
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#2D2D2A]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#EDEAE2] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 natural-banner text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC]">
              {assignment.subject}
            </span>
            <h3 className="font-bold text-base mt-1 font-serif">{assignment.title}</h3>
            <p className="text-xs text-[#F9F7F2]/90">
              {assignment.classroomName} • {assignment.totalPoints} Marks
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="border-b border-[#EDEAE2] px-5 flex gap-6 text-xs font-bold bg-[#F9F7F2]">
          <button
            onClick={() => setActiveTab('submit')}
            className={`py-3 border-b-2 transition-all ${
              activeTab === 'submit'
                ? 'border-[#4A6741] text-[#4A6741] font-extrabold'
                : 'border-transparent text-[#7A7A72]'
            }`}
          >
            Assignment Details & Submission
          </button>
          <button
            onClick={() => setActiveTab('ai-helper')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ai-helper'
                ? 'border-[#E88D67] text-[#E88D67] font-extrabold'
                : 'border-transparent text-[#7A7A72]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E88D67]" />
            <span>AI Homework Helper</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'submit' ? (
            <>
              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] space-y-2">
                <h4 className="font-bold text-[#2D2D2A] text-xs font-serif">
                  Teacher Instructions:
                </h4>
                <p className="text-[#2D2D2A] leading-relaxed font-sans">
                  {assignment.instructions}
                </p>
                <div className="pt-2 text-[10px] text-[#E88D67] font-bold">
                  Due Date: {assignment.dueDate} at {assignment.dueTime}
                </div>
              </div>

              {/* Status Banner */}
              {existingSubmission ? (
                <div
                  className={`p-4 rounded-2xl border space-y-2 ${
                    existingSubmission.status === 'graded'
                      ? 'bg-[#EBF1E8] border-[#88A070]/40'
                      : 'bg-[#F9F7F2] border-[#EDEAE2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#4A6741] flex items-center gap-1.5 text-xs">
                      <CheckCircle className="w-4 h-4 text-[#4A6741]" />
                      Status:{' '}
                      {existingSubmission.status === 'graded'
                        ? `Graded (${existingSubmission.grade}/${assignment.totalPoints})`
                        : 'Submitted & Awaiting Grading'}
                    </span>
                    <span className="text-[10px] text-[#7A7A72]">
                      Submitted at {new Date(existingSubmission.submittedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {existingSubmission.feedback && (
                    <div className="pt-2 border-t border-[#88A070]/30">
                      <p className="font-bold text-[#2D2D2A] text-[11px]">Teacher Feedback:</p>
                      <p className="text-[#2D2D2A] italic mt-0.5">
                        "{existingSubmission.feedback}"
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Submission Form */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                <h4 className="font-bold text-[#2D2D2A] text-xs font-serif">
                  {existingSubmission ? 'Resubmit Homework' : 'Homework Submission'}
                </h4>

                {isBelowClass9 ? (
                  <div className="p-3.5 rounded-2xl bg-[#EBF1E8] border border-[#88A070]/40 flex items-start gap-2.5 text-[#2D2D2A]">
                    <CheckCircle className="w-4 h-4 text-[#4A6741] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-[#4A6741]">
                        Grade {studentGrade} Direct Submission Enabled
                      </p>
                      <p className="text-[11px] text-[#7A7A72] mt-0.5">
                        Students below Class 9 do not need to upload files. Simply click{' '}
                        <strong>{existingSubmission ? 'Resubmit' : 'Submit Homework'}</strong> below
                        to turn in your assignment directly!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-[#2D2D2A] mb-1">
                      Attach Homework File (PDF/Image):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="e.g. Aarav_Math_Ch4.pdf or click Browse..."
                        className="flex-1 px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFileName(`${currentUser.name.replace(/\s+/g, '_')}_Assignment.pdf`)
                        }
                        className="px-3 py-2 bg-[#F0EDE5] hover:bg-[#E5E1D8] rounded-xl font-bold text-xs text-[#2D2D2A]"
                      >
                        Browse PDF
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-[#2D2D2A] mb-1">
                    Notes / Typed Answers (Optional):
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={3}
                    placeholder={
                      isBelowClass9
                        ? 'Type any notes or answers here if requested by your teacher (optional)...'
                        : 'Write any additional notes, explanations or typed answers here...'
                    }
                    className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741] resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-[#F0EDE5] text-[#2D2D2A] font-bold hover:bg-[#E5E1D8]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3D5535] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    {isBelowClass9 ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{existingSubmission ? 'Resubmit Homework' : 'Submit Homework'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* AI Homework Helper Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#FDEEDC] border border-[#E88D67]/40 text-[#2D2D2A] space-y-1">
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-[#E88D67]">
                  <Sparkles className="w-4 h-4 text-[#E88D67]" />
                  Ask Sikshya AI for Homework Guidance:
                </h4>
                <p className="text-[11px] opacity-90">
                  Sikshya AI provides step-by-step conceptual hints without giving away final direct
                  solutions, so you truly master the topic!
                </p>
              </div>

              <div>
                <textarea
                  value={aiHelperQuery}
                  onChange={(e) => setAiHelperQuery(e.target.value)}
                  rows={3}
                  placeholder="e.g. How do I start step 1 for factorization problem #3?"
                  className="w-full p-3 bg-[#F9F7F2] rounded-2xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                />
                <button
                  onClick={handleAiHelperAsk}
                  disabled={isAiLoading || !aiHelperQuery.trim()}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#E88D67] text-white font-bold text-xs hover:bg-[#D87B55] disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Get AI Step-by-Step Guidance</span>
                </button>
              </div>

              {aiHelperResult && (
                <div className="p-4 rounded-2xl bg-white border border-[#EDEAE2] space-y-2">
                  <h4 className="font-bold text-[#E88D67] text-xs">Sikshya AI Guidance:</h4>
                  <div className="whitespace-pre-wrap font-sans text-[#2D2D2A] leading-relaxed text-xs">
                    {aiHelperResult}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
