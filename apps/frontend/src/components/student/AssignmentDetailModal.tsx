import React, { useState } from 'react';
import { apiFetch } from '@utils/apiFetch';
import { sha256File } from '@utils/fileChecksum';
import { toast } from '@utils/toast';
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
  History,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  RotateCcw,
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'submit' | 'ai-helper'>('submit');
  const [aiHelperQuery, setAiHelperQuery] = useState('');
  const [aiHelperResult, setAiHelperResult] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  if (!assignmentId) return null;

  const assignment = assignments.find((a) => a.id === assignmentId);
  if (!assignment) return null;

  const existingSubmission = submissions.find(
    (s) => s.assignmentId === assignmentId && s.studentId === currentUser.id,
  );

  // Check deadline
  const now = new Date();
  const dueDateTimeStr = `${assignment.dueDate}T${assignment.dueTime || '23:59'}:00`;
  const dueDateObj = new Date(dueDateTimeStr);
  const isPastDeadline = !isNaN(dueDateObj.getTime()) && now > dueDateObj;

  const historyItems = existingSubmission?.history || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !responseText.trim()) {
      toast.warning('Attach a file or enter a typed response before submitting.');
      return;
    }
    let fileUrl = '';
    if (selectedFile) {
      const checksum = await sha256File(selectedFile);
      const upload = await apiFetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({
          name: selectedFile.name,
          sizeBytes: selectedFile.size,
          mimeType: selectedFile.type || 'application/octet-stream',
          checksum,
          classroomId: assignment.classroomId,
        }),
        feedback: false,
      });
      if (!upload.ok) return;
      const payload = await upload.json();
      fileUrl = payload.record?.downloadUrl || '';
      if (!fileUrl) return;
    }
    submitHomework(assignmentId, fileUrl, selectedFile?.name || '', responseText.trim());
  };

  const handleAiHelperAsk = async () => {
    if (!aiHelperQuery.trim() || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const res = await apiFetch('/api/ai/homework-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          questionText: aiHelperQuery,
        }),
        feedback: false,
      });
      if (!res.ok) throw new Error('Homework helper request failed.');
      const data = await res.json();
      setAiHelperResult(data.text);
    } catch (err) {
      toast.warning('AI help is temporarily unavailable.', {
        title: 'Homework help unavailable',
        id: 'homework-helper-unavailable',
      });
      setAiHelperResult(null);
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
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="border-b border-[#EDEAE2] px-5 flex gap-6 text-xs font-bold bg-[#F9F7F2]">
          <button
            onClick={() => setActiveTab('submit')}
            className={`py-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'submit'
                ? 'border-[#4A6741] text-[#4A6741] font-extrabold'
                : 'border-transparent text-[#7A7A72]'
            }`}
          >
            Assignment Details & Submission
          </button>
          <button
            onClick={() => setActiveTab('ai-helper')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
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
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#2D2D2A] text-xs font-serif">
                    Teacher Instructions:
                  </h4>
                  <div
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      isPastDeadline
                        ? 'bg-[#FFF3EB] text-[#D87B55] border border-[#E88D67]/40'
                        : 'bg-[#EBF1E8] text-[#4A6741]'
                    }`}
                  >
                    {isPastDeadline ? (
                      <AlertTriangle className="w-3 h-3 text-[#D87B55]" />
                    ) : (
                      <Clock className="w-3 h-3 text-[#4A6741]" />
                    )}
                    <span>
                      Due: {assignment.dueDate} at {assignment.dueTime}
                    </span>
                  </div>
                </div>
                <p className="text-[#2D2D2A] leading-relaxed font-sans">
                  {assignment.instructions}
                </p>
              </div>

              {/* Status & Deadline Banner */}
              {isPastDeadline && (
                <div className="p-3.5 rounded-2xl bg-[#FFF3EB] border border-[#E88D67]/40 flex items-start gap-2.5 text-[#D87B55]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#D87B55]" />
                  <div>
                    <p className="font-bold text-xs">Past Due Date (Late Submission Policy)</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      The official deadline has passed ({assignment.dueDate} at {assignment.dueTime}
                      ). Any submission or resubmission made now will be flagged as a{' '}
                      <strong>Late Submission</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Submission Status & Feedback */}
              {existingSubmission ? (
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    existingSubmission.status === 'graded'
                      ? 'bg-[#EBF1E8] border-[#88A070]/40'
                      : existingSubmission.isLate || existingSubmission.status === 'late'
                        ? 'bg-[#FFF3EB] border-[#E88D67]/40'
                        : 'bg-[#F9F7F2] border-[#EDEAE2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2D2D2A] flex items-center gap-1.5 text-xs">
                      {existingSubmission.status === 'graded' ? (
                        <CheckCircle className="w-4 h-4 text-[#4A6741]" />
                      ) : existingSubmission.isLate || existingSubmission.status === 'late' ? (
                        <AlertTriangle className="w-4 h-4 text-[#D87B55]" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-[#4A6741]" />
                      )}
                      Status:{' '}
                      {existingSubmission.status === 'graded'
                        ? `Graded (${existingSubmission.grade}/${assignment.totalPoints} Marks)`
                        : existingSubmission.isLate || existingSubmission.status === 'late'
                          ? 'Submitted (Late Submission)'
                          : 'Submitted & Awaiting Grading'}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        existingSubmission.isLate || existingSubmission.status === 'late'
                          ? 'bg-[#E88D67] text-white'
                          : 'bg-[#4A6741] text-white'
                      }`}
                    >
                      {existingSubmission.isLate || existingSubmission.status === 'late'
                        ? 'Late'
                        : 'On Time'}
                    </span>
                  </div>

                  {existingSubmission.submittedAt && (
                    <p className="text-[10px] text-[#7A7A72]">
                      Latest turn-in on {new Date(existingSubmission.submittedAt).toLocaleString()}
                    </p>
                  )}

                  {existingSubmission.feedback && (
                    <div className="pt-2 border-t border-[#EDEAE2]">
                      <p className="font-bold text-[#2D2D2A] text-[11px]">Teacher Feedback:</p>
                      <p className="text-[#2D2D2A] italic mt-0.5">
                        "{existingSubmission.feedback}"
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Collapsible Submission History Panel */}
              {historyItems.length > 0 && (
                <div className="rounded-2xl border border-[#EDEAE2] overflow-hidden bg-[#F9F7F2]">
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="w-full px-4 py-3 bg-[#F9F7F2] hover:bg-[#F0EDE5] flex items-center justify-between font-bold text-xs text-[#2D2D2A] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-[#4A6741]" />
                      <span>Submission & Resubmission History</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EBF1E8] dark:bg-[#233421] text-[#4A6741] dark:text-[#88A070] text-[10px] font-extrabold border border-[#88A070]/30">
                        {historyItems.length} {historyItems.length === 1 ? 'Attempt' : 'Attempts'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#7A7A72] text-[11px]">
                      <span>{isHistoryOpen ? 'Hide History' : 'View History'}</span>
                      {isHistoryOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {isHistoryOpen && (
                    <div className="p-3.5 border-t border-[#EDEAE2] bg-white space-y-3 animate-in fade-in duration-200">
                      {historyItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#4A6741] text-white">
                                v{item.version || historyItems.length - idx}{' '}
                                {idx === 0 ? '(Latest)' : ''}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  item.isLate || item.status === 'late'
                                    ? 'bg-[#FFF3EB] text-[#D87B55] border-[#E88D67]/30'
                                    : 'bg-[#EBF1E8] text-[#4A6741] border-[#88A070]/30'
                                }`}
                              >
                                {item.isLate || item.status === 'late'
                                  ? 'Late Submission'
                                  : 'On Time'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-[#7A7A72]">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(item.submittedAt).toLocaleString()}</span>
                            </div>
                          </div>

                          {item.fileName && (
                            <div className="flex items-center gap-2 pt-1 text-xs">
                              <Paperclip className="w-3.5 h-3.5 text-[#4A6741]" />
                              <span className="font-bold text-[#2D2D2A] truncate max-w-xs">
                                {item.fileName}
                              </span>
                            </div>
                          )}

                          {item.responseText && (
                            <p className="text-[#7A7A72] text-[11px] italic bg-white p-2 rounded-xl border border-[#EDEAE2]">
                              "{item.responseText}"
                            </p>
                          )}

                          {item.status === 'graded' && item.grade !== undefined && (
                            <div className="pt-2 border-t border-[#EDEAE2] flex items-center justify-between text-[11px]">
                              <span className="font-bold text-[#4A6741]">
                                Score: {item.grade}/{assignment.totalPoints} Marks
                              </span>
                              {item.feedback && (
                                <span className="text-[#7A7A72] italic truncate max-w-[220px]">
                                  "{item.feedback}"
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submission Form */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#2D2D2A] text-xs font-serif flex items-center gap-1.5">
                    {existingSubmission ? (
                      <RotateCcw className="w-3.5 h-3.5 text-[#E88D67]" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-[#4A6741]" />
                    )}
                    <span>
                      {existingSubmission
                        ? 'Resubmit Homework (New Version)'
                        : 'Homework Submission'}
                    </span>
                  </h4>
                  {existingSubmission && (
                    <span className="text-[10px] text-[#7A7A72] font-semibold">
                      Resubmitting creates a new version in your submission history
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-[#2D2D2A] mb-1">
                    Attach Homework File (optional):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".pdf,.docx,.png,.jpg,.jpeg,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                      }}
                      className="flex-1 px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#2D2D2A] mb-1">
                    Notes / Typed Answers (Optional):
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={3}
                    placeholder="Write notes, explanations, or typed answers"
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
                    {existingSubmission ? (
                      <RotateCcw className="w-4 h-4" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{existingSubmission ? 'Submit Resubmission' : 'Submit Homework'}</span>
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
