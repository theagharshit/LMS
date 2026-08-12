import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { EligibleSubstituteTeacher, Classroom, SubstituteRequest } from '@lms/shared';
import { toast } from '@utils/toast';
import {
  UserCheck,
  AlertCircle,
  Calendar,
  Clock,
  BookOpen,
  User,
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
  Filter,
  Edit3,
} from 'lucide-react';

interface SubstituteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClassroomId?: string;
  initialTeacherAbsenceRequestId?: string;
  editingSubstituteRequest?: SubstituteRequest | null;
}

export const SubstituteRequestModal: React.FC<SubstituteRequestModalProps> = ({
  isOpen,
  onClose,
  initialClassroomId,
  initialTeacherAbsenceRequestId,
  editingSubstituteRequest,
}) => {
  const {
    classrooms,
    allUsers,
    fetchEligibleSubstitutes,
    createSubstituteRequest,
    updateSubstituteStatus,
  } = useApp();

  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(
    initialClassroomId || classrooms[0]?.id || '',
  );
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState<string>('10:00 AM - 10:45 AM');
  const [reason, setReason] = useState<string>('');
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string>('');

  const [candidates, setCandidates] = useState<EligibleSubstituteTeacher[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState<boolean>(false);
  const [candidateFilter, setCandidateFilter] = useState<'all' | 'qualified'>('all');

  const currentClassroom = classrooms.find((c) => c.id === selectedClassroomId);
  const originalTeacher = allUsers.find((u) => u.id === currentClassroom?.teacherId);

  useEffect(() => {
    if (editingSubstituteRequest) {
      setSelectedClassroomId(editingSubstituteRequest.classroomId);
      setDate(editingSubstituteRequest.date);
      setTimeSlot(editingSubstituteRequest.timeSlot);
      setReason(editingSubstituteRequest.reason);
      setSelectedSubstituteId(
        editingSubstituteRequest.assignedSubstituteId ||
          editingSubstituteRequest.suggestedSubstituteId ||
          '',
      );
    } else if (initialClassroomId) {
      setSelectedClassroomId(initialClassroomId);
    }
  }, [initialClassroomId, editingSubstituteRequest, isOpen]);

  useEffect(() => {
    if (isOpen && currentClassroom) {
      setIsLoadingCandidates(true);
      fetchEligibleSubstitutes(currentClassroom.id, currentClassroom.subject, date, timeSlot)
        .then((res) => setCandidates(res))
        .catch(() => setCandidates([]))
        .finally(() => setIsLoadingCandidates(false));
    }
  }, [isOpen, selectedClassroomId, date, timeSlot]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroomId || !date || !timeSlot || !reason.trim()) {
      toast.warning('Please fill in all required fields (Classroom, Date, Time Slot, and Reason).');
      return;
    }

    if (!selectedSubstituteId) {
      toast.warning('Please choose a substitute teacher before submitting.');
      return;
    }

    if (!originalTeacher) {
      toast.error('Classroom does not have a primary teacher assigned.');
      return;
    }

    if (editingSubstituteRequest) {
      await updateSubstituteStatus(
        editingSubstituteRequest.id,
        editingSubstituteRequest.status || 'PENDING',
        'Updated substitute teacher assignment',
        selectedSubstituteId,
      );
      toast.success('Substitute teacher assigned & request updated successfully!', {
        title: 'Substitute Updated',
      });
    } else {
      await createSubstituteRequest({
        classroomId: selectedClassroomId,
        subjectId: currentClassroom?.subject || 'General',
        date,
        timeSlot,
        originalTeacherId: originalTeacher.id,
        suggestedSubstituteId: selectedSubstituteId,
        reason: reason.trim(),
        teacherAbsenceRequestId: initialTeacherAbsenceRequestId,
      });
      toast.success('Substitute request created successfully!', {
        title: 'Request Created',
      });
    }

    onClose();
  };

  const filteredCandidates = candidates.filter((cand) => {
    if (candidateFilter === 'qualified') return cand.isQualified;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-[#EDEAE2] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[#EDEAE2] pb-4">
          <div className="space-y-1">
            <h3 className="font-extrabold text-lg text-[#2D2D2A] font-serif flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#E88D67]" />
              Request Substitute Teacher
            </h3>
            <p className="text-xs text-[#7A7A72]">
              Filter eligible teachers by subject qualification, schedule availability, and workload
              score.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2 py-1 rounded-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2D2D2A] mb-1">
                Target Classroom & Subject <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="w-full text-xs bg-[#F9F7F2] p-3 rounded-2xl border border-[#EDEAE2] font-semibold text-[#2D2D2A] focus:outline-none focus:ring-2 focus:ring-[#E88D67]"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.subject})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D2D2A] mb-1">
                Primary Assigned Teacher
              </label>
              <div className="p-3 bg-[#F9F7F2] rounded-2xl border border-[#EDEAE2] flex items-center gap-2">
                <User className="w-4 h-4 text-[#4A6741]" />
                <span className="text-xs font-bold text-[#2D2D2A]">
                  {originalTeacher?.name || 'Unassigned'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D2D2A] mb-1">
                Duty Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs bg-[#F9F7F2] p-3 rounded-2xl border border-[#EDEAE2] font-semibold text-[#2D2D2A] focus:outline-none focus:ring-2 focus:ring-[#E88D67]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D2D2A] mb-1">
                Time Slot / Period <span className="text-rose-500">*</span>
              </label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full text-xs bg-[#F9F7F2] p-3 rounded-2xl border border-[#EDEAE2] font-semibold text-[#2D2D2A] focus:outline-none focus:ring-2 focus:ring-[#E88D67]"
              >
                <option value="10:00 AM - 10:45 AM">Period 1 (10:00 AM - 10:45 AM)</option>
                <option value="10:45 AM - 11:30 AM">Period 2 (10:45 AM - 11:30 AM)</option>
                <option value="11:45 AM - 12:30 PM">Period 3 (11:45 AM - 12:30 PM)</option>
                <option value="01:15 PM - 02:00 PM">Period 4 (01:15 PM - 02:00 PM)</option>
                <option value="Full Day Duty">Full Day Duty (All Periods)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2D2D2A] mb-1">
              Reason for Absence / Substitute Request <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Medical leave, professional training, family event..."
              className="w-full text-xs bg-[#F9F7F2] p-3 rounded-2xl border border-[#EDEAE2] font-semibold text-[#2D2D2A] focus:outline-none focus:ring-2 focus:ring-[#E88D67]"
            />
          </div>

          {/* Candidate Teacher Evaluation Matrix */}
          <div className="space-y-3 pt-2 border-t border-[#EDEAE2]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#2D2D2A] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#E88D67]" />
                Candidate Teachers Matrix (Filtered by Qualification & Workload)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCandidateFilter('all')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                    candidateFilter === 'all'
                      ? 'bg-[#2D2D2A] text-white'
                      : 'bg-[#F9F7F2] text-[#7A7A72]'
                  }`}
                >
                  All Teachers
                </button>
                <button
                  type="button"
                  onClick={() => setCandidateFilter('qualified')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                    candidateFilter === 'qualified'
                      ? 'bg-[#4A6741] text-white'
                      : 'bg-[#F9F7F2] text-[#7A7A72]'
                  }`}
                >
                  Qualified Only
                </button>
              </div>
            </div>

            {isLoadingCandidates ? (
              <div className="p-6 text-center text-xs text-[#7A7A72] bg-[#F9F7F2] rounded-2xl border border-[#EDEAE2]">
                Evaluating teacher availability and workload...
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#7A7A72] bg-[#F9F7F2] rounded-2xl border border-[#EDEAE2]">
                No candidates match the selected filter.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {filteredCandidates.map((cand) => {
                  const isAvailable = cand.isAvailable;
                  const isSelected = selectedSubstituteId === cand.teacherId;

                  return (
                    <div
                      key={cand.teacherId}
                      onClick={() => {
                        if (!isAvailable) {
                          toast.warning(
                            `Cannot select ${cand.teacherName}: ${cand.rejectionReason || 'Teacher is on leave'}`,
                          );
                          return;
                        }
                        setSelectedSubstituteId(cand.teacherId);
                      }}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        !isAvailable
                          ? 'opacity-50 bg-gray-100 border-gray-200 cursor-not-allowed'
                          : isSelected
                            ? 'border-[#E88D67] bg-[#FDEEDC]/40 ring-1 ring-[#E88D67] cursor-pointer'
                            : 'border-[#EDEAE2] bg-[#F9F7F2] hover:border-[#4A6741] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={cand.teacherAvatar}
                          alt={cand.teacherName}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-white shadow-xs"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#2D2D2A]">
                              {cand.teacherName}
                            </span>
                            {cand.isQualified ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Subject Qualified ✅
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold">
                                General Staff
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#7A7A72]">
                            Active Workload: {cand.currentWorkload} duties •{' '}
                            {isAvailable ? (
                              <span className="text-emerald-700 font-bold">Available</span>
                            ) : (
                              <span className="text-rose-600 font-bold">
                                ⛔ {cand.rejectionReason || 'On Approved Leave'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {!isAvailable ? (
                          <span className="px-3 py-1 rounded-xl bg-rose-100 text-rose-800 text-[10px] font-extrabold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-700" />
                            <span>On Leave ⛔</span>
                          </span>
                        ) : isSelected ? (
                          <span className="px-3 py-1 rounded-xl bg-[#E88D67] text-white text-[10px] font-extrabold shadow-xs">
                            Selected
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-xl bg-white border border-[#EDEAE2] text-[#2D2D2A] text-[10px] font-bold hover:bg-[#EDEAE2]">
                            Select
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#EDEAE2]">
            {!selectedSubstituteId && (
              <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Choose a substitute teacher above before submitting.</span>
              </p>
            )}

            <div className="flex justify-end gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#7A7A72] hover:bg-[#F9F7F2]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedSubstituteId}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition-all ${
                  selectedSubstituteId
                    ? 'bg-[#E88D67] hover:bg-[#D87B55] text-white cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-75'
                }`}
              >
                {selectedSubstituteId
                  ? editingSubstituteRequest
                    ? 'Save & Update Substitute'
                    : 'Submit Substitute Request'
                  : 'Choose Teacher to Submit'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
