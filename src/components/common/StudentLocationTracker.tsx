import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentLocationRecord, LocationStatusCategory } from '../../types';
import { MapPin, Bus, Utensils, BookOpen, Clock, ShieldCheck, Edit3, X, Check, Activity, Award } from 'lucide-react';

interface StudentLocationTrackerProps {
  studentId: string;
  studentName: string;
  showUpdateButton?: boolean;
}

export const StudentLocationTracker: React.FC<StudentLocationTrackerProps> = ({
  studentId,
  studentName,
  showUpdateButton = true
}) => {
  const { currentUser, studentLocations, updateStudentLocation } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const locationRecord = studentLocations.find(l => l.studentId === studentId) || {
    id: 'default',
    studentId,
    studentName,
    currentLocation: 'In Class (Grade 8-A Room 204)',
    category: 'in_class' as LocationStatusCategory,
    updatedBy: 'School Timetable System',
    updatedByRole: 'admin' as const,
    updatedAt: new Date().toISOString()
  };

  const isTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin';

  // Modal Form State
  const [locationText, setLocationText] = useState(locationRecord.currentLocation);
  const [category, setCategory] = useState<LocationStatusCategory>(locationRecord.category);
  const [busNumber, setBusNumber] = useState(locationRecord.busNumber || 'Bus #4');
  const [notes, setNotes] = useState(locationRecord.notes || '');

  const getLocationIcon = (cat: LocationStatusCategory) => {
    switch (cat) {
      case 'canteen_lunch':
        return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'en_route_bus':
        return <Bus className="w-4 h-4 text-sky-500" />;
      case 'library':
        return <BookOpen className="w-4 h-4 text-purple-500" />;
      case 'sports_ground':
        return <Activity className="w-4 h-4 text-emerald-500" />;
      default:
        return <MapPin className="w-4 h-4 text-[#4A6741]" />;
    }
  };

  const getCategoryBadgeColor = (cat: LocationStatusCategory) => {
    switch (cat) {
      case 'canteen_lunch':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'en_route_bus':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'library':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'sports_ground':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-[#EBF1E8] text-[#4A6741] border-[#88A070]/30';
    }
  };

  const handleApplyPreset = (presetText: string, presetCat: LocationStatusCategory, defaultBus?: string) => {
    setLocationText(presetText);
    setCategory(presetCat);
    if (defaultBus) setBusNumber(defaultBus);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudentLocation(
      studentId,
      studentName,
      locationText,
      category,
      currentUser.name,
      currentUser.role === 'admin' ? 'admin' : 'teacher',
      category === 'en_route_bus' ? busNumber : undefined,
      notes
    );
    setIsModalOpen(false);
  };

  const formattedTime = new Date(locationRecord.updatedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="rounded-2xl bg-white border border-[#EDEAE2] p-3.5 shadow-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#F9F7F2]">
            {getLocationIcon(locationRecord.category)}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A72]">
              Where is Student? • Live Tracker
            </p>
            <p className="text-xs font-bold text-[#2D2D2A]">
              {locationRecord.currentLocation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeColor(locationRecord.category)}`}>
            ● Live
          </span>
          {isTeacherOrAdmin && showUpdateButton && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 rounded-lg text-[#7A7A72] hover:text-[#2D2D2A] hover:bg-[#F0EDE5] transition-colors cursor-pointer"
              title="Update Student Location"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="text-[10px] text-[#7A7A72] flex items-center justify-between border-t border-[#EDEAE2] pt-2">
        <span>Updated by: <strong className="text-[#2D2D2A]">{locationRecord.updatedBy}</strong></span>
        <span>Time: <strong className="text-[#2D2D2A]">{formattedTime}</strong></span>
      </div>

      {/* Location Update Modal for Teacher & Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#EDEAE2] p-5 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-[#EDEAE2] pb-3">
              <div className="flex items-center gap-2 text-[#4A6741] font-bold font-serif text-sm">
                <MapPin className="w-4 h-4 text-[#4A6741]" />
                <span>Update Real-Time Location: {studentName}</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-[#7A7A72] hover:text-[#2D2D2A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <p className="text-[11px] font-bold text-[#7A7A72] mb-1.5">Quick Location Presets:</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('In Math Class (Room 204)', 'in_class')}
                  className="px-2.5 py-1 rounded-xl bg-[#EBF1E8] text-[#4A6741] font-semibold hover:bg-[#88A070]/20 cursor-pointer"
                >
                  🏫 In Class
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('School Canteen (Lunch Time)', 'canteen_lunch')}
                  className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 cursor-pointer"
                >
                  🍱 Lunch Time
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Boarded School Bus #4 (En Route Home)', 'en_route_bus', 'Bus #4')}
                  className="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-700 font-semibold hover:bg-sky-100 cursor-pointer"
                >
                  🚌 Boarded Bus
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('School Library Study Session', 'library')}
                  className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 font-semibold hover:bg-purple-100 cursor-pointer"
                >
                  📚 Library
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveLocation} className="space-y-3 pt-1">
              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Current Location Description:</label>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  placeholder="e.g. In Science Lab 201..."
                  required
                />
              </div>

              {category === 'en_route_bus' && (
                <div>
                  <label className="block font-semibold text-[#2D2D2A] mb-1">Bus Number:</label>
                  <input
                    type="text"
                    value={busNumber}
                    onChange={(e) => setBusNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                    placeholder="e.g. Bus #4"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Teacher / Staff Notes (Optional):</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  placeholder="e.g. Boarded at 03:45 PM with driver Hari..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F0EDE5] text-[#2D2D2A] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3D5535] transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Location</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
