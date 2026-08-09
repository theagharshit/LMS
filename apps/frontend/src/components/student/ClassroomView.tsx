import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getAvatarUrl } from '../../utils/avatarUtils';
import { Attachment } from '@lms/shared';
import {
  MessageSquare,
  FileText,
  Users,
  Pin,
  Send,
  Paperclip,
  Download,
  Clock,
  BookOpen,
  ArrowLeft,
  Search,
  Plus,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Building,
  CheckCircle2,
  Tag,
} from 'lucide-react';

interface ClassroomViewProps {
  onOpenAssignmentModal: (id: string) => void;
  onOpenQuizModal: (id: string) => void;
}

export const ClassroomView: React.FC<ClassroomViewProps> = ({
  onOpenAssignmentModal,
  onOpenQuizModal,
}) => {
  const {
    selectedClassroomId,
    setSelectedClassroomId,
    classrooms,
    streamPosts,
    addStreamPost,
    addPostComment,
    assignments,
    quizzes,
    modules,
    currentUser,
    studentProfiles,
    joinClassroomByCode,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'stream' | 'classwork' | 'people'>('stream');
  const [newPostText, setNewPostText] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Landing Page Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  // File Attachment Modal State
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachFileName, setAttachFileName] = useState('');
  const [attachFileObj, setAttachFileObj] = useState<File | null>(null);

  // If a classroom is selected, find it
  const currentClassroom = classrooms.find((c) => c.id === selectedClassroomId);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPostText.trim() && !attachFileName) || !currentClassroom) return;

    let attachments: Attachment[] = [];

    if (attachFileObj) {
      let type: 'pdf' | 'video' | 'link' | 'image' | 'doc' = 'doc';
      if (attachFileObj.type.includes('pdf') || attachFileName.toLowerCase().endsWith('.pdf')) {
        type = 'pdf';
      } else if (
        attachFileObj.type.includes('image') ||
        /\.(png|jpe?g|gif|webp|svg)$/i.test(attachFileName)
      ) {
        type = 'image';
      } else if (
        attachFileObj.type.includes('video') ||
        /\.(mp4|webm|mkv)$/i.test(attachFileName)
      ) {
        type = 'video';
      }

      const formattedSize =
        attachFileObj.size > 1024 * 1024
          ? `${(attachFileObj.size / (1024 * 1024)).toFixed(2)} MB`
          : `${(attachFileObj.size / 1024).toFixed(2)} KB`;

      let fileUrl = '';
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: attachFileName || attachFileObj.name,
            sizeBytes: attachFileObj.size,
            sizeFormatted: formattedSize,
            mimeType: attachFileObj.type || 'application/octet-stream',
            uploadedBy: currentUser.name,
            classroomId: currentClassroom.id,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          fileUrl = data.record?.downloadUrl || URL.createObjectURL(attachFileObj);
        } else {
          fileUrl = URL.createObjectURL(attachFileObj);
        }
      } catch (err) {
        fileUrl = URL.createObjectURL(attachFileObj);
      }

      attachments.push({
        id: `att-${Date.now()}`,
        title: attachFileName || attachFileObj.name,
        type,
        url: fileUrl,
        size: formattedSize,
      });
    }

    addStreamPost({
      classroomId: currentClassroom.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.role,
      content: newPostText.trim() || `[Attachment: ${attachFileName}]`,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    setNewPostText('');
    setAttachFileName('');
    setAttachFileObj(null);
  };

  const handleCommentSubmit = (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    addPostComment(postId, text);
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  const handleJoinClassroom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    const success = joinClassroomByCode(joinCodeInput);
    if (success) {
      setJoinCodeInput('');
      setJoinError('');
      setShowJoinModal(false);
    } else {
      setJoinError('Invalid Class Code. Please try code like MATH8A, SCI8A, NEP8A or COMP8A.');
    }
  };

  // Filter classrooms for landing page
  const filteredClassrooms = classrooms.filter((cls) => {
    const matchesSearch =
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject =
      subjectFilter === 'all' || cls.subject.toLowerCase().includes(subjectFilter.toLowerCase());
    return matchesSearch && matchesSubject;
  });

  // =========================================================================
  // SCENARIO 1: LANDING PAGE - ALL ENROLLED SUBJECTS OVERVIEW
  // =========================================================================
  if (!selectedClassroomId || !currentClassroom) {
    return (
      <div className="space-y-6 pb-16 animate-in fade-in duration-200">
        {/* Banner Header */}
        <div className="relative rounded-3xl overflow-hidden natural-banner text-white shadow-md p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold">
              <GraduationCap className="w-4 h-4" />
              <span>Grade 8-A Enrolled Subjects • CDC Nepal Standard</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-serif">
              Enrolled Subjects & Classrooms
            </h1>
            <p className="text-xs md:text-sm text-[#F9F7F2]/90 max-w-2xl">
              Browse all your enrolled subject classrooms. Click on any subject below to access its
              stream announcements, textbook modules, downloadable notes, homework assignments, and
              teacher contacts.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-3 rounded-2xl bg-[#E88D67] hover:bg-[#D87B55] text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Join Subject Code</span>
            </button>
          </div>
        </div>

        {/* Join Code Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#EDEAE2] shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-[#EDEAE2] pb-3">
                <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#4A6741]" />
                  Join New Subject Classroom
                </h3>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="text-xs font-bold text-[#7A7A72] hover:text-[#2D2D2A]"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#7A7A72]">
                Ask your subject teacher for the class code, then enter it below (e.g.,{' '}
                <strong className="text-[#2D2D2A]">MATH8A</strong>,{' '}
                <strong className="text-[#2D2D2A]">SCI8A</strong>,{' '}
                <strong className="text-[#2D2D2A]">NEP8A</strong>).
              </p>

              <form onSubmit={handleJoinClassroom} className="space-y-3">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(e.target.value);
                    setJoinError('');
                  }}
                  placeholder="Enter 6-character Class Code..."
                  className="w-full text-xs bg-[#F9F7F2] p-3 rounded-2xl border border-[#EDEAE2] font-mono uppercase font-bold text-[#2D2D2A] focus:outline-none focus:ring-2 focus:ring-[#4A6741]"
                />
                {joinError && <p className="text-xs text-rose-600 font-bold">{joinError}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A7A72] hover:bg-[#F9F7F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535]"
                  >
                    Join Classroom
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search & Subject Category Filter Bar */}
        <div className="bg-white rounded-3xl p-4 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#7A7A72] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject, teacher or code..."
                className="w-full text-xs pl-10 pr-4 py-2.5 bg-[#F9F7F2] rounded-2xl border border-[#EDEAE2] focus:outline-none focus:ring-1 focus:ring-[#4A6741] text-[#2D2D2A]"
              />
            </div>

            {/* Subject Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {[
                { id: 'all', label: 'All Enrolled Subjects' },
                { id: 'mathematics', label: 'Mathematics' },
                { id: 'science', label: 'Science' },
                { id: 'nepali', label: 'Nepali' },
                { id: 'computer', label: 'Computer' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSubjectFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    subjectFilter === f.id
                      ? 'bg-[#4A6741] text-white shadow-xs'
                      : 'bg-[#F9F7F2] text-[#7A7A72] hover:bg-[#EDEAE2] hover:text-[#2D2D2A]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enrolled Subject Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredClassrooms.length === 0 ? (
            <div className="col-span-2 p-12 text-center bg-white rounded-3xl border border-[#EDEAE2] space-y-2">
              <BookOpen className="w-10 h-10 text-[#7A7A72] mx-auto opacity-50" />
              <h3 className="font-bold text-sm text-[#2D2D2A]">No subject classroom found</h3>
              <p className="text-xs text-[#7A7A72]">
                Try clearing search or join a classroom with a class code.
              </p>
            </div>
          ) : (
            filteredClassrooms.map((cls) => {
              const clsPosts = streamPosts.filter((p) => p.classroomId === cls.id);
              const clsAssignments = assignments.filter((a) => a.classroomId === cls.id);
              const clsQuizzes = quizzes.filter((q) => q.classroomId === cls.id);
              const clsModules = modules.filter((m) => m.classroomId === cls.id);

              return (
                <div
                  key={cls.id}
                  className="bg-white rounded-3xl border border-[#EDEAE2] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#88A070] transition-all overflow-hidden flex flex-col justify-between group"
                >
                  {/* Card Top Header Banner */}
                  <div
                    className={`p-5 bg-gradient-to-r ${cls.colorTheme || 'from-emerald-700 to-teal-800'} text-white relative`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC]">
                        {cls.subject}
                      </span>
                      {currentUser.role === 'teacher' && (
                        <span
                          onClick={() => {
                            navigator.clipboard.writeText(cls.code);
                            setCopiedCode(cls.id);
                            setTimeout(() => setCopiedCode(null), 500);
                          }}
                          title="Copy class code"
                          className="text-[10px] font-mono bg-black/20 text-[#FDEEDC] px-2 py-0.5 rounded-md border border-white/10 cursor-pointer"
                        >
                          {copiedCode === cls.id ? 'Copied!' : `Code: ${cls.code}`}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold font-serif mt-3 tracking-tight group-hover:underline">
                      {cls.name}
                    </h2>

                    <p className="text-xs text-[#F9F7F2]/90 flex items-center gap-2 mt-1">
                      <span>{cls.teacherName}</span>
                      <span>•</span>
                      <span>{cls.roomNumber}</span>
                    </p>
                  </div>

                  {/* Card Body & Resource Counts */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    {/* Quick Stats Pills */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#4A6741]" />
                        <div>
                          <p className="text-[10px] text-[#7A7A72] font-medium">Notes & Modules</p>
                          <p className="font-bold text-[#2D2D2A]">{clsModules.length} Modules</p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#E88D67]" />
                        <div>
                          <p className="text-[10px] text-[#7A7A72] font-medium">Homework Due</p>
                          <p className="font-bold text-[#2D2D2A]">
                            {clsAssignments.length} Assignments
                          </p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <div>
                          <p className="text-[10px] text-[#7A7A72] font-medium">Online Quizzes</p>
                          <p className="font-bold text-[#2D2D2A]">{clsQuizzes.length} Quizzes</p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-[10px] text-[#7A7A72] font-medium">Stream Posts</p>
                          <p className="font-bold text-[#2D2D2A]">{clsPosts.length} Updates</p>
                        </div>
                      </div>
                    </div>

                    {/* Enter Subject CTA Button */}
                    <button
                      onClick={() => setSelectedClassroomId(cls.id)}
                      className="w-full py-3 rounded-2xl bg-[#4A6741] text-white font-extrabold text-xs hover:bg-[#3D5535] transition-all flex items-center justify-center gap-2 shadow-xs group-hover:scale-[1.01] cursor-pointer"
                    >
                      <span>Enter Subject & Notes</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCENARIO 2: SPECIFIC ENROLLED CLASSROOM VIEW (Stream, Classwork, People)
  // =========================================================================
  const classPosts = streamPosts.filter((p) => p.classroomId === currentClassroom.id);
  const classAssignments = assignments.filter((a) => a.classroomId === currentClassroom.id);
  const classQuizzes = quizzes.filter((q) => q.classroomId === currentClassroom.id);
  const classModules = modules.filter((m) => m.classroomId === currentClassroom.id);
  const classStudents = studentProfiles.filter((s) =>
    currentClassroom.enrolledStudentIds?.includes(s.id),
  );

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Navigation & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#EDEAE2] shadow-xs">
        <button
          onClick={() => setSelectedClassroomId(null)}
          className="px-3.5 py-2 rounded-2xl bg-[#F9F7F2] hover:bg-[#EDEAE2] text-[#2D2D2A] font-bold text-xs flex items-center gap-2 border border-[#EDEAE2] transition-all shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#4A6741]" />
          <span>Back to All Enrolled Subjects</span>
        </button>

        {/* Quick Subject Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#7A7A72] font-semibold hidden md:inline">
            Switch Subject:
          </span>
          <select
            value={currentClassroom.id}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            className="text-xs font-bold text-[#2D2D2A] bg-[#F9F7F2] px-3 py-2 rounded-2xl border border-[#EDEAE2] focus:outline-none cursor-pointer"
          >
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.subject})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Classroom Banner Header */}
      <div className="relative rounded-3xl overflow-hidden natural-banner text-white shadow-md p-6 md:p-8 flex flex-col justify-between min-h-[160px]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC]">
                {currentClassroom.subject}
              </span>
              {currentUser.role === 'teacher' && (
                <span
                  onClick={() => {
                    navigator.clipboard.writeText(currentClassroom.code);
                    setCopiedCode(currentClassroom.id);
                    setTimeout(() => setCopiedCode(null), 500);
                  }}
                  title="Copy class code"
                  className="text-[10px] font-mono bg-black/20 text-[#FDEEDC] px-2 py-0.5 rounded-md border border-white/10 cursor-pointer"
                >
                  {copiedCode === currentClassroom.id
                    ? 'Copied!'
                    : `Code: ${currentClassroom.code}`}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif">
              {currentClassroom.name}
            </h1>
            <p className="text-xs md:text-sm text-[#F9F7F2]/90 flex items-center gap-2">
              <span>Teacher: {currentClassroom.teacherName}</span>
              <span>•</span>
              <span>{currentClassroom.roomNumber}</span>
              <span>•</span>
              <span>{currentClassroom.studentCount} Enrolled Students</span>
            </p>
          </div>
        </div>
      </div>

      {/* Classroom Navigation Tabs */}
      <div className="border-b border-[#EDEAE2] flex gap-6 text-xs font-bold text-[#7A7A72]">
        {[
          { id: 'stream', label: 'Stream & Discussion', icon: MessageSquare },
          {
            id: 'classwork',
            label: 'Classwork, Notes & Modules',
            icon: FileText,
          },
          { id: 'people', label: 'Teacher & Classmates', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#4A6741] text-[#4A6741] font-extrabold'
                  : 'border-transparent hover:text-[#2D2D2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: STREAM (Announcements & Discussion) */}
      {activeTab === 'stream' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Upcoming Classwork Widget (Left col) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl p-4 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
              <h3 className="font-bold text-xs text-[#2D2D2A] font-serif flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#E88D67]" />
                Upcoming Due Dates
              </h3>
              {classAssignments.length === 0 ? (
                <p className="text-xs text-[#7A7A72]">No upcoming homework for this subject!</p>
              ) : (
                classAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="text-xs space-y-1 pb-2 border-b border-[#EDEAE2] last:border-0"
                  >
                    <p className="font-semibold text-[#2D2D2A]">{asg.title}</p>
                    <p className="text-[10px] text-[#E88D67] font-bold">
                      Due {asg.dueDate} at {asg.dueTime}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stream Feed (Right 3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Post Creation Box */}
            <form
              onSubmit={handlePostSubmit}
              className="bg-white rounded-3xl p-4 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3"
            >
              <div className="flex gap-3">
                <img
                  src={getAvatarUrl(currentUser.avatar, currentUser.name)}
                  alt={currentUser.name}
                  onError={(e) => {
                    e.currentTarget.src = getAvatarUrl(undefined, currentUser.name);
                  }}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
                <textarea
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder={`Announce something or ask a question in ${currentClassroom.name}...`}
                  rows={2}
                  className="w-full text-xs bg-[#F9F7F2] p-3 rounded-2xl border border-[#E5E1D8] focus:outline-none focus:ring-1 focus:ring-[#4A6741] text-[#2D2D2A] resize-none"
                />
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#EDEAE2]">
                <div className="flex items-center gap-2 text-[#7A7A72]">
                  <button
                    type="button"
                    onClick={() => setShowAttachModal(true)}
                    className="p-1.5 hover:bg-[#F9F7F2] rounded-lg text-xs flex items-center gap-1 text-[#7A7A72] cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attach File</span>
                  </button>
                  {attachFileName && (
                    <span className="text-[10px] text-[#4A6741] font-medium bg-[#EBF1E8] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {attachFileName}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachFileName('');
                          setAttachFileObj(null);
                        }}
                        className="hover:text-red-500 ml-1 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!newPostText.trim() && !attachFileName}
                  className="px-4 py-2 rounded-xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535] disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>Post Announcement</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Stream Posts */}
            <div className="space-y-4">
              {classPosts.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-[#EDEAE2] text-[#7A7A72] space-y-1">
                  <MessageSquare className="w-8 h-8 text-[#7A7A72] mx-auto opacity-50" />
                  <p className="font-bold text-xs">No stream announcements yet</p>
                  <p className="text-[11px]">
                    Be the first to ask a question or start a study discussion!
                  </p>
                </div>
              ) : (
                classPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-3xl p-5 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(post.authorAvatar, post.authorName)}
                          alt={post.authorName}
                          onError={(e) => {
                            e.currentTarget.src = getAvatarUrl(undefined, post.authorName);
                          }}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div>
                          <h4 className="font-bold text-xs text-[#2D2D2A] flex items-center gap-2">
                            {post.authorName}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#EBF1E8] text-[#4A6741] capitalize">
                              {post.authorRole}
                            </span>
                          </h4>
                          <p className="text-[10px] text-[#7A7A72]">
                            {new Date(post.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {post.pinned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#E88D67] bg-[#FDEEDC] px-2 py-0.5 rounded-full">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#2D2D2A] leading-relaxed">{post.content}</p>

                    {/* Attachments */}
                    {post.attachments && post.attachments.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {post.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={att.title}
                            className="p-2.5 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] hover:border-[#88A070] transition-all flex items-center justify-between gap-2 group/att cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate text-xs">
                              <FileText className="w-4 h-4 text-[#4A6741] shrink-0" />
                              <div className="truncate">
                                <p className="font-semibold text-[#2D2D2A] truncate group-hover/att:text-[#4A6741]">
                                  {att.title}
                                </p>
                                {att.size && (
                                  <p className="text-[10px] text-[#7A7A72]">
                                    {att.size} • {att.type.toUpperCase()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Download className="w-3.5 h-3.5 text-[#7A7A72] group-hover/att:text-[#4A6741] shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Comments Section */}
                    <div className="pt-3 border-t border-[#EDEAE2] space-y-3">
                      {post.comments &&
                        post.comments.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-start gap-2.5 text-xs bg-[#F9F7F2] p-2.5 rounded-2xl"
                          >
                            <img
                              src={getAvatarUrl(c.authorAvatar, c.authorName)}
                              alt={c.authorName}
                              onError={(e) => {
                                e.currentTarget.src = getAvatarUrl(undefined, c.authorName);
                              }}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-bold text-[#2D2D2A] text-[11px]">{c.authorName}</p>
                              <p className="text-[#2D2D2A] text-xs mt-0.5">{c.content}</p>
                            </div>
                          </div>
                        ))}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                          placeholder="Add a class comment..."
                          className="flex-1 text-xs bg-[#F9F7F2] px-3.5 py-1.5 rounded-full border border-[#E5E1D8] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                        />
                        <button
                          onClick={() => handleCommentSubmit(post.id)}
                          className="px-3 py-1.5 rounded-full bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535] cursor-pointer"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLASSWORK, NOTES & MODULES */}
      {activeTab === 'classwork' && (
        <div className="space-y-6">
          {/* Modules & PDF Notes Section */}
          <div className="space-y-4">
            <h2 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#4A6741]" />
              Study Modules & Textbook Notes ({classModules.length})
            </h2>

            <div className="space-y-3">
              {classModules.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-3xl border border-[#EDEAE2] text-[#7A7A72]">
                  No study modules uploaded for this subject yet.
                </div>
              ) : (
                classModules.map((mod) => (
                  <div
                    key={mod.id}
                    className="bg-white rounded-3xl p-5 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#4A6741] uppercase tracking-wider">
                          {mod.unitName}
                        </span>
                        <h3 className="font-bold text-sm text-[#2D2D2A] font-serif">{mod.title}</h3>
                      </div>
                      <span className="text-xs text-[#7A7A72]">
                        {mod.durationMinutes} min reading
                      </span>
                    </div>

                    <p className="text-xs text-[#7A7A72]">{mod.description}</p>

                    {mod.attachments && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {mod.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="p-2.5 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] flex items-center gap-2 text-xs"
                          >
                            <FileText className="w-4 h-4 text-[#4A6741]" />
                            <span className="font-semibold text-[#2D2D2A]">{att.title}</span>
                            <Download className="w-3.5 h-3.5 text-[#7A7A72] hover:text-[#4A6741] cursor-pointer" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Assignments & Quizzes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Homework List */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#7A7A72]">
                Homework Assignments ({classAssignments.length})
              </h3>
              {classAssignments.length === 0 ? (
                <div className="p-5 text-center bg-white rounded-3xl border border-[#EDEAE2] text-xs text-[#7A7A72]">
                  No homework assignments listed.
                </div>
              ) : (
                classAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xs text-[#2D2D2A] font-serif">{asg.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FDEEDC] text-[#E88D67]">
                        Due {asg.dueDate}
                      </span>
                    </div>
                    <p className="text-xs text-[#7A7A72] line-clamp-2">{asg.instructions}</p>
                    <button
                      onClick={() => onOpenAssignmentModal(asg.id)}
                      className="w-full mt-2 py-2 rounded-xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535] transition-colors cursor-pointer"
                    >
                      Open Assignment
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quizzes List */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#7A7A72]">
                Quizzes & Tests ({classQuizzes.length})
              </h3>
              {classQuizzes.length === 0 ? (
                <div className="p-5 text-center bg-white rounded-3xl border border-[#EDEAE2] text-xs text-[#7A7A72]">
                  No online quizzes active right now.
                </div>
              ) : (
                classQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xs text-[#2D2D2A] font-serif">{quiz.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FDEEDC] text-[#E88D67]">
                        {quiz.durationMinutes} mins
                      </span>
                    </div>
                    <p className="text-xs text-[#7A7A72]">{quiz.description}</p>
                    <button
                      onClick={() => onOpenQuizModal(quiz.id)}
                      className="w-full mt-2 py-2 rounded-xl bg-[#E88D67] text-white font-bold text-xs hover:bg-[#D87B55] transition-colors cursor-pointer"
                    >
                      Start Online Quiz
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PEOPLE (Teachers & Classmates) */}
      {activeTab === 'people' && (
        <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-6">
          <div>
            <h3 className="font-bold text-sm text-[#4A6741] font-serif uppercase tracking-wider border-b border-[#EDEAE2] pb-2 mb-4">
              Subject Instructor
            </h3>
            <div className="flex items-center gap-3">
              <img
                src={getAvatarUrl(currentClassroom.teacherAvatar, currentClassroom.teacherName)}
                alt={currentClassroom.teacherName}
                onError={(e) => {
                  e.currentTarget.src = getAvatarUrl(undefined, currentClassroom.teacherName);
                }}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#4A6741]"
              />
              <div>
                <h4 className="font-bold text-xs text-[#2D2D2A]">{currentClassroom.teacherName}</h4>
                <p className="text-[11px] text-[#7A7A72]">
                  Faculty • {currentClassroom.subject} ({currentClassroom.roomNumber})
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-sm text-[#4A6741] font-serif uppercase tracking-wider border-b border-[#EDEAE2] pb-2 mb-4">
              Classmates Enrolled ({classStudents.length})
            </h3>
            <div className="space-y-3">
              {classStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#F9F7F2] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={getAvatarUrl(s.avatar, s.name)}
                      alt={s.name}
                      onError={(e) => {
                        e.currentTarget.src = getAvatarUrl(undefined, s.name);
                      }}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-[#2D2D2A]">{s.name}</h4>
                      <p className="text-[10px] text-[#7A7A72]">
                        Roll No. {s.rollNumber} • Section {s.section}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF1E8] text-[#4A6741]">
                    Enrolled Student
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* File Attachment Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#EDEAE2] shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-[#EDEAE2] pb-3">
              <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#4A6741]" />
                Attach File
              </h3>
              <button
                onClick={() => setShowAttachModal(false)}
                className="text-xs font-bold text-[#7A7A72] hover:text-[#2D2D2A] cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-[#7A7A72]">
                Select a file to attach to your classroom stream post.
              </p>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#2D2D2A] uppercase tracking-wider">
                  File Name
                </label>
                <input
                  type="text"
                  placeholder="Enter a descriptive name for the file..."
                  value={attachFileName}
                  onChange={(e) => setAttachFileName(e.target.value)}
                  className="w-full bg-[#F9F7F2] border border-[#E5E1D8] rounded-xl px-3 py-2 text-xs text-[#2D2D2A] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#2D2D2A] uppercase tracking-wider">
                  Select File
                </label>
                <div className="border-2 border-dashed border-[#E5E1D8] bg-[#F9F7F2] rounded-xl p-4 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAttachFileObj(file);
                        if (!attachFileName) setAttachFileName(file.name);
                      }
                    }}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 text-[#7A7A72] hover:text-[#4A6741] transition-colors"
                  >
                    <Download className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold">
                      {attachFileObj ? attachFileObj.name : 'Click to browse files'}
                    </span>
                    {attachFileObj && (
                      <span className="text-[10px] font-medium text-[#7A7A72] bg-[#EBF1E8] px-2 py-0.5 rounded-full mt-1">
                        {attachFileObj.size > 1024 * 1024
                          ? `${(attachFileObj.size / (1024 * 1024)).toFixed(2)} MB`
                          : `${(attachFileObj.size / 1024).toFixed(2)} KB`}
                      </span>
                    )}
                    <span className="text-[10px]">Maximum size: 10MB</span>
                  </label>
                </div>
              </div>

              <button
                onClick={() => setShowAttachModal(false)}
                disabled={!attachFileObj || !attachFileName}
                className="w-full py-2.5 bg-[#4A6741] text-white text-xs font-bold rounded-xl hover:bg-[#3D5535] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Confirm Attachment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
