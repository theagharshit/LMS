import React, { useState, useEffect } from 'react';
import { StudentProfile } from '@lms/shared';
import { X, UserPlus, Save, GraduationCap } from 'lucide-react';

interface AdminStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: Omit<
      StudentProfile,
      'id' | 'attendancePercentage' | 'streakDays' | 'xpPoints' | 'badges'
    >,
  ) => void;
  initialData?: StudentProfile | null;
}

export const AdminStudentModal: React.FC<AdminStudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gradeLevel, setGradeLevel] = useState(8);
  const [section, setSection] = useState('A');
  const [rollNumber, setRollNumber] = useState<number | ''>('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [schoolName, setSchoolName] = useState('Everest International Academy');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setGradeLevel(initialData.gradeLevel || 8);
      setSection(initialData.section || 'A');
      setRollNumber(initialData.rollNumber || '');
      setParentName(initialData.parentName || '');
      setParentPhone(initialData.parentPhone || '');
      setSchoolName(initialData.schoolName || 'Everest International Academy');
    } else {
      setName('');
      setEmail('');
      setGradeLevel(8);
      setSection('A');
      setRollNumber('');
      setParentName('');
      setParentPhone('');
      setSchoolName('Everest International Academy');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    onSave({
      name: name.trim(),
      email: email.trim(),
      role: 'student',
      schoolName: schoolName.trim(),
      gradeLevel: Number(gradeLevel),
      section: section.trim().toUpperCase(),
      rollNumber: rollNumber ? Number(rollNumber) : undefined,
      parentName: parentName.trim() || 'Parent',
      parentPhone: parentPhone.trim() || '+977-9800000000',
      avatar:
        initialData?.avatar ||
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#2D2D2A]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#EDEAE2] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 natural-banner text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            <h3 className="font-bold text-base font-serif">
              {initialData ? 'Edit Student Profile' : 'Enroll New Student'}
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
          <div>
            <label className="block font-semibold text-[#2D2D2A] mb-1">Full Student Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
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
              placeholder="e.g. aarav.student@lms.com"
              className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#2D2D2A] mb-1">Grade Level</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#2D2D2A] mb-1">Section</label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. A"
                className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#2D2D2A] mb-1">Roll Number</label>
              <input
                type="number"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 12"
                className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-[#2D2D2A] mb-1">Parent / Guardian Name</label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g. Bina Sharma"
                className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#2D2D2A] mb-1">Parent Contact Phone</label>
              <input
                type="text"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="e.g. +977-9841234567"
                className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#2D2D2A] mb-1">School Name</label>
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
              <span>{initialData ? 'Update Student' : 'Save & Enroll Student'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
