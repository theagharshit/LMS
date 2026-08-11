import React, { useState, useEffect, useRef } from 'react';
import { StudentProfile } from '@lms/shared';
import { useApp } from '../../context/AppContext';
import {
  X,
  Save,
  GraduationCap,
  Users,
  ShieldCheck,
  HeartPulse,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';

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
  const { studentProfiles } = useApp();
  const [activeTab, setActiveTab] = useState<'student' | 'parent' | 'verification'>('student');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Tab 1: Student Demographics
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gradeLevel, setGradeLevel] = useState(8);
  const [section, setSection] = useState('A');
  const [rollNumber, setRollNumber] = useState<number | ''>('');
  const [schoolName, setSchoolName] = useState('Everest International Academy');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Tab 2: Parent Onboarding
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  const [parentOccupation, setParentOccupation] = useState('');
  const [relationship, setRelationship] = useState('Father');
  const [secondaryContact, setSecondaryContact] = useState('');

  // Tab 3: Verification Status
  const [verificationStatus, setVerificationStatus] = useState<
    'pending_verification' | 'verified_enrolled'
  >('verified_enrolled');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValidationError(null);
    setShowExitConfirm(false);
    setActiveTab('student');

    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setGradeLevel(initialData.gradeLevel || 8);
      setSection(initialData.section || 'A');
      setRollNumber(initialData.rollNumber || '');
      setSchoolName(initialData.schoolName || 'Everest International Academy');
      setDob(initialData.dob || '2012-05-14');
      setGender(initialData.gender || 'Male');
      setBloodGroup(initialData.bloodGroup || 'O+');
      setMedicalNotes(initialData.medicalNotes || '');

      setParentName(initialData.parentName || '');
      setParentPhone(initialData.parentPhone || '');
      setParentEmail(initialData.parentEmail || '');
      setParentAddress(initialData.parentAddress || 'Kathmandu, Nepal');
      setParentOccupation(initialData.parentOccupation || '');
      setRelationship(initialData.relationship || 'Father');
      setSecondaryContact(initialData.secondaryContact || '');

      setVerificationStatus(initialData.verificationStatus || 'verified_enrolled');
    } else {
      setName('');
      setEmail('');
      setGradeLevel(8);
      setSection('A');
      setRollNumber('');
      setSchoolName('Everest International Academy');
      setDob('');
      setGender('Male');
      setBloodGroup('O+');
      setMedicalNotes('');

      setParentName('');
      setParentPhone('');
      setParentEmail('');
      setParentAddress('');
      setParentOccupation('');
      setRelationship('Father');
      setSecondaryContact('');

      setVerificationStatus('verified_enrolled');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isFormDirty = (): boolean => {
    if (initialData) return false;
    return Boolean(
      name.trim() ||
      email.trim() ||
      rollNumber ||
      dob ||
      parentName.trim() ||
      parentPhone.trim() ||
      parentAddress.trim(),
    );
  };

  const handleAttemptClose = () => {
    if (isFormDirty()) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleAttemptClose();
    }
  };

  // Helper for Auto-assigning next roll number
  const handleAutoAssignRollNumber = () => {
    const sameGradeSection = studentProfiles.filter(
      (s) => s.gradeLevel === gradeLevel && s.section.toUpperCase() === section.toUpperCase(),
    );
    const existingRolls = sameGradeSection
      .map((s) => s.rollNumber)
      .filter((r): r is number => typeof r === 'number' && !isNaN(r));
    const nextRoll = existingRolls.length > 0 ? Math.max(...existingRolls) + 1 : 1;
    setRollNumber(nextRoll);
    if (validationError) setValidationError(null);
  };

  // Input Sanitizer for Digits + Phone Symbols Only
  const sanitizePhoneInput = (value: string): string => {
    return value.replace(/[^0-9+\-\s]/g, '');
  };

  const validateStudentTab = (): boolean => {
    if (!name.trim()) {
      setValidationError('Student Full Name is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setValidationError('A valid Student Email address is required.');
      return false;
    }
    if (!rollNumber) {
      setValidationError(
        'Student Roll Number is required. Click "Auto ⚡" to calculate next available.',
      );
      return false;
    }
    if (!dob.trim()) {
      setValidationError('Student Date of Birth is required.');
      return false;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (dob >= todayStr) {
      setValidationError('Student Date of Birth must be in the past (before today).');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const validateParentTab = (): boolean => {
    if (!parentName.trim()) {
      setValidationError('Primary Parent / Guardian Name is required.');
      return false;
    }
    if (!parentPhone.trim() || parentPhone.trim().length < 7) {
      setValidationError('Primary Parent Contact Phone Number is required (min 7 digits).');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!parentEmail.trim() || !emailRegex.test(parentEmail.trim())) {
      setValidationError('A valid Parent Email Address is required.');
      return false;
    }
    if (!parentAddress.trim()) {
      setValidationError('Primary Parent Residential Address is required.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleNextStep = () => {
    if (activeTab === 'student') {
      if (validateStudentTab()) {
        setActiveTab('parent');
      }
    } else if (activeTab === 'parent') {
      if (validateParentTab()) {
        setActiveTab('verification');
      }
    }
  };

  const handleTabClick = (targetTab: 'student' | 'parent' | 'verification') => {
    if (targetTab === 'parent') {
      if (!validateStudentTab()) return;
    } else if (targetTab === 'verification') {
      if (!validateStudentTab() || !validateParentTab()) return;
    }
    setValidationError(null);
    setActiveTab(targetTab);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStudentTab() || !validateParentTab()) {
      return;
    }

    onSave({
      name: name.trim(),
      email: email.trim(),
      role: 'student',
      schoolName: schoolName.trim(),
      gradeLevel: Number(gradeLevel),
      section: section.trim().toUpperCase(),
      rollNumber: Number(rollNumber),
      dob: dob.trim(),
      gender: gender.trim(),
      bloodGroup: bloodGroup.trim(),
      medicalNotes: medicalNotes.trim(),

      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      parentEmail: parentEmail.trim(),
      parentAddress: parentAddress.trim(),
      parentOccupation: parentOccupation.trim(),
      relationship: relationship.trim(),
      secondaryContact: secondaryContact.trim(),

      verificationStatus,
      avatar:
        initialData?.avatar ||
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    });
    onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 overflow-hidden bg-[#2D2D2A]/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#EDEAE2] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative"
      >
        {/* Header */}
        <div className="p-6 natural-banner text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg font-serif">
                {initialData
                  ? 'Edit Student & Parent Onboarding'
                  : 'Full Student & Parent Onboarding'}
              </h3>
              <p className="text-xs text-[#FDEEDC] opacity-90">
                Register complete demographic, medical, and parent guardian details
              </p>
            </div>
          </div>
          <button
            onClick={handleAttemptClose}
            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exit Confirmation Prompt */}
        {showExitConfirm && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-800 flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                You have unsaved onboarding data. Are you sure you want to discard and exit?
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-3 py-1 rounded-xl bg-white text-rose-700 border border-rose-300 hover:bg-rose-100 cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-2xs"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        )}

        {/* Validation Alert Banner */}
        {validationError && !showExitConfirm && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[#EDEAE2] bg-[#F9F7F2] px-6 pt-3 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleTabClick('student')}
            className={`px-4 py-2.5 rounded-t-2xl border-t border-x transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'student'
                ? 'bg-white border-[#EDEAE2] text-[#4A6741] shadow-xs'
                : 'border-transparent text-[#7A7A72] hover:text-[#2D2D2A]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>1. Student Demographics</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('parent')}
            className={`px-4 py-2.5 rounded-t-2xl border-t border-x transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'parent'
                ? 'bg-white border-[#EDEAE2] text-[#4A6741] shadow-xs'
                : 'border-transparent text-[#7A7A72] hover:text-[#2D2D2A]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Parent & Guardian Info</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('verification')}
            className={`px-4 py-2.5 rounded-t-2xl border-t border-x transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'verification'
                ? 'bg-white border-[#EDEAE2] text-[#4A6741] shadow-xs'
                : 'border-transparent text-[#7A7A72] hover:text-[#2D2D2A]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>3. Verification & Activation</span>
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]"
        >
          {/* TAB 1: Student Demographics */}
          {activeTab === 'student' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1">Full Student Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1">Student Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g. aarav.student@lms.com"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1">Grade Level</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1">Section</label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value.toUpperCase())}
                    placeholder="e.g. A"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#2D2D2A]">Roll Number *</label>
                    <button
                      type="button"
                      onClick={handleAutoAssignRollNumber}
                      className="px-1.5 py-0.5 rounded-md bg-[#EBF1E8] text-[#4A6741] hover:bg-[#4A6741] hover:text-white text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-0.5"
                      title="Auto-assign next roll number for Grade & Section"
                    >
                      <Zap className="w-2.5 h-2.5" /> Auto
                    </button>
                  </div>
                  <input
                    type="number"
                    value={rollNumber}
                    onChange={(e) => {
                      setRollNumber(e.target.value ? Number(e.target.value) : '');
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g. 14"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#4A6741]" /> DOB *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    max={new Date(Date.now() - 86400000).toISOString().split('T')[0]}
                    onChange={(e) => {
                      setDob(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1 flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2D2D2A] mb-1">
                  Medical Notes / Allergies (Optional)
                </label>
                <textarea
                  rows={2}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="e.g. Mild asthma, allergic to peanuts. Carries inhaler."
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Parent Onboarding */}
          {activeTab === 'parent' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#4A6741]" /> Primary Parent Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => {
                      setParentName(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g. Bina Sharma"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#2D2D2A] flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#4A6741]" /> Primary Contact Phone *
                    </label>
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-extrabold text-[9px] uppercase tracking-wider">
                      EMERGENCY
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={parentPhone}
                    onChange={(e) => {
                      setParentPhone(sanitizePhoneInput(e.target.value));
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g. +977-9841234567"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#4A6741]" /> Parent Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={parentEmail}
                    onChange={(e) => {
                      setParentEmail(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g. bina.sharma@example.com"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-[#7A7A72]" /> Occupation (Optional)
                  </label>
                  <input
                    type="text"
                    value={parentOccupation}
                    onChange={(e) => setParentOccupation(e.target.value)}
                    placeholder="e.g. Senior Civil Engineer"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1">Relationship</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#2D2D2A] mb-1">
                    Secondary Contact (Optional)
                  </label>
                  <input
                    type="text"
                    value={secondaryContact}
                    onChange={(e) => setSecondaryContact(sanitizePhoneInput(e.target.value))}
                    placeholder="e.g. +977-9851098765"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2D2D2A] mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#4A6741]" /> Residential Address *
                </label>
                <input
                  type="text"
                  required
                  value={parentAddress}
                  onChange={(e) => {
                    setParentAddress(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="e.g. Ward 4, Lazimpat, Kathmandu, Nepal"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Verification & Activation */}
          {activeTab === 'verification' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-[#EBF1E8] border border-[#C8DBC4] space-y-2">
                <h4 className="font-bold text-[#4A6741] flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4" /> Enrollment Verification Workflow
                </h4>
                <p className="text-[#7A7A72] text-xs">
                  Set whether this student profile is immediately verified and active, or pending
                  admin document verification.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setVerificationStatus('verified_enrolled')}
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    verificationStatus === 'verified_enrolled'
                      ? 'border-[#4A6741] bg-[#EBF1E8] shadow-xs'
                      : 'border-[#EDEAE2] bg-[#F9F7F2]'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-[#4A6741] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#2D2D2A]">Verified & Enrolled ✅</p>
                    <p className="text-[11px] text-[#7A7A72]">
                      Full access unlocked immediately for classes and portal features.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVerificationStatus('pending_verification')}
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    verificationStatus === 'pending_verification'
                      ? 'border-amber-500 bg-amber-50 shadow-xs'
                      : 'border-[#EDEAE2] bg-[#F9F7F2]'
                  }`}
                >
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#2D2D2A]">Pending Admin Verification ⏳</p>
                    <p className="text-[11px] text-[#7A7A72]">
                      Profile created but marked pending until birth cert / ID is verified.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 flex items-center justify-between border-t border-[#EDEAE2]">
            <div className="flex gap-2">
              {activeTab !== 'student' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'verification' ? 'parent' : 'student')}
                  className="px-4 py-2 rounded-xl bg-[#F0EDE5] text-[#2D2D2A] font-bold hover:bg-[#E5E1D8] cursor-pointer"
                >
                  Back
                </button>
              )}
              {activeTab !== 'verification' && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3D5535] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <span>Next Step ➔</span>
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAttemptClose}
                className="px-4 py-2 rounded-xl bg-[#F0EDE5] text-[#2D2D2A] font-bold hover:bg-[#E5E1D8] cursor-pointer"
              >
                Cancel
              </button>
              {activeTab === 'verification' && (
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3D5535] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{initialData ? 'Save Changes' : 'Complete & Enroll Student'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
