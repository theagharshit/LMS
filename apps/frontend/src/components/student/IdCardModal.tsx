import React from 'react';
import { X, Printer, Upload } from 'lucide-react';
import { StudentProfile } from '@lms/shared';

interface IdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentData: StudentProfile;
  onUploadClick?: () => void;
}

export const IdCardModal: React.FC<IdCardModalProps> = ({
  isOpen,
  onClose,
  studentData,
  onUploadClick,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const hasPhoto = Boolean(studentData.idCardPhotoUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden print:shadow-none print:m-0 print:p-0 print:absolute print:inset-0 print:max-w-none print:flex print:items-center print:justify-center print:bg-white">
        <div className="flex items-center justify-between p-4 border-b border-[#EDEAE2] print:hidden">
          <h2 className="font-bold text-[#2D2D2A] font-serif text-lg">Student ID Card</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F9F7F2] text-[#7A7A72] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 flex justify-center items-center bg-[#F9F7F2] min-h-[420px] print:bg-white print:w-full print:h-screen print:min-h-0 print:p-0">
          {hasPhoto ? (
            <img
              src={studentData.idCardPhotoUrl}
              alt={`${studentData.name}'s ID card`}
              className="print-id-card max-w-full max-h-[70vh] w-auto h-auto rounded-xl shadow-md border border-[#EDEAE2] object-contain bg-white print:max-h-none print:max-w-none print:w-auto print:h-auto print:rounded-none print:shadow-none print:border-none"
            />
          ) : (
            <div className="text-center space-y-4 max-w-sm print:hidden">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white border border-[#EDEAE2] flex items-center justify-center">
                <Upload className="w-7 h-7 text-[#7A7A72]" />
              </div>
              <div>
                <p className="font-bold text-[#2D2D2A]">No ID card photo uploaded</p>
                <p className="text-sm text-[#7A7A72] mt-1">
                  Take a clear photo of your student ID card and upload it from your profile.
                </p>
              </div>
              {onUploadClick && (
                <button
                  onClick={onUploadClick}
                  className="px-5 py-2.5 rounded-xl bg-[#4A6741] hover:bg-[#3A5233] text-white font-extrabold text-xs transition-colors cursor-pointer"
                >
                  Upload ID Card Photo
                </button>
              )}
            </div>
          )}
        </div>

        {hasPhoto && (
          <div className="p-4 bg-white border-t border-[#EDEAE2] flex justify-end print:hidden">
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 rounded-xl bg-[#4A6741] hover:bg-[#3A5233] text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
