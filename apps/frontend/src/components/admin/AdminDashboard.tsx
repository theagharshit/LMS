import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentProfile, User, BadgeDefinition } from '@lms/shared';
import { AdminStudentModal } from './AdminStudentModal';
import { AdminTeacherModal } from './AdminTeacherModal';
import { AdminParentLinkModal } from './AdminParentLinkModal';
import {
  ShieldAlert,
  Users,
  GraduationCap,
  Briefcase,
  BookOpen,
  Award,
  Megaphone,
  History,
  Plus,
  Search,
  Edit,
  Trash2,
  Link as LinkIcon,
  Download,
  CheckCircle,
  TrendingUp,
  Sparkles,
  Filter,
  Clock,
  Layers,
  PlusCircle,
  BarChart2,
  FileSpreadsheet,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    allUsers,
    studentProfiles,
    badgeDefinitions,
    classrooms,
    assignBadge,
    currentUser,
    adminAuditLogs,
    schoolAnnouncements,
    addStudentProfile,
    updateStudentProfile,
    deleteStudentProfile,
    addTeacherProfile,
    updateTeacherProfile,
    deleteTeacherProfile,
    addParentProfile,
    updateParentChildren,
    deleteParentProfile,
    addBadgeDefinition,
    deleteBadgeDefinition,
    addClassroom,
    deleteClassroom,
    addAnnouncement,
    deleteAnnouncement,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'students' | 'parents' | 'teachers' | 'classrooms' | 'badges' | 'broadcast'
  >('overview');

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);

  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);

  const [isParentLinkModalOpen, setIsParentLinkModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<User | null>(null);

  // Filters & Inputs
  const [studentSearch, setStudentSearch] = useState('');
  const [studentGradeFilter, setStudentGradeFilter] = useState<string>('all');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [parentSearch, setParentSearch] = useState('');

  // Manual Badge State
  const [badgeStudentId, setBadgeStudentId] = useState('');
  const [badgeDefId, setBadgeDefId] = useState('');
  const [badgeRemarks, setBadgeRemarks] = useState('');
  const [isAssigningBadge, setIsAssigningBadge] = useState(false);

  // New Badge Creator Form State
  const [newBadgeTitle, setNewBadgeTitle] = useState('');
  const [newBadgeIcon, setNewBadgeIcon] = useState('🌟');
  const [newBadgeDesc, setNewBadgeDesc] = useState('');
  const [newBadgeCategory, setNewBadgeCategory] = useState('academic');
  const [newBadgeIsAuto, setNewBadgeIsAuto] = useState(false);

  // New Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'urgent' | 'high' | 'normal'>('normal');
  const [annAudience, setAnnAudience] = useState<'all' | 'students' | 'teachers' | 'parents'>('all');

  // New Classroom Form State
  const [clsName, setClsName] = useState('');
  const [clsSubject, setClsSubject] = useState('Mathematics');
  const [clsGrade, setClsGrade] = useState(8);
  const [clsSection, setClsSection] = useState('A');
  const [clsTeacherId, setClsTeacherId] = useState('');
  const [clsRoom, setClsRoom] = useState('Room 101');

  // Categories & Metrics
  const teacherUsers = allUsers.filter((u) => u.role === 'teacher');
  const parentUsers = allUsers.filter((u) => u.role === 'parent');

  const filteredStudents = studentProfiles.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.section.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesGrade =
      studentGradeFilter === 'all' || s.gradeLevel === Number(studentGradeFilter);
    return matchesSearch && matchesGrade;
  });

  const filteredTeachers = teacherUsers.filter(
    (t) =>
      t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.email.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      (t.subjectsTaught && t.subjectsTaught.some((sub) => sub.toLowerCase().includes(teacherSearch.toLowerCase()))),
  );

  const filteredParents = parentUsers.filter(
    (p) =>
      p.name.toLowerCase().includes(parentSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(parentSearch.toLowerCase()),
  );

  // Export handlers
  const exportCSV = (filename: string, rows: string[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportStudents = () => {
    const headers = ['ID', 'Name', 'Email', 'Grade', 'Section', 'RollNo', 'Attendance%'];
    const rows = studentProfiles.map((s) => [
      s.id,
      `"${s.name}"`,
      s.email,
      String(s.gradeLevel),
      s.section,
      String(s.rollNumber || ''),
      String(s.attendancePercentage),
    ]);
    exportCSV('Student_Roster_Export.csv', [headers, ...rows]);
  };

  const handleExportTeachers = () => {
    const headers = ['ID', 'Name', 'Email', 'SubjectsTaught'];
    const rows = teacherUsers.map((t) => [
      t.id,
      `"${t.name}"`,
      t.email,
      `"${(t.subjectsTaught || []).join('; ')}"`,
    ]);
    exportCSV('Faculty_Staff_Export.csv', [headers, ...rows]);
  };

  const handleExportAuditLogs = () => {
    const headers = ['ID', 'Action', 'Category', 'PerformedBy', 'Details', 'Timestamp'];
    const rows = adminAuditLogs.map((l) => [
      l.id,
      `"${l.action}"`,
      l.category,
      `"${l.performedBy}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      l.timestamp,
    ]);
    exportCSV('Admin_Audit_Logs.csv', [headers, ...rows]);
  };

  const handleAssignBadgeSubmit = async () => {
    if (!badgeStudentId || !badgeDefId) return;
    setIsAssigningBadge(true);
    await assignBadge(badgeStudentId, badgeDefId, badgeRemarks);
    setBadgeRemarks('');
    setBadgeStudentId('');
    setBadgeDefId('');
    setIsAssigningBadge(false);
    alert('Badge manually awarded successfully!');
  };

  const handleCreateBadgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBadgeTitle.trim()) return;
    addBadgeDefinition({
      title: newBadgeTitle.trim(),
      icon: newBadgeIcon.trim() || '🌟',
      description: newBadgeDesc.trim() || 'Awarded by School Administration',
      category: newBadgeCategory,
      isAutomatic: newBadgeIsAuto,
    });
    setNewBadgeTitle('');
    setNewBadgeDesc('');
    alert('New custom badge definition created!');
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    addAnnouncement({
      title: annTitle.trim(),
      content: annContent.trim(),
      priority: annPriority,
      author: currentUser.name,
      targetAudience: annAudience,
    });
    setAnnTitle('');
    setAnnContent('');
    alert('Broadcast announcement posted successfully!');
  };

  const handleCreateClassroomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clsName.trim()) return;
    const teacherObj = teacherUsers.find((t) => t.id === clsTeacherId) || teacherUsers[0];
    addClassroom({
      name: clsName.trim(),
      subject: clsSubject,
      gradeLevel: Number(clsGrade),
      section: clsSection.toUpperCase(),
      teacherId: teacherObj ? teacherObj.id : 'user-teach-1',
      teacherName: teacherObj ? teacherObj.name : 'Dr. Ramesh Thapa',
      teacherAvatar:
        teacherObj?.avatar ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      roomNumber: clsRoom,
      colorTheme: '#4A6741',
      bannerImage:
        'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
    });
    setClsName('');
    alert('New classroom created successfully!');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="natural-banner rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>School Principal & Administrative Governance Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif">
            Administrative Management Hub
          </h1>
          <p className="text-xs text-[#F9F7F2]/90 mt-1">
            Complete institutional control over students, faculty, family allocations, classrooms, and badge awards.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setEditingStudent(null);
              setIsStudentModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-white text-[#4A6741] font-bold text-xs hover:bg-[#F9F7F2] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll Student</span>
          </button>
          <button
            onClick={() => {
              setEditingTeacher(null);
              setIsTeacherModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-[#EDEAE2] flex gap-2 overflow-x-auto text-xs font-bold bg-white p-2 rounded-2xl shadow-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#4A6741] text-white shadow-sm'
              : 'text-[#7A7A72] hover:bg-[#F9F7F2]'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Overview & Stats</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'students'
              ? 'bg-[#4A6741] text-white shadow-sm'
              : 'text-[#7A7A72] hover:bg-[#F9F7F2]'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student Directory ({studentProfiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('parents')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'parents'
              ? 'bg-[#4A6741] text-white shadow-sm'
              : 'text-[#7A7A72] hover:bg-[#F9F7F2]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Family & Parents ({parentUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-[#4A6741] text-white shadow-sm'
              : 'text-[#7A7A72] hover:bg-[#F9F7F2]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Faculty Staff ({teacherUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('classrooms')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'classrooms'
              ? 'bg-[#4A6741] text-white shadow-sm'
              : 'text-[#7A7A72] hover:bg-[#F9F7F2]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Classrooms ({classrooms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'badges'
              ? 'bg-[#4A6741] text-white shadow-sm'
              : 'text-[#7A7A72] hover:bg-[#F9F7F2]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Badges & Awards</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'broadcast'
              ? 'bg-[#4A6741] text-white shadow-sm'
              : 'text-[#7A7A72] hover:bg-[#F9F7F2]'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Broadcast & CSV</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & STATS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-xs flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#EBF1E8] text-[#4A6741]">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-[#7A7A72] font-semibold">Total Students</p>
                <h3 className="text-xl font-bold text-[#2D2D2A] font-serif">{studentProfiles.length}</h3>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-xs flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#FDEEDC] text-[#E88D67]">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-[#7A7A72] font-semibold">Faculty Members</p>
                <h3 className="text-xl font-bold text-[#2D2D2A] font-serif">{teacherUsers.length}</h3>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-xs flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#EBF1E8] text-[#4A6741]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-[#7A7A72] font-semibold">Parents Linked</p>
                <h3 className="text-xl font-bold text-[#2D2D2A] font-serif">{parentUsers.length}</h3>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-xs flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#FDEEDC] text-[#E88D67]">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-[#7A7A72] font-semibold">Active Classes</p>
                <h3 className="text-xl font-bold text-[#2D2D2A] font-serif">{classrooms.length}</h3>
              </div>
            </div>
          </div>

          {/* Quick Actions & Audit Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Administrative Actions Panel */}
            <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4A6741]" />
                <span>Quick Actions</span>
              </h3>
              <div className="space-y-2 text-xs">
                <button
                  onClick={() => {
                    setEditingStudent(null);
                    setIsStudentModalOpen(true);
                  }}
                  className="w-full p-3 rounded-2xl bg-[#F9F7F2] hover:bg-[#F0EDE5] border border-[#EDEAE2] text-[#2D2D2A] font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#4A6741]" />
                    Enroll New Student
                  </span>
                  <Plus className="w-4 h-4 text-[#7A7A72]" />
                </button>

                <button
                  onClick={() => {
                    setEditingTeacher(null);
                    setIsTeacherModalOpen(true);
                  }}
                  className="w-full p-3 rounded-2xl bg-[#F9F7F2] hover:bg-[#F0EDE5] border border-[#EDEAE2] text-[#2D2D2A] font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#E88D67]" />
                    Register New Faculty
                  </span>
                  <Plus className="w-4 h-4 text-[#7A7A72]" />
                </button>

                <button
                  onClick={() => setActiveTab('broadcast')}
                  className="w-full p-3 rounded-2xl bg-[#F9F7F2] hover:bg-[#F0EDE5] border border-[#EDEAE2] text-[#2D2D2A] font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#4A6741]" />
                    Broadcast School Notice
                  </span>
                  <Plus className="w-4 h-4 text-[#7A7A72]" />
                </button>

                <button
                  onClick={handleExportStudents}
                  className="w-full p-3 rounded-2xl bg-[#F9F7F2] hover:bg-[#F0EDE5] border border-[#EDEAE2] text-[#2D2D2A] font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#E88D67]" />
                    Export Roster to CSV
                  </span>
                  <Download className="w-4 h-4 text-[#7A7A72]" />
                </button>
              </div>
            </div>

            {/* Audit Logs Feed */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
                  <History className="w-4 h-4 text-[#4A6741]" />
                  <span>Administrative Audit Logs & Action Trail</span>
                </h3>
                <button
                  onClick={handleExportAuditLogs}
                  className="text-xs font-bold text-[#4A6741] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Logs</span>
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
                {adminAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#2D2D2A]">{log.action}</span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#EBF1E8] text-[#4A6741]">
                          {log.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7A7A72] mt-0.5">{log.details}</p>
                      <p className="text-[10px] text-[#7A7A72] opacity-80 mt-1">
                        By {log.performedBy}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-[#7A7A72] shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT DIRECTORY & MANAGEMENT */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-[#2D2D2A] font-serif">
                Student Directory & Enrolled Records
              </h3>
              <p className="text-xs text-[#7A7A72]">
                Manage student profiles, section assignments, roll numbers, and parent details.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingStudent(null);
                setIsStudentModalOpen(true);
              }}
              className="px-4 py-2 rounded-2xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll New Student</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-[#F9F7F2] p-3 rounded-2xl border border-[#EDEAE2]">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A72]" />
              <input
                type="text"
                placeholder="Search students by name, email, or section..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-[#EDEAE2] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#7A7A72]" />
              <select
                value={studentGradeFilter}
                onChange={(e) => setStudentGradeFilter(e.target.value)}
                className="px-3 py-2 bg-white rounded-xl border border-[#EDEAE2] text-xs font-semibold text-[#2D2D2A] focus:outline-none"
              >
                <option value="all">All Grades</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Grid / List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EBF1E8] text-[#4A6741]">
                      Grade {s.gradeLevel}-{s.section}
                    </span>
                    <span className="text-[10px] text-[#7A7A72] font-semibold">
                      Roll #{s.rollNumber || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={s.avatar}
                      alt={s.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
                    />
                    <div>
                      <h4 className="font-bold text-[#2D2D2A] text-sm font-serif">{s.name}</h4>
                      <p className="text-[11px] text-[#7A7A72]">{s.email}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-[#EDEAE2] space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#7A7A72]">Attendance Rate:</span>
                      <span className="font-bold text-[#4A6741]">{s.attendancePercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7A7A72]">Parent/Guardian:</span>
                      <span className="font-bold text-[#2D2D2A]">{s.parentName || 'Linked'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EDEAE2] flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingStudent(s);
                      setIsStudentModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#EDEAE2] hover:bg-[#F0EDE5] font-bold text-[11px] text-[#2D2D2A] flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#4A6741]" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to archive student record for ${s.name}?`)) {
                        deleteStudentProfile(s.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#EDEAE2] hover:bg-[#FFF3EB] font-bold text-[11px] text-[#E88D67] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Archive</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PARENTS & FAMILY LINKER */}
      {activeTab === 'parents' && (
        <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-[#2D2D2A] font-serif">
                Parent Accounts & Family Allocator
              </h3>
              <p className="text-xs text-[#7A7A72]">
                Configure how many children each parent has studying and link student IDs directly.
              </p>
            </div>

            <button
              onClick={() => {
                const pName = prompt('Enter Parent Full Name:');
                const pEmail = prompt('Enter Parent Email:');
                if (pName && pEmail) {
                  addParentProfile({
                    name: pName,
                    email: pEmail,
                    role: 'parent',
                    schoolName: 'Everest International Academy',
                    avatar:
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
                  });
                }
              }}
              className="px-4 py-2 rounded-2xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Parent Account</span>
            </button>
          </div>

          {/* Parent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {filteredParents.map((p) => {
              const children = studentProfiles.filter((s) => p.childrenIds?.includes(s.id));
              return (
                <div
                  key={p.id}
                  className="p-5 rounded-3xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white"
                        />
                        <div>
                          <h4 className="font-bold text-[#2D2D2A] text-sm font-serif">{p.name}</h4>
                          <p className="text-[11px] text-[#7A7A72]">{p.email}</p>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full bg-[#FDEEDC] text-[#E88D67] font-extrabold text-xs">
                        {p.childrenIds?.length || 0} Children Studying
                      </span>
                    </div>

                    {/* Linked Children List */}
                    <div className="space-y-2">
                      <p className="font-bold text-[#2D2D2A] text-[11px]">Linked Enrolled Children:</p>
                      {children.length > 0 ? (
                        <div className="space-y-1.5">
                          {children.map((child) => (
                            <div
                              key={child.id}
                              className="p-2 rounded-xl bg-white border border-[#EDEAE2] flex items-center justify-between"
                            >
                              <span className="font-bold text-[#2D2D2A]">{child.name}</span>
                              <span className="text-[10px] text-[#7A7A72]">
                                Grade {child.gradeLevel}-{child.section}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#7A7A72] italic bg-white p-2 rounded-xl border border-[#EDEAE2]">
                          No children linked to this parent account yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EDEAE2] flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedParent(p);
                        setIsParentLinkModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Allocate & Link Children</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Remove parent account for ${p.name}?`)) {
                          deleteParentProfile(p.id);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#EDEAE2] hover:bg-[#FFF3EB] font-bold text-xs text-[#E88D67] flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TEACHERS & FACULTY HUB */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-[#2D2D2A] font-serif">
                Faculty Staff & Subject Instructors
              </h3>
              <p className="text-xs text-[#7A7A72]">
                Register teachers, assign subjects taught, and manage faculty rosters.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingTeacher(null);
                setIsTeacherModalOpen(true);
              }}
              className="px-4 py-2 rounded-2xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Register Faculty</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {filteredTeachers.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
                    />
                    <div>
                      <h4 className="font-bold text-[#2D2D2A] text-sm font-serif">{t.name}</h4>
                      <p className="text-[11px] text-[#7A7A72]">{t.email}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-[#EDEAE2] space-y-1">
                    <p className="font-bold text-[11px] text-[#2D2D2A]">Subjects Taught:</p>
                    <div className="flex flex-wrap gap-1">
                      {(t.subjectsTaught || ['General Science']).map((sub) => (
                        <span
                          key={sub}
                          className="px-2 py-0.5 rounded-full bg-[#EBF1E8] text-[#4A6741] text-[10px] font-bold"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EDEAE2] flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingTeacher(t);
                      setIsTeacherModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#EDEAE2] hover:bg-[#F0EDE5] font-bold text-[11px] text-[#2D2D2A] flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#4A6741]" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Deactivate teacher account for ${t.name}?`)) {
                        deleteTeacherProfile(t.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#EDEAE2] hover:bg-[#FFF3EB] font-bold text-[11px] text-[#E88D67] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Deactivate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CLASSROOMS & ROSTERS */}
      {activeTab === 'classrooms' && (
        <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-[#2D2D2A] font-serif">
                Classrooms & Section Manager
              </h3>
              <p className="text-xs text-[#7A7A72]">
                Define classrooms, room numbers, class teachers, and student rosters.
              </p>
            </div>
          </div>

          {/* New Classroom Form */}
          <form
            onSubmit={handleCreateClassroomSubmit}
            className="p-4 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] space-y-3 text-xs"
          >
            <h4 className="font-bold text-[#2D2D2A] text-xs font-serif flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#4A6741]" />
              <span>Create New Classroom & Assign Instructor</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Class Name *</label>
                <input
                  type="text"
                  required
                  value={clsName}
                  onChange={(e) => setClsName(e.target.value)}
                  placeholder="e.g. Grade 8 Mathematics - Sec A"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-[#EDEAE2] text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Subject</label>
                <input
                  type="text"
                  value={clsSubject}
                  onChange={(e) => setClsSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-[#EDEAE2] text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Assigned Teacher</label>
                <select
                  value={clsTeacherId}
                  onChange={(e) => setClsTeacherId(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-[#EDEAE2] text-xs"
                >
                  <option value="">-- Choose Instructor --</option>
                  {teacherUsers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Grade Level</label>
                <input
                  type="number"
                  value={clsGrade}
                  onChange={(e) => setClsGrade(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-[#EDEAE2] text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Section</label>
                <input
                  type="text"
                  value={clsSection}
                  onChange={(e) => setClsSection(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-[#EDEAE2] text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Room Number</label>
                <input
                  type="text"
                  value={clsRoom}
                  onChange={(e) => setClsRoom(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-[#EDEAE2] text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3D5535] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Classroom</span>
            </button>
          </form>

          {/* Classroom List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {classrooms.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#4A6741] text-xs font-serif">{c.name}</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#EBF1E8] text-[#4A6741]">
                      Code: {c.code}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#EDEAE2] space-y-1">
                    <p className="text-[#7A7A72]">
                      Instructor: <strong className="text-[#2D2D2A]">{c.teacherName}</strong>
                    </p>
                    <p className="text-[#7A7A72]">
                      Room: <strong className="text-[#2D2D2A]">{c.roomNumber}</strong> • Grade {c.gradeLevel}-{c.section}
                    </p>
                    <p className="text-[#7A7A72]">
                      Enrolled Roster: <strong className="text-[#4A6741]">{c.studentCount} Students</strong>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EDEAE2] flex justify-end gap-2">
                  <button
                    onClick={() => {
                      if (confirm(`Delete classroom ${c.name}?`)) {
                        deleteClassroom(c.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#EDEAE2] hover:bg-[#FFF3EB] font-bold text-xs text-[#E88D67] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Classroom</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: BADGES & REWARDS */}
      {activeTab === 'badges' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Manual Awarding Panel */}
          <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
              <Award className="w-5 h-5 text-[#E88D67]" />
              <span>Manual Student Badge Awarding Desk</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Select Student *</label>
                <select
                  value={badgeStudentId}
                  onChange={(e) => setBadgeStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs focus:outline-none"
                >
                  <option value="">-- Choose Student --</option>
                  {studentProfiles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Grade {s.gradeLevel}-{s.section})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Select Badge *</label>
                <select
                  value={badgeDefId}
                  onChange={(e) => setBadgeDefId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs focus:outline-none"
                >
                  <option value="">-- Choose Badge --</option>
                  {badgeDefinitions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.icon} {b.title} ({b.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">
                  Principal Commendation / Remarks
                </label>
                <input
                  type="text"
                  value={badgeRemarks}
                  onChange={(e) => setBadgeRemarks(e.target.value)}
                  placeholder="e.g. Awarded for exemplary discipline in assembly"
                  className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs"
                />
              </div>

              <button
                onClick={handleAssignBadgeSubmit}
                disabled={isAssigningBadge || !badgeStudentId || !badgeDefId}
                className="w-full py-2.5 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3D5535] disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>{isAssigningBadge ? 'Awarding...' : 'Award Badge to Student'}</span>
              </button>
            </div>
          </div>

          {/* New Custom Badge Definition Creator */}
          <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#4A6741]" />
              <span>Define New Custom Badge</span>
            </h3>

            <form onSubmit={handleCreateBadgeSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-[#2D2D2A] mb-1">Badge Title *</label>
                  <input
                    type="text"
                    required
                    value={newBadgeTitle}
                    onChange={(e) => setNewBadgeTitle(e.target.value)}
                    placeholder="e.g. Science Pioneer"
                    className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2D2D2A] mb-1">Emoji Icon</label>
                  <input
                    type="text"
                    value={newBadgeIcon}
                    onChange={(e) => setNewBadgeIcon(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Description</label>
                <input
                  type="text"
                  value={newBadgeDesc}
                  onChange={(e) => setNewBadgeDesc(e.target.value)}
                  placeholder="e.g. Awarded for top score in physics lab"
                  className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Category</label>
                <select
                  value={newBadgeCategory}
                  onChange={(e) => setNewBadgeCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs"
                >
                  <option value="academic">Academic Excellence</option>
                  <option value="attendance">Attendance & Punctuality</option>
                  <option value="behavior">Behavior & Character</option>
                  <option value="extracurricular">Sports & Extracurricular</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#E88D67] text-white font-bold hover:bg-[#D87B55] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Custom Badge Definition</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 7: BROADCAST NOTICES & CSV EXPORTER */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Announcement Composer */}
          <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#E88D67]" />
              <span>Broadcast School Announcement</span>
            </h3>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. School Closed for Holiday on Friday"
                  className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2D2D2A] mb-1">Announcement Message *</label>
                <textarea
                  required
                  rows={3}
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Write official announcement details..."
                  className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2D2D2A] mb-1">Priority</label>
                  <select
                    value={annPriority}
                    onChange={(e) => setAnnPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#2D2D2A] mb-1">Target Audience</label>
                  <select
                    value={annAudience}
                    onChange={(e) => setAnnAudience(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2] text-xs"
                  >
                    <option value="all">All Users</option>
                    <option value="students">Students Only</option>
                    <option value="teachers">Teachers Only</option>
                    <option value="parents">Parents Only</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3D5535] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Megaphone className="w-4 h-4" />
                <span>Post School Broadcast</span>
              </button>
            </form>
          </div>

          {/* CSV Exporter Desk */}
          <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#4A6741]" />
              <span>Administrative CSV Data Exporter</span>
            </h3>

            <p className="text-[#7A7A72] text-xs">
              Generate and download raw CSV reports for external record keeping and board audits.
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleExportStudents}
                className="w-full p-4 rounded-2xl bg-[#F9F7F2] hover:bg-[#F0EDE5] border border-[#EDEAE2] flex items-center justify-between text-xs font-bold text-[#2D2D2A] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-5 h-5 text-[#4A6741]" />
                  <div className="text-left">
                    <p>Export Complete Student Roster</p>
                    <p className="text-[10px] text-[#7A7A72] font-normal">
                      Includes Roll Numbers, Grades, Sections & Attendance %
                    </p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-[#4A6741]" />
              </button>

              <button
                onClick={handleExportTeachers}
                className="w-full p-4 rounded-2xl bg-[#F9F7F2] hover:bg-[#F0EDE5] border border-[#EDEAE2] flex items-center justify-between text-xs font-bold text-[#2D2D2A] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-5 h-5 text-[#E88D67]" />
                  <div className="text-left">
                    <p>Export Faculty Staff Roster</p>
                    <p className="text-[10px] text-[#7A7A72] font-normal">
                      Includes Subjects Taught, Emails & Staff IDs
                    </p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-[#E88D67]" />
              </button>

              <button
                onClick={handleExportAuditLogs}
                className="w-full p-4 rounded-2xl bg-[#F9F7F2] hover:bg-[#F0EDE5] border border-[#EDEAE2] flex items-center justify-between text-xs font-bold text-[#2D2D2A] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-5 h-5 text-[#4A6741]" />
                  <div className="text-left">
                    <p>Export Administrative Audit Logs</p>
                    <p className="text-[10px] text-[#7A7A72] font-normal">
                      Complete activity history and timestamp audit trail
                    </p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-[#4A6741]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <AdminStudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        initialData={editingStudent}
        onSave={(data) => {
          if (editingStudent) {
            updateStudentProfile(editingStudent.id, data);
          } else {
            addStudentProfile(data);
          }
        }}
      />

      <AdminTeacherModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        initialData={editingTeacher}
        onSave={(data) => {
          if (editingTeacher) {
            updateTeacherProfile(editingTeacher.id, data);
          } else {
            addTeacherProfile(data);
          }
        }}
      />

      <AdminParentLinkModal
        isOpen={isParentLinkModalOpen}
        onClose={() => setIsParentLinkModalOpen(false)}
        parent={selectedParent}
        allStudents={studentProfiles}
        onSaveLink={(parentId, childrenIds) => {
          updateParentChildren(parentId, childrenIds);
        }}
      />
    </div>
  );
};
