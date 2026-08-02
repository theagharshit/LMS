import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserCheck, CheckCircle2, XCircle, Clock, AlertCircle, Send, Bell } from 'lucide-react';

export const AttendanceRegister: React.FC = () => {
  const { studentProfiles, attendanceRecords, markAttendance, currentUser } = useApp();

  const [selectedDate, setSelectedDate] = useState('2026-07-31');
  const [selectedClassSection, setSelectedClassSection] = useState('Grade 8 - Sec A');
  const [remarksInput, setRemarksInput] = useState<Record<string, string>>({});
  const [alertSentStatus, setAlertSentStatus] = useState<Record<string, boolean>>({});

  const handleStatusChange = (
    studentId: string,
    studentName: string,
    status: 'present' | 'absent' | 'late' | 'excused'
  ) => {
    markAttendance(studentId, studentName, selectedDate, status, remarksInput[studentId] || '');
  };

  const handleSendParentAlert = (studentName: string, parentPhone: string, studentId: string) => {
    setAlertSentStatus(prev => ({ ...prev, [studentId]: true }));
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="natural-banner rounded-3xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold mb-2">
            <span>Mount Everest Sec. School Attendance Register</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-serif">Daily Student Attendance Register</h1>
          <p className="text-xs md:text-sm text-[#F9F7F2]/90 mt-1">Mark daily attendance and notify parents automatically</p>
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Roster Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-[#2D2D2A] font-serif flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#4A6741]" />
              Class Roster ({selectedClassSection})
            </h2>
            <p className="text-xs text-[#7A7A72]">Date: {selectedDate}</p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-3 py-1 rounded-full bg-[#EBF1E8] text-[#4A6741]">
              3 Present
            </span>
            <span className="px-3 py-1 rounded-full bg-[#FDEEDC] text-[#E88D67]">
              1 Absent
            </span>
          </div>
        </div>

        {/* Student Attendance List */}
        <div className="space-y-3">
          {studentProfiles.map((student) => {
            const currentRecord = attendanceRecords.find(a => a.studentId === student.id && a.date === selectedDate);
            const status = currentRecord?.status || (student.id === 'user-stu-4' ? 'absent' : 'present');

            return (
              <div
                key={student.id}
                className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  <div>
                    <h3 className="font-bold text-xs text-[#2D2D2A] flex items-center gap-2">
                      {student.name}
                      <span className="text-[10px] text-[#7A7A72] font-normal">Roll #{student.rollNumber}</span>
                    </h3>
                    <p className="text-[11px] text-[#7A7A72]">
                      Parent: {student.parentName} ({student.parentPhone})
                    </p>
                  </div>
                </div>

                {/* Status Toggles */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'present', label: 'Present', color: 'bg-[#4A6741] text-white' },
                    { id: 'absent', label: 'Absent', color: 'bg-[#E88D67] text-white' },
                    { id: 'late', label: 'Late', color: 'bg-[#E88D67] text-white' },
                    { id: 'excused', label: 'Leave', color: 'bg-[#88A070] text-white' }
                  ].map((btn) => {
                    const isSel = status === btn.id;
                    return (
                      <button
                        key={btn.id}
                        onClick={() => handleStatusChange(student.id, student.name, btn.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSel
                            ? `${btn.color} shadow-xs scale-105`
                            : 'bg-white text-[#7A7A72] border border-[#E5E1D8]'
                        }`}
                      >
                        {btn.label}
                      </button>
                    );
                  })}

                  {/* Send Alert if Absent */}
                  {status === 'absent' && (
                    <button
                      onClick={() => handleSendParentAlert(student.name, student.parentPhone, student.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                        alertSentStatus[student.id]
                          ? 'bg-[#EBF1E8] text-[#4A6741]'
                          : 'bg-[#FDEEDC] text-[#E88D67] hover:bg-[#FDEEDC]/80'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{alertSentStatus[student.id] ? 'Parent SMS Sent ✓' : 'Notify Parent'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
