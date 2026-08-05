import React from 'react';
import { X, Printer } from 'lucide-react';
import { StudentProfile } from '@lms/shared';

interface IdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentData: StudentProfile;
}

export const IdCardModal: React.FC<IdCardModalProps> = ({ isOpen, onClose, studentData }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden print:shadow-none print:m-0 print:p-0 print:absolute print:inset-0 print:max-w-none print:flex print:items-center print:justify-center">
        {/* Header - Hidden on print */}
        <div className="flex items-center justify-between p-4 border-b border-[#EDEAE2] print:hidden">
          <h2 className="font-bold text-[#2D2D2A] font-serif text-lg">Student ID Card</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F9F7F2] text-[#7A7A72] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area - Centered in UI and absolute on Print */}
        <div className="p-6 md:p-8 flex justify-center bg-[#F9F7F2] print:bg-white print:w-full print:h-screen">
          <div className="print-id-card w-[2.125in] h-[3.375in] min-w-[300px] min-h-[480px] bg-white rounded-2xl shadow-sm border border-[#EDEAE2] overflow-hidden relative flex flex-col print:shadow-none print:border-black print:scale-100">
            {/* Top Banner */}
            <div className="bg-[#4A6741] text-white p-4 text-center pb-8">
              <h3 className="font-extrabold font-serif text-lg leading-tight">Mount Everest</h3>
              <p className="text-[10px] tracking-widest uppercase opacity-90 font-bold">
                Secondary School
              </p>
            </div>

            {/* Photo & Details */}
            <div className="flex flex-col items-center flex-1 p-6 text-center bg-white relative">
              {/* Photo */}
              <div className="absolute -top-12">
                <img
                  src={studentData.avatar}
                  alt={studentData.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm bg-white"
                />
              </div>

              <div className="mt-12 space-y-4 w-full">
                <div>
                  <h4 className="font-extrabold text-[#2D2D2A] text-xl font-serif">
                    {studentData.name}
                  </h4>
                  <p className="text-xs font-bold text-[#7A7A72] uppercase tracking-wider mt-1">
                    Student
                  </p>
                </div>

                <div className="w-full h-px bg-[#EDEAE2]" />

                <div className="grid grid-cols-2 gap-y-2 text-left text-xs px-2">
                  <div className="text-[#7A7A72]">ID No.</div>
                  <div className="font-bold text-[#2D2D2A]">
                    STU-{studentData.id.slice(0, 4).toUpperCase()}
                  </div>

                  <div className="text-[#7A7A72]">Grade</div>
                  <div className="font-bold text-[#2D2D2A]">
                    {studentData.gradeLevel}-{studentData.section}
                  </div>

                  <div className="text-[#7A7A72]">Roll No.</div>
                  <div className="font-bold text-[#2D2D2A]">{studentData.rollNumber}</div>

                  <div className="text-[#7A7A72]">DOB</div>
                  <div className="font-bold text-[#2D2D2A]">2065/04/12</div>
                </div>
              </div>

              <div className="mt-auto w-full pt-4">
                {/* Decorative Barcode */}
                <div className="h-8 w-full flex items-center justify-between px-2 gap-px opacity-70 grayscale">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-black h-full"
                      style={{ width: `${Math.max(1, i % 3 === 0 ? 3 : Math.random() * 4)}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Hidden on print */}
        <div className="p-4 bg-white border-t border-[#EDEAE2] flex justify-end print:hidden">
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-xl bg-[#4A6741] hover:bg-[#3A5233] text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
