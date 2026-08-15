import React, { useState, useEffect } from 'react';
import { User } from '@lms/shared';
import { X, UserPlus, Save, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../utils/apiFetch';

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
  const { currentUser } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [schoolName, setSchoolName] = useState(currentUser.schoolName);
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [joinedAt, setJoinedAt] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setSelectedSubjects(initialData.subjectsTaught || []);
      setSchoolName(initialData.schoolName || currentUser.schoolName);
      setPhone(initialData.phone || '');
      setSecondaryPhone(initialData.secondaryPhone || '');
      setEmployeeNumber(initialData.employeeNumber || '');
      setJoinedAt(initialData.joinedAt?.slice(0, 10) || '');
      setAddress(initialData.address || '');
      setEmergencyContactName(initialData.emergencyContactName || '');
      setEmergencyContactPhone(initialData.emergencyContactPhone || '');
      setQualification(initialData.qualification || '');
      setSpecialization(initialData.specialization || '');
    } else {
      setName('');
      setEmail('');
      setSelectedSubjects([]);
      setSchoolName(currentUser.schoolName);
      setPhone('');
      setSecondaryPhone('');
      setEmployeeNumber('');
      setJoinedAt('');
      setAddress('');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setQualification('');
      setSpecialization('');
    }
  }, [currentUser.schoolName, initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    apiFetch('/api/db/subjects')
      .then((response) => response.json())
      .then((data) => setAvailableSubjects(Array.isArray(data.subjects) ? data.subjects : []))
      .catch(() => setAvailableSubjects([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !employeeNumber.trim() ||
      !emergencyContactName.trim() ||
      !emergencyContactPhone.trim()
    )
      return;

    onSave({
      name: name.trim(),
      email: email.trim(),
      role: 'teacher',
      schoolName: schoolName.trim(),
      subjectsTaught: selectedSubjects,
      avatar: initialData?.avatar || '',
      phone: phone.trim() || undefined,
      secondaryPhone: secondaryPhone.trim() || undefined,
      employeeNumber: employeeNumber.trim() || undefined,
      joinedAt: joinedAt || undefined,
      address: address.trim() || undefined,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      qualification: qualification.trim() || undefined,
      specialization: specialization.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#2D2D2A]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-[#EDEAE2] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="font-semibold text-[#2D2D2A]">
              Employee number *
              <input
                required
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8]"
              />
            </label>
            <label className="font-semibold text-[#2D2D2A]">
              Joined date
              <input
                type="date"
                value={joinedAt}
                onChange={(e) => setJoinedAt(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8]"
              />
            </label>
            <label className="font-semibold text-[#2D2D2A]">
              Phone *
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="font-semibold text-[#2D2D2A]">
              Secondary phone
              <input
                value={secondaryPhone}
                onChange={(e) => setSecondaryPhone(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8]"
              />
            </label>
            <label className="font-semibold text-[#2D2D2A]">
              Address
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8]"
              />
            </label>
            <label className="font-semibold text-[#2D2D2A]">
              Qualification
              <input
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8]"
              />
            </label>
            <label className="font-semibold text-[#2D2D2A]">
              Specialization
              <input
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8]"
              />
            </label>
            <label className="font-semibold text-[#2D2D2A]">
              Emergency contact *
              <input
                required
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8]"
              />
            </label>
            <label className="font-semibold text-[#2D2D2A]">
              Emergency phone *
              <input
                required
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8]"
              />
            </label>
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
            <label className="block font-semibold text-[#2D2D2A] mb-2">Subjects Taught</label>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#E5E1D8] bg-[#F9F7F2] p-3">
              {availableSubjects.map((subject) => (
                <label key={subject.id} className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(subject.name)}
                    onChange={(event) =>
                      setSelectedSubjects((current) =>
                        event.target.checked
                          ? [...new Set([...current, subject.name])]
                          : current.filter((name) => name !== subject.name),
                      )
                    }
                  />
                  <span>{subject.name}</span>
                </label>
              ))}
              {!availableSubjects.length && (
                <p className="col-span-2 text-[#7A7A72]">No active subjects are configured.</p>
              )}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#2D2D2A] mb-1">School / Institution</label>
            <input
              type="text"
              value={schoolName}
              readOnly
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
