import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Send,
  Megaphone,
  AlertTriangle,
  FileCheck,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { NotificationCategory, NotificationSeverity } from '@lms/shared';

interface CustomNotificationDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomNotificationDispatchModal: React.FC<CustomNotificationDispatchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { classrooms, studentProfiles, dispatchNotification } = useApp();

  const [targetAudience, setTargetAudience] = useState<
    'all' | 'students' | 'parents' | 'teachers' | 'classroom' | 'individual'
  >('all');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(classrooms[0]?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(studentProfiles[0]?.id || '');

  const [category, setCategory] = useState<NotificationCategory>('CRITICAL');
  const [severity, setSeverity] = useState<NotificationSeverity>('high');
  const [title, setTitle] = useState('🚨 Urgent School Announcement');
  const [body, setBody] = useState(
    'Heavy rainfall forecast for tomorrow. School buses will run 30 mins early.',
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDispatch = () => {
    dispatchNotification({
      targetAudience: targetAudience === 'individual' ? undefined : (targetAudience as any),
      recipientId: targetAudience === 'individual' ? selectedStudentId : undefined,
      classroomId: targetAudience === 'classroom' ? selectedClassroomId : undefined,
      title,
      body,
      category,
      severity,
      type: category === 'CRITICAL' ? 'announcement' : 'general',
    });

    setSuccessMsg('Notification dispatched successfully!');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#EDEAE2] dark:border-slate-800 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EDEAE2] dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#4A6741]" />
            <div>
              <h3 className="font-extrabold text-base text-[#2D2D2A] dark:text-white font-serif">
                Dispatch Broadcast Alert
              </h3>
              <p className="text-[11px] text-[#7A7A72]">
                Send custom notifications to students, parents, or specific classrooms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7A7A72] hover:text-[#2D2D2A] rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 text-xs">
          {/* Target Audience */}
          <div>
            <label className="block font-bold mb-1 text-[#2D2D2A] dark:text-slate-200">
              Target Audience:
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as any)}
              className="w-full p-3 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 font-semibold"
            >
              <option value="all">🌐 All School Members (Students, Parents, Teachers)</option>
              <option value="students">🎓 All Students</option>
              <option value="parents">👨‍👩‍👧 All Parents</option>
              <option value="teachers">👨‍🏫 All Teachers</option>
              <option value="classroom">🏫 Specific Classroom</option>
              <option value="individual">👤 Individual Student</option>
            </select>
          </div>

          {targetAudience === 'classroom' && (
            <div>
              <label className="block font-bold mb-1 text-[#2D2D2A] dark:text-slate-200">
                Select Classroom:
              </label>
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 font-semibold"
              >
                {classrooms.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.subject})
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetAudience === 'individual' && (
            <div>
              <label className="block font-bold mb-1 text-[#2D2D2A] dark:text-slate-200">
                Select Recipient Student:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 font-semibold"
              >
                {studentProfiles.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.name} (Grade {stu.gradeLevel}
                    {stu.section})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category & Severity Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-[#2D2D2A] dark:text-slate-200">
                Category:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NotificationCategory)}
                className="w-full p-3 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 font-extrabold"
              >
                <option value="CRITICAL">🚨 CRITICAL (Bypasses Mutes)</option>
                <option value="ACADEMIC">📚 ACADEMIC (Homework/Notice)</option>
                <option value="COMMUNICATION">💬 COMMUNICATION (General)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#2D2D2A] dark:text-slate-200">
                Severity Level:
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as NotificationSeverity)}
                className="w-full p-3 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 font-extrabold"
              >
                <option value="urgent">🔴 Urgent / High Priority</option>
                <option value="normal">🟡 Normal Priority</option>
                <option value="info">🔵 Informational</option>
              </select>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block font-bold mb-1 text-[#2D2D2A] dark:text-slate-200">
              Notification Title:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 font-bold"
            />
          </div>

          {/* Body Input */}
          <div>
            <label className="block font-bold mb-1 text-[#2D2D2A] dark:text-slate-200">
              Message Content:
            </label>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 font-medium"
            />
          </div>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#EDEAE2] dark:border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl border border-[#EDEAE2] dark:border-slate-700 font-bold text-xs hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleDispatch}
            className="px-6 py-2.5 rounded-2xl bg-[#4A6741] text-white font-extrabold text-xs hover:bg-[#3D5535] shadow-md flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Dispatch Notification</span>
          </button>
        </div>
      </div>
    </div>
  );
};
