import React, { useState, useEffect } from 'react';
import { User } from '@lms/shared';
import { X, UserPlus, Save, Briefcase } from 'lucide-react';

interface AdminTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<User, 'id'>) => void;
  initialData?: User | null;
}

export const AdminTeacherModal: React.FC<AdminTeacherModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subjectsText, setSubjectsText] = useState('');
  const [schoolName, setSchoolName] = useState('Everest International Academy');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setSubjectsText(initialData.subjectsTaught ? initialData.subjectsTaught.join(', ') : '');
      setSchoolName(initialData.schoolName || 'Everest International Academy');
    } else {
      setName('');
      setEmail('');
      setSubjectsText('');
      setSchoolName('Everest International Academy');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const subjectsTaught = subjectsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    onSave({
      name: name.trim(),
      email: email.trim(),
      role: 'teacher',
      schoolName: schoolName.trim(),
      subjectsTaught: subjectsTaught.length > 0 ? subjectsTaught : ['General Science'],
      avatar:
        initialData?.avatar ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#2D2D2A]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#EDEAE2] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 natural-banner text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            <h3 className="font-bold text-base font-serif">
              {initialData ? 'Edit Faculty Member' : 'Register New Teacher'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#2D2D2A] mb-1">Teacher Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Ramesh Thapa"
              className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#2D2D2A] mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ramesh.teacher@lms.com"
              className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#2D2D2A] mb-1">
              Subjects Taught (Comma Separated)
            </label>
            <input
              type="text"
              value={subjectsText}
              onChange={(e) => setSubjectsText(e.target.value)}
              placeholder="e.g. Mathematics, Physics, Geometry"
              className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#2D2D2A] mb-1">School / Institution</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#EDEAE2]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#F0EDE5] text-[#2D2D2A] font-bold hover:bg-[#E5E1D8] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3D5535] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{initialData ? 'Update Teacher' : 'Register Faculty'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
