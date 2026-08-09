import React, { useState, useEffect } from 'react';
import { User, StudentProfile } from '@lms/shared';
import { X, Users, Check, Save, UserPlus, Trash2 } from 'lucide-react';

interface AdminParentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  parent: User | null;
  allStudents: StudentProfile[];
  onSaveLink: (parentId: string, childrenIds: string[]) => void;
}

export const AdminParentLinkModal: React.FC<AdminParentLinkModalProps> = ({
  isOpen,
  onClose,
  parent,
  allStudents,
  onSaveLink,
}) => {
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

  useEffect(() => {
    if (parent && parent.childrenIds) {
      setSelectedChildIds(parent.childrenIds);
    } else {
      setSelectedChildIds([]);
    }
  }, [parent, isOpen]);

  if (!isOpen || !parent) return null;

  const toggleChildLink = (childId: string) => {
    if (selectedChildIds.includes(childId)) {
      setSelectedChildIds((prev) => prev.filter((id) => id !== childId));
    } else {
      setSelectedChildIds((prev) => [...prev, childId]);
    }
  };

  const handleSave = () => {
    onSaveLink(parent.id, selectedChildIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#2D2D2A]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#EDEAE2] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 natural-banner text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base font-serif">Family & Children Allocator</h3>
              <p className="text-xs text-[#F9F7F2]/90">
                Parent: {parent.name} ({parent.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          <div className="p-3.5 rounded-2xl bg-[#FDEEDC] border border-[#E88D67]/40 text-[#2D2D2A]">
            <p className="font-bold text-xs text-[#E88D67]">
              Enrolled Children Counter: {selectedChildIds.length} {selectedChildIds.length === 1 ? 'Child' : 'Children'} Linked
            </p>
            <p className="text-[11px] opacity-90 mt-0.5">
              Select or deselect students below to update this parent's active family portal access and emergency contacts.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-[#2D2D2A] text-xs font-serif mb-2">
              Select Enrolled Students to Link:
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {allStudents.map((student) => {
                const isLinked = selectedChildIds.includes(student.id);
                return (
                  <div
                    key={student.id}
                    onClick={() => toggleChildLink(student.id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      isLinked
                        ? 'bg-[#EBF1E8] border-[#88A070]/50 shadow-xs'
                        : 'bg-[#F9F7F2] border-[#EDEAE2] hover:bg-[#F0EDE5]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-8 h-8 rounded-full object-cover border border-white"
                      />
                      <div>
                        <p className="font-bold text-[#2D2D2A] text-xs">{student.name}</p>
                        <p className="text-[10px] text-[#7A7A72]">
                          Grade {student.gradeLevel}-{student.section} • Roll #{student.rollNumber || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        isLinked
                          ? 'bg-[#4A6741] border-[#4A6741] text-white'
                          : 'border-[#7A7A72]/40 bg-white'
                      }`}
                    >
                      {isLinked && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
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
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3D5535] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Family Allocation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
