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
import { apiFetch } from '../../utils/apiFetch';
import { logger } from '../../utils/logger';
import { toast } from '../../utils/toast';

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

  const addStudentProfile = async (
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

    logger.log('[Frontend:AdminState] Dispatching POST /api/db/students payload:', newStudent);

    const response = await apiFetch('/api/db/students', {
      method: 'POST',
      body: JSON.stringify(newStudent),
      feedback: {
        success: `${newStudent.name} was enrolled successfully.`,
        error: `Could not enroll ${newStudent.name}. The local change may not be saved.`,
      },
    }).catch((err) => {
      console.error('Failed to create student via API:', err);
      return null;
    });
    if (!response?.ok) return;

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

    apiFetch(`/api/db/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      feedback: {
        success: 'Student profile updated.',
        error: 'Could not update the student profile.',
      },
    }).catch((err) => console.error('Failed to update student profile via API:', err));

    addAuditLog('Updated Student Profile', 'student', `Updated details for student ID ${id}.`);
  };

  const deleteStudentProfile = (id: string) => {
    const target = studentProfiles.find((s) => s.id === id);
    setStudentProfiles((prev) => prev.filter((s) => s.id !== id));
    setAllUsers((prev) => prev.filter((u) => u.id !== id));

    apiFetch(`/api/db/students/${id}`, {
      method: 'DELETE',
      feedback: {
        success: `${target?.name || 'Student'} was archived.`,
        error: 'Could not archive the student record.',
      },
    }).catch((err) => console.error('Failed to delete student profile via API:', err));

    addAuditLog(
      'Archived Student Record',
      'student',
      `Archived student ${target?.name || id} from directory.`,
    );
  };

  const addTeacherProfile = async (teacherData: Omit<User, 'id'>) => {
    const newTeacher: User = {
      ...teacherData,
      id: `user-teach-${Date.now()}`,
      role: 'teacher',
      avatar:
        teacherData.avatar ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    };

    const response = await apiFetch('/api/db/teachers', {
      method: 'POST',
      body: JSON.stringify(newTeacher),
      feedback: {
        success: `${newTeacher.name} was added to the faculty directory.`,
        error: `Could not add ${newTeacher.name}.`,
      },
    }).catch((err) => {
      console.error('Failed to create teacher via API:', err);
      return null;
    });
    if (!response?.ok) return;

    setAllUsers((prev) => [...prev, newTeacher]);

    addAuditLog('Registered Teacher Staff', 'teacher', `Added faculty member ${newTeacher.name}.`);
  };

  const updateTeacherProfile = (id: string, updates: Partial<User>) => {
    setAllUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));

    apiFetch(`/api/db/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      feedback: {
        success: 'Teacher profile updated.',
        error: 'Could not update the teacher profile.',
      },
    }).catch((err) => console.error('Failed to update teacher profile via API:', err));

    addAuditLog('Updated Teacher Details', 'teacher', `Updated faculty details for ID ${id}.`);
  };

  const deleteTeacherProfile = (id: string) => {
    const target = allUsers.find((u) => u.id === id);
    setAllUsers((prev) => prev.filter((u) => u.id !== id));

    apiFetch(`/api/db/teachers/${id}`, {
      method: 'DELETE',
      feedback: {
        success: `${target?.name || 'Teacher'} was deactivated.`,
        error: 'Could not deactivate the teacher account.',
      },
    }).catch((err) => console.error('Failed to delete teacher via API:', err));

    addAuditLog(
      'Deactivated Teacher Profile',
      'teacher',
      `Deactivated teacher profile ${target?.name || id}.`,
    );
  };

  const addParentProfile = async (parentData: Omit<User, 'id'>) => {
    const newParent: User = {
      ...parentData,
      id: `user-parent-${Date.now()}`,
      role: 'parent',
      childrenIds: parentData.childrenIds || [],
      avatar:
        parentData.avatar ||
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    };

    const response = await apiFetch('/api/db/parents', {
      method: 'POST',
      body: JSON.stringify(newParent),
      feedback: {
        success: `${newParent.name}'s parent account was created.`,
        error: `Could not create ${newParent.name}'s account.`,
      },
    }).catch((err) => {
      console.error('Failed to create parent via API:', err);
      return null;
    });
    if (!response?.ok) return;

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

    apiFetch(`/api/db/parents/${parentId}`, {
      method: 'PUT',
      body: JSON.stringify({ childrenIds }),
      feedback: {
        success: `${parent?.name || 'Parent'}'s family links were updated.`,
        error: 'Could not update the family links.',
      },
    }).catch((err) => console.error('Failed to update parent family links via API:', err));

    addAuditLog(
      'Updated Family Link',
      'parent',
      `Updated linked children (${childrenIds.length} enrolled) for ${parent?.name || parentId}.`,
    );
  };

  const deleteParentProfile = (id: string) => {
    const target = allUsers.find((u) => u.id === id);
    setAllUsers((prev) => prev.filter((u) => u.id !== id));

    apiFetch(`/api/db/parents/${id}`, {
      method: 'DELETE',
      feedback: {
        success: `${target?.name || 'Parent'}'s account was archived.`,
        error: 'Could not archive the parent account.',
      },
    }).catch((err) => console.error('Failed to delete parent profile via API:', err));

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

    apiFetch('/api/db/badge-definitions', {
      method: 'POST',
      body: JSON.stringify(newBadge),
      feedback: {
        success: `Badge “${newBadge.title}” was created.`,
        error: `Could not create badge “${newBadge.title}”.`,
      },
    }).catch((err) => console.error('Failed to create badge definition via API:', err));

    addAuditLog(
      'Created Custom Badge',
      'badge',
      `Defined new badge "${newBadge.title}" (${newBadge.icon}).`,
    );
  };

  const deleteBadgeDefinition = (id: string) => {
    const badge = badgeDefinitions.find((b) => b.id === id);
    setBadgeDefinitions((prev) => prev.filter((b) => b.id !== id));

    apiFetch(`/api/db/badge-definitions/${id}`, {
      method: 'DELETE',
      feedback: {
        success: `Badge “${badge?.title || 'Untitled'}” was deleted.`,
        error: 'Could not delete the badge definition.',
      },
    }).catch((err) => console.error('Failed to delete badge definition via API:', err));

    addAuditLog(
      'Deleted Badge Definition',
      'badge',
      `Removed badge definition ${badge?.title || id}.`,
    );
  };

  const deleteClassroom = (id: string) => {
    const cls = classrooms.find((c) => c.id === id);
    setClassrooms((prev) => prev.filter((c) => c.id !== id));

    apiFetch(`/api/db/classrooms/${id}`, {
      method: 'DELETE',
      feedback: {
        success: `${cls?.name || 'Classroom'} was archived.`,
        error: 'Could not archive the classroom.',
      },
    }).catch((err) => console.error('Failed to delete classroom via API:', err));

    addAuditLog('Deleted Classroom', 'classroom', `Removed classroom ${cls?.name || id}.`);
  };

  const addAnnouncement = (annData: Omit<SchoolAnnouncement, 'id' | 'createdAt'>) => {
    const newAnn: SchoolAnnouncement = {
      ...annData,
      id: `ann-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSchoolAnnouncements((prev) => [newAnn, ...prev]);
    toast.success(`Announcement “${newAnn.title}” was published.`, {
      title: 'Announcement published',
    });
    addAuditLog(
      'Broadcast School Notice',
      'broadcast',
      `Posted announcement "${newAnn.title}" to ${newAnn.targetAudience}.`,
    );
  };

  const deleteAnnouncement = (id: string) => {
    const announcement = schoolAnnouncements.find((item) => item.id === id);
    setSchoolAnnouncements((prev) => prev.filter((a) => a.id !== id));
    toast.success(`Announcement “${announcement?.title || 'Untitled'}” was removed.`, {
      title: 'Announcement removed',
    });
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
