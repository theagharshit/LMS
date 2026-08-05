import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar as CalendarIcon,
  Clock,
  Tag,
  Sparkles,
  Award,
  Sun,
  BookOpen,
  Users,
  ChevronRight,
  Info,
  BellRing,
  CalendarCheck,
} from 'lucide-react';
import { CalendarEvent } from '../../types';

export const AcademicCalendarView: React.FC = () => {
  const { calendarEvents } = useApp();
  const [filterType, setFilterType] = useState<string>('all');
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Sort events chronologically
  const sortedEvents = [...calendarEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const filteredEvents = sortedEvents.filter(
    (e) =>
      filterType === 'all' ||
      e.type === filterType ||
      (filterType === 'assignment' && e.type === 'quiz') ||
      (filterType === 'event' && e.type === 'live_class'),
  );

  // Calculate days remaining helper
  const getDaysRemaining = (eventDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(eventDateStr);
    eventDate.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: 'Today', color: 'bg-emerald-600 text-white animate-pulse' };
    if (diffDays === 1) return { label: 'Tomorrow', color: 'bg-amber-600 text-white' };
    if (diffDays > 1) return { label: `In ${diffDays} days`, color: 'bg-[#EBF1E8] text-[#4A6741]' };
    return { label: 'Past Event', color: 'bg-gray-200 text-gray-600' };
  };

  // Icon & theme styling per event type
  const getEventStyle = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'exam':
        return {
          icon: Award,
          bgColor: 'bg-rose-500',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
          label: 'Exam / Evaluation',
        };
      case 'holiday':
        return {
          icon: Sun,
          bgColor: 'bg-amber-500',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          label: 'Public Holiday',
        };
      case 'live_class':
        return {
          icon: Sparkles,
          bgColor: 'bg-emerald-600',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          label: 'School Activity',
        };
      case 'parent_meeting':
        return {
          icon: Users,
          bgColor: 'bg-purple-600',
          badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
          label: 'Parent Meeting',
        };
      case 'quiz':
      case 'assignment':
      default:
        return {
          icon: BookOpen,
          bgColor: 'bg-blue-600',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Homework & Quiz',
        };
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Visual Header Banner */}
      <div className="natural-banner rounded-3xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Bikram Sambat 2083 / 2026 Academic Calendar</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-serif">Academic Timeline</h1>
          <p className="text-xs md:text-sm text-[#F9F7F2]/90">
            Hover or tap any event point on the timeline to expand full descriptions, subjects, and
            schedules.
          </p>
        </div>

        {/* Counter Pills */}
        <div className="relative z-10 flex flex-wrap gap-2 text-xs font-bold">
          <div className="bg-white/15 backdrop-blur-md border border-white/20 px-3 py-2 rounded-2xl flex items-center gap-2">
            <Award className="w-4 h-4 text-rose-300" />
            <span>{calendarEvents.filter((e) => e.type === 'exam').length} Exams</span>
          </div>
          <div className="bg-white/15 backdrop-blur-md border border-white/20 px-3 py-2 rounded-2xl flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-300" />
            <span>{calendarEvents.filter((e) => e.type === 'holiday').length} Holidays</span>
          </div>
          <div className="bg-white/15 backdrop-blur-md border border-white/20 px-3 py-2 rounded-2xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>{calendarEvents.length} Total Events</span>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All Events' },
          { id: 'exam', label: 'Exams & Tests' },
          { id: 'holiday', label: 'Holidays & Vacations' },
          { id: 'event', label: 'School Events' },
          { id: 'assignment', label: 'Homework & Quizzes' },
          { id: 'parent_meeting', label: 'Parent Meetings' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id)}
            className={`px-4 py-2 rounded-2xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === f.id
                ? 'bg-[#4A6741] text-white shadow-sm ring-2 ring-[#4A6741]/30'
                : 'bg-white text-[#7A7A72] border border-[#EDEAE2] hover:bg-[#F9F7F2]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline Section */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-6 relative">
        <div className="flex items-center justify-between border-b border-[#EDEAE2] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#2D2D2A] font-serif flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#4A6741]" />
              Chronological Academic Timeline
            </h2>
            <p className="text-xs text-[#7A7A72] mt-0.5">
              Hover over or click a point on the line to reveal full details
            </p>
          </div>
          <span className="text-xs font-bold text-[#4A6741] bg-[#EBF1E8] px-3 py-1 rounded-full border border-[#88A070]/30">
            {filteredEvents.length} Items Listed
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center bg-[#F9F7F2] rounded-2xl border border-[#EDEAE2] text-[#7A7A72]">
            <Info className="w-8 h-8 text-[#7A7A72] mx-auto mb-2" />
            <p className="font-bold text-sm">No events match the selected filter.</p>
            <p className="text-xs">Select "All Events" to view full schedule.</p>
          </div>
        ) : (
          <div className="relative pl-6 md:pl-10 space-y-8 my-4">
            {/* The Connecting Vertical Timeline Line */}
            <div className="absolute left-[19px] md:left-[35px] top-3 bottom-3 w-1 bg-gradient-to-b from-[#4A6741] via-[#88A070] to-[#EDEAE2] rounded-full z-0" />

            {filteredEvents.map((evt) => {
              const style = getEventStyle(evt.type);
              const EventIcon = style.icon;
              const daysInfo = getDaysRemaining(evt.date);
              const isHovered = hoveredEventId === evt.id;
              const isSelected = selectedEventId === evt.id;
              const isExpanded = isHovered || isSelected;

              const dateObj = new Date(evt.date);
              const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
              const dayNum = dateObj.getDate();
              const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <div
                  key={evt.id}
                  className="relative group cursor-pointer z-10 transition-all"
                  onMouseEnter={() => setHoveredEventId(evt.id)}
                  onMouseLeave={() => setHoveredEventId(null)}
                  onClick={() => setSelectedEventId(isSelected ? null : evt.id)}
                >
                  {/* Timeline Point (Node) */}
                  <div
                    className={`absolute -left-[30px] md:-left-[46px] top-1.5 w-8 h-8 md:w-10 md:h-10 rounded-full ${style.bgColor} text-white flex items-center justify-center shadow-md ring-4 ring-white border-2 border-white transition-transform duration-200 z-20 ${
                      isExpanded ? 'scale-125 ring-[#4A6741]/40' : 'group-hover:scale-110'
                    }`}
                  >
                    <EventIcon className="w-4 h-4 md:w-5 md:h-5" />
                  </div>

                  {/* Main Event Card / Expandable Node Container */}
                  <div
                    className={`ml-3 md:ml-4 p-4 md:p-5 rounded-2xl border transition-all duration-200 ${
                      isExpanded
                        ? 'bg-white border-[#4A6741] shadow-lg ring-1 ring-[#4A6741]/30 translate-x-1'
                        : 'bg-[#F9F7F2] border-[#EDEAE2] hover:bg-white hover:border-[#88A070] hover:shadow-md'
                    }`}
                  >
                    {/* Compact Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* Left: Date pill & Title */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl text-center min-w-[55px] border ${
                            isExpanded
                              ? 'bg-[#EBF1E8] border-[#88A070] text-[#4A6741]'
                              : 'bg-white border-[#EDEAE2] text-[#2D2D2A]'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold text-[#7A7A72] block leading-none">
                            {weekdayStr}, {monthStr}
                          </span>
                          <span className="text-base font-black leading-tight">{dayNum}</span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${style.badgeBg}`}
                            >
                              {style.label}
                            </span>
                            {evt.nepaliDateBS && (
                              <span className="text-[10px] font-bold text-[#7A7A72] bg-white border border-[#EDEAE2] px-2 py-0.5 rounded-md">
                                🇳🇵 {evt.nepaliDateBS}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-sm text-[#2D2D2A] font-serif mt-1 group-hover:text-[#4A6741] transition-colors">
                            {evt.title}
                          </h3>
                        </div>
                      </div>

                      {/* Right: Days remaining chip & Expand Indicator */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${daysInfo.color}`}
                        >
                          {daysInfo.label}
                        </span>
                        <div
                          className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                            isExpanded
                              ? 'bg-[#4A6741] text-white'
                              : 'text-[#7A7A72] bg-white border border-[#EDEAE2]'
                          }`}
                        >
                          <span>{isExpanded ? 'Details' : 'Hover to Expand'}</span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expandable Rich Detail Content */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        isExpanded
                          ? 'max-h-96 opacity-100 mt-4 pt-4 border-t border-[#EDEAE2]'
                          : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="space-y-3 text-xs text-[#2D2D2A]">
                        {/* Description */}
                        <div className="p-3 rounded-xl bg-[#F9F7F2] border border-[#EDEAE2] leading-relaxed">
                          <p className="font-semibold text-[#2D2D2A]">{evt.description}</p>
                        </div>

                        {/* Meta information grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#7A7A72]">
                          {evt.time && (
                            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-[#EDEAE2]">
                              <Clock className="w-3.5 h-3.5 text-[#4A6741]" />
                              <span>
                                Time: <strong className="text-[#2D2D2A]">{evt.time}</strong>
                              </span>
                            </div>
                          )}

                          {evt.subject && (
                            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-[#EDEAE2]">
                              <Tag className="w-3.5 h-3.5 text-[#E88D67]" />
                              <span>
                                Subject: <strong className="text-[#2D2D2A]">{evt.subject}</strong>
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-[#EDEAE2]">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            <span>
                              Target:{' '}
                              <strong className="text-[#2D2D2A]">Grade 8 & Schoolwide</strong>
                            </span>
                          </div>
                        </div>

                        {/* Event Footnote / Action button */}
                        <div className="flex items-center justify-between pt-1 text-[11px] text-[#7A7A72]">
                          <span className="flex items-center gap-1 text-[#4A6741] font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            Official Nepal CDC Standard Schedule
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`Reminder set for: ${evt.title}`);
                            }}
                            className="px-3 py-1 rounded-xl bg-[#4A6741] hover:bg-[#3D5535] text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <BellRing className="w-3 h-3" />
                            <span>Set Reminder</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
