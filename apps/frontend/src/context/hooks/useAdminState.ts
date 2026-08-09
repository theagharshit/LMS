import { useState } from 'react';
import {
  User,
  StudentProfile,
  BadgeDefinition,
  AdminAuditLog,
  SchoolAnnouncement,
  Classroom,
  MOCK_ADMIN_AUDIT_LOGS,
  MOCK_ANNOUNCEMENTS,
} from '@lms/shared';

export const useAdminState = (
  currentUser: User,
  setStudentProfiles: React.Dispatch<React.SetStateAction<StudentProfile[]>>,
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>,
  setBadgeDefinitions: React.Dispatch<React.SetStateAction<BadgeDefinition[]>>,
  setClassrooms: React.Dispatch<React.SetStateAction<Classroom[]>>,
  studentProfiles: StudentProfile[],
  allUsers: User[],
  badgeDefinitions: BadgeDefinition[],
  classrooms: Classroom[],
) => {
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLog[]>(MOCK_ADMIN_AUDIT_LOGS);
  const [schoolAnnouncements, setSchoolAnnouncements] =
    useState<SchoolAnnouncement[]>(MOCK_ANNOUNCEMENTS);

  const addAuditLog = (action: string, category: AdminAuditLog['category'], details: string) => {
    const newLog: AdminAuditLog = {
      id: `log-${Date.now()}`,
      action,
      category,
      performedBy: currentUser.name,
      details,
      timestamp: new Date().toISOString(),
    };
    setAdminAuditLogs((prev) => [newLog, ...prev]);
  };

  const addStudentProfile = (
    studentData: Omit<
      StudentProfile,
      'id' | 'attendancePercentage' | 'streakDays' | 'xpPoints' | 'badges'
    >,
  ) => {
    const newId = `user-stu-${Date.now()}`;
    const newStudent: StudentProfile = {
      ...studentData,
      id: newId,
      role: 'student',
      attendancePercentage: 100,
      streakDays: 1,
      xpPoints: 0,
      badges: [],
      avatar:
        studentData.avatar ||
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    };
    setStudentProfiles((prev) => [...prev, newStudent]);
    setAllUsers((prev) => [...prev, newStudent]);
    addAuditLog(
      'Enrolled New Student',
      'student',
      `Registered ${newStudent.name} (Grade ${newStudent.gradeLevel}-${newStudent.section}, Roll #${newStudent.rollNumber || 'N/A'}).`,
    );
  };

  const updateStudentProfile = (id: string, updates: Partial<StudentProfile>) => {
    setStudentProfiles((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    setAllUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    addAuditLog('Updated Student Profile', 'student', `Updated details for student ID ${id}.`);
  };

  const deleteStudentProfile = (id: string) => {
    const target = studentProfiles.find((s) => s.id === id);
    setStudentProfiles((prev) => prev.filter((s) => s.id !== id));
    setAllUsers((prev) => prev.filter((u) => u.id !== id));
    addAuditLog(
      'Archived Student Record',
      'student',
      `Archived student ${target?.name || id} from directory.`,
    );
  };

  const addTeacherProfile = (teacherData: Omit<User, 'id'>) => {
    const newTeacher: User = {
      ...teacherData,
      id: `user-teach-${Date.now()}`,
      role: 'teacher',
      avatar:
        teacherData.avatar ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    };
    setAllUsers((prev) => [...prev, newTeacher]);
    addAuditLog('Registered Teacher Staff', 'teacher', `Added faculty member ${newTeacher.name}.`);
  };

  const updateTeacherProfile = (id: string, updates: Partial<User>) => {
    setAllUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    addAuditLog('Updated Teacher Details', 'teacher', `Updated faculty details for ID ${id}.`);
  };

  const deleteTeacherProfile = (id: string) => {
    const target = allUsers.find((u) => u.id === id);
    setAllUsers((prev) => prev.filter((u) => u.id !== id));
    addAuditLog(
      'Deactivated Teacher Profile',
      'teacher',
      `Deactivated teacher profile ${target?.name || id}.`,
    );
  };

  const addParentProfile = (parentData: Omit<User, 'id'>) => {
    const newParent: User = {
      ...parentData,
      id: `user-parent-${Date.now()}`,
      role: 'parent',
      childrenIds: parentData.childrenIds || [],
      avatar:
        parentData.avatar ||
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    };
    setAllUsers((prev) => [...prev, newParent]);
    addAuditLog(
      'Registered Parent Account',
      'parent',
      `Created parent account for ${newParent.name}.`,
    );
  };

  const updateParentChildren = (parentId: string, childrenIds: string[]) => {
    setAllUsers((prev) => prev.map((u) => (u.id === parentId ? { ...u, childrenIds } : u)));
    const parent = allUsers.find((u) => u.id === parentId);
    addAuditLog(
      'Updated Family Link',
      'parent',
      `Updated linked children (${childrenIds.length} enrolled) for ${parent?.name || parentId}.`,
    );
  };

  const deleteParentProfile = (id: string) => {
    const target = allUsers.find((u) => u.id === id);
    setAllUsers((prev) => prev.filter((u) => u.id !== id));
    addAuditLog(
      'Removed Parent Account',
      'parent',
      `Removed parent account ${target?.name || id}.`,
    );
  };

  const addBadgeDefinition = (badge: Omit<BadgeDefinition, 'id'>) => {
    const newBadge: BadgeDefinition = {
      ...badge,
      id: `bdg-def-${Date.now()}`,
    };
    setBadgeDefinitions((prev) => [...prev, newBadge]);
    addAuditLog(
      'Created Custom Badge',
      'badge',
      `Defined new badge "${newBadge.title}" (${newBadge.icon}).`,
    );
  };

  const deleteBadgeDefinition = (id: string) => {
    const badge = badgeDefinitions.find((b) => b.id === id);
    setBadgeDefinitions((prev) => prev.filter((b) => b.id !== id));
    addAuditLog(
      'Deleted Badge Definition',
      'badge',
      `Removed badge definition ${badge?.title || id}.`,
    );
  };

  const deleteClassroom = (id: string) => {
    const cls = classrooms.find((c) => c.id === id);
    setClassrooms((prev) => prev.filter((c) => c.id !== id));
    addAuditLog('Deleted Classroom', 'classroom', `Removed classroom ${cls?.name || id}.`);
  };

  const addAnnouncement = (annData: Omit<SchoolAnnouncement, 'id' | 'createdAt'>) => {
    const newAnn: SchoolAnnouncement = {
      ...annData,
      id: `ann-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSchoolAnnouncements((prev) => [newAnn, ...prev]);
    addAuditLog(
      'Broadcast School Notice',
      'broadcast',
      `Posted announcement "${newAnn.title}" to ${newAnn.targetAudience}.`,
    );
  };

  const deleteAnnouncement = (id: string) => {
    setSchoolAnnouncements((prev) => prev.filter((a) => a.id !== id));
    addAuditLog('Removed School Notice', 'broadcast', `Removed announcement ID ${id}.`);
  };

  return {
    adminAuditLogs,
    setAdminAuditLogs,
    schoolAnnouncements,
    setSchoolAnnouncements,
    addAuditLog,
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
    deleteClassroom,
    addAnnouncement,
    deleteAnnouncement,
  };
};
