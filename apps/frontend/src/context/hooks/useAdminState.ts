import { useState } from 'react';
import {
  User,
  StudentProfile,
  BadgeDefinition,
  AdminAuditLog,
  SchoolAnnouncement,
  Classroom,
  SubstituteRequest,
  SubstituteRequestStatus,
  TeacherAbsenceRequest,
  EligibleSubstituteTeacher,
  TeacherAssignmentAuditLog,
} from '@lms/shared';
import { apiFetch } from '../../utils/apiFetch';
import { toast } from '../../utils/toast';
import type { DatabaseBootstrapState } from '../databaseBootstrap';

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
  bootstrap?: DatabaseBootstrapState,
) => {
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLog[]>(
    () => bootstrap?.adminAuditLogs || [],
  );
  const [schoolAnnouncements, setSchoolAnnouncements] = useState<SchoolAnnouncement[]>(
    () => bootstrap?.schoolAnnouncements || [],
  );

  const [substituteRequests, setSubstituteRequests] = useState<SubstituteRequest[]>(
    () => bootstrap?.substituteRequests || [],
  );
  const [teacherAbsenceRequests, setTeacherAbsenceRequests] = useState<TeacherAbsenceRequest[]>(
    () => bootstrap?.teacherAbsenceRequests || [],
  );
  const [teacherAssignmentAuditLogs, setTeacherAssignmentAuditLogs] = useState<
    TeacherAssignmentAuditLog[]
  >(() => bootstrap?.teacherAssignmentAuditLogs || []);

  const addAuditLog = async (
    action: string,
    category: AdminAuditLog['category'],
    details: string,
  ) => {
    const response = await apiFetch('/api/db/audit-logs', {
      method: 'POST',
      body: JSON.stringify({ action, category, details }),
      feedback: false,
    }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    if (data.auditLog) setAdminAuditLogs((prev) => [data.auditLog, ...prev]);
  };

  const addStudentProfile = async (
    studentData: Omit<
      StudentProfile,
      'id' | 'attendancePercentage' | 'streakDays' | 'xpPoints' | 'badges'
    >,
  ) => {
    const response = await apiFetch('/api/db/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
      feedback: {
        success: `${studentData.name} was enrolled successfully.`,
        error: `Could not enroll ${studentData.name}.`,
      },
    }).catch((err) => {
      console.error('Failed to create student via API:', err);
      return null;
    });
    if (!response?.ok) return;
    const data = await response.json();
    const newStudent = data.student as StudentProfile;
    if (!newStudent?.id) return;

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

  const promoteStudentProfile = async (id: string) => {
    const student = studentProfiles.find((item) => item.id === id);
    if (!student) return;
    const lifecycleResponse = await apiFetch(`/api/db/students/${id}/lifecycle`, {
      feedback: false,
    });
    if (!lifecycleResponse.ok) return;
    const lifecycleData = await lifecycleResponse.json();
    const activeEnrollment = lifecycleData.lifecycle?.studentAcademicEnrollments?.find(
      (enrollment: { status?: string }) => enrollment.status === 'active',
    );
    if (!activeEnrollment?.academicYearId) return;
    const hasReport = lifecycleData.lifecycle?.studentReportCards?.some(
      (report: { academicYearId?: string }) =>
        report.academicYearId === activeEnrollment.academicYearId,
    );
    if (!hasReport) {
      const reportResponse = await apiFetch(`/api/db/students/${id}/report-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearId: activeEnrollment.academicYearId }),
        feedback: {
          success: `${student.name}'s official report card was generated.`,
          error: `Promotion is blocked until ${student.name}'s exam marks and report card are complete.`,
        },
      });
      if (!reportResponse.ok) return;
    }
    const response = await apiFetch(`/api/db/students/${id}/promote`, {
      method: 'POST',
      body: JSON.stringify({
        targetSection: student.section,
      }),
      feedback: {
        success: `${student.name}'s academic progression was recorded.`,
        error: `Could not progress ${student.name}.`,
      },
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data.result?.status === 'graduated') {
      setStudentProfiles((items) => items.filter((item) => item.id !== id));
      setAllUsers((items) => items.filter((item) => item.id !== id));
    } else if (data.result?.status === 'promoted') {
      setStudentProfiles((items) =>
        items.map((item) =>
          item.id === id ? { ...item, gradeLevel: student.gradeLevel + 1 } : item,
        ),
      );
      setAllUsers((items) =>
        items.map((item) =>
          item.id === id ? { ...item, gradeLevel: student.gradeLevel + 1 } : item,
        ),
      );
    }
  };

  const restoreStudentProfile = async (id: string) => {
    const response = await apiFetch(`/api/db/students/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Re-enrolled by school administration' }),
      feedback: { success: 'Student enrollment restored.', error: 'Could not restore enrollment.' },
    });
    if (!response.ok) return;
    setStudentProfiles((items) =>
      items.map((item) => (item.id === id ? { ...item, isArchived: false } : item)),
    );
    setAllUsers((items) =>
      items.map((item) => (item.id === id ? { ...item, isArchived: false } : item)),
    );
  };

  const addTeacherProfile = async (teacherData: Omit<User, 'id'>) => {
    const response = await apiFetch('/api/db/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData),
      feedback: {
        success: `${teacherData.name} was added to the faculty directory.`,
        error: `Could not add ${teacherData.name}.`,
      },
    }).catch((err) => {
      console.error('Failed to create teacher via API:', err);
      return null;
    });
    if (!response?.ok) return;
    const data = await response.json();
    const newTeacher = data.teacher as User;
    if (!newTeacher?.id) return;

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
    const response = await apiFetch('/api/db/parents', {
      method: 'POST',
      body: JSON.stringify(parentData),
      feedback: {
        success: `${parentData.name}'s parent account was created.`,
        error: `Could not create ${parentData.name}'s account.`,
      },
    }).catch((err) => {
      console.error('Failed to create parent via API:', err);
      return null;
    });
    if (!response?.ok) return;
    const data = await response.json();
    const newParent = data.parent as User;
    if (!newParent?.id) return;

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
        success: parent?.name
          ? `${parent.name}'s family links were updated.`
          : 'The family links were updated.',
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
        success: target?.name
          ? `${target.name}'s account was archived.`
          : 'The parent account was archived.',
        error: 'Could not archive the parent account.',
      },
    }).catch((err) => console.error('Failed to delete parent profile via API:', err));

    addAuditLog(
      'Removed Parent Account',
      'parent',
      `Removed parent account ${target?.name || id}.`,
    );
  };

  const addBadgeDefinition = async (badge: Omit<BadgeDefinition, 'id'>) => {
    const response = await apiFetch('/api/db/badge-definitions', {
      method: 'POST',
      body: JSON.stringify(badge),
      feedback: {
        success: `Badge “${badge.title}” was created.`,
        error: `Could not create badge “${badge.title}”.`,
      },
    }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    const newBadge = data.badge as BadgeDefinition;
    if (!newBadge?.id) return;
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
  const addAnnouncement = async (annData: Omit<SchoolAnnouncement, 'id' | 'createdAt'>) => {
    try {
      const response = await apiFetch('/api/db/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAudience: annData.targetAudience,
          title: annData.title,
          body: annData.content,
          category: 'COMMUNICATION',
          severity: annData.priority,
          type: 'announcement',
        }),
      });
      const result = await response.json();
      if (!result.announcement?.id) throw new Error('Announcement response was incomplete.');
      setSchoolAnnouncements((prev) => [result.announcement, ...prev]);

      toast.success(`Announcement “${annData.title}” was published.`, {
        title: 'Announcement published',
      });

      addAuditLog(
        'Broadcast School Notice',
        'broadcast',
        `Posted announcement "${annData.title}" to ${annData.targetAudience}.`,
      );
    } catch (err) {
      console.error('Failed to publish announcement', err);

      toast.error('Could not publish announcement. Please try again.');
    }
  };
  const deleteAnnouncement = async (id: string) => {
    const announcement = schoolAnnouncements.find((item) => item.id === id);
    const response = await apiFetch(`/api/db/notifications/${id}`, {
      method: 'DELETE',
      feedback: {
        success: `Announcement “${announcement?.title || 'Untitled'}” was removed.`,
        error: 'Could not remove the announcement.',
      },
    });
    if (!response.ok) return;
    setSchoolAnnouncements((prev) => prev.filter((announcementItem) => announcementItem.id !== id));
    toast.success(`Announcement “${announcement?.title || 'Untitled'}” was removed.`, {
      title: 'Announcement removed',
    });
    addAuditLog('Removed School Notice', 'broadcast', `Removed announcement ID ${id}.`);
  };

  const assignSubjectToTeacher = async (
    teacherId: string,
    subjectId: string,
    classroomId?: string,
    reason?: string,
  ) => {
    const teacher = allUsers.find((u) => u.id === teacherId);
    const cls = classrooms.find((c) => c.id === classroomId);

    const res = await apiFetch('/api/db/teachers/assign-subject', {
      method: 'POST',
      body: JSON.stringify({ teacherId, subjectId, classroomId, reason }),
      feedback: {
        success: `Subject assigned to ${teacher?.name || 'Teacher'}.`,
        error: `Could not assign subject to ${teacher?.name || 'Teacher'}.`,
      },
    });

    if (res.ok) {
      if (classroomId && teacher) {
        setClassrooms((prev) =>
          prev.map((c) =>
            c.id === classroomId
              ? { ...c, teacherId, teacherName: teacher.name, teacherAvatar: teacher.avatar }
              : c,
          ),
        );
      }
      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === teacherId
            ? {
                ...u,
                subjectsTaught: Array.from(new Set([...(u.subjectsTaught || []), subjectId])),
              }
            : u,
        ),
      );
    }
  };

  const deassignSubjectFromTeacher = async (
    teacherId: string,
    subjectId: string,
    classroomId?: string,
    reason?: string,
  ) => {
    const teacher = allUsers.find((u) => u.id === teacherId);
    const res = await apiFetch('/api/db/teachers/deassign-subject', {
      method: 'POST',
      body: JSON.stringify({ teacherId, subjectId, classroomId, reason }),
      feedback: {
        success: `Subject de-assigned from ${teacher?.name || 'Teacher'}.`,
        error: `Could not de-assign subject.`,
      },
    });

    if (res.ok) {
      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === teacherId
            ? { ...u, subjectsTaught: (u.subjectsTaught || []).filter((s) => s !== subjectId) }
            : u,
        ),
      );
    }
  };

  const reassignSubject = async (
    subjectId: string,
    classroomId: string,
    fromTeacherId: string,
    toTeacherId: string,
    reason?: string,
  ) => {
    const fromTeacher = allUsers.find((u) => u.id === fromTeacherId);
    const toTeacher = allUsers.find((u) => u.id === toTeacherId);
    const cls = classrooms.find((c) => c.id === classroomId);

    const res = await apiFetch('/api/db/teachers/reassign-subject', {
      method: 'POST',
      body: JSON.stringify({ subjectId, classroomId, fromTeacherId, toTeacherId, reason }),
      feedback: {
        success: `Classroom ${cls?.name || ''} reassigned to ${toTeacher?.name || 'Teacher'}.`,
        error: `Could not reassign classroom.`,
      },
    });

    if (res.ok && toTeacher) {
      setClassrooms((prev) =>
        prev.map((c) =>
          c.id === classroomId
            ? {
                ...c,
                teacherId: toTeacherId,
                teacherName: toTeacher.name,
                teacherAvatar: toTeacher.avatar,
              }
            : c,
        ),
      );
    }
  };

  const fetchEligibleSubstitutes = async (
    classroomId: string,
    subjectId: string,
    date: string,
    timeSlot: string,
  ): Promise<EligibleSubstituteTeacher[]> => {
    try {
      const res = await apiFetch(
        `/api/db/teachers/substitutes/eligible?classroomId=${classroomId}&subjectId=${subjectId}&date=${date}&timeSlot=${encodeURIComponent(timeSlot)}`,
      );
      if (!res.ok) throw new Error('Failed to fetch eligible substitutes');
      const data = await res.json();
      return data.candidates || [];
    } catch (err) {
      console.error('Failed to fetch eligible substitutes:', err);
      return [];
    }
  };

  const createSubstituteRequest = async (data: {
    classroomId: string;
    subjectId: string;
    date: string;
    timeSlot: string;
    originalTeacherId: string;
    suggestedSubstituteId?: string;
    reason: string;
    teacherAbsenceRequestId?: string;
  }) => {
    const res = await apiFetch('/api/db/teachers/substitutes/request', {
      method: 'POST',
      body: JSON.stringify(data),
      feedback: {
        success: 'Substitute teacher request created successfully.',
        error: 'Could not create substitute request.',
      },
    });

    const resData = await res.json();
    if (!resData.substituteRequest?.id)
      throw new Error('Substitute request response was incomplete.');
    setSubstituteRequests((prev) => [resData.substituteRequest, ...prev]);
  };

  const updateSubstituteStatus = async (
    requestId: string,
    status: SubstituteRequestStatus,
    responseNotes?: string,
    assignedSubstituteId?: string,
  ) => {
    const response = await apiFetch(`/api/db/teachers/substitutes/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, responseNotes, assignedSubstituteId }),
      feedback: {
        success: `Substitute request status updated to ${status}.`,
        error: 'Could not update substitute request status.',
      },
    });
    const data = await response.json();
    if (!data.substituteRequest?.id) throw new Error('Substitute request response was incomplete.');
    setSubstituteRequests((prev) =>
      prev.map((request) => (request.id === requestId ? data.substituteRequest : request)),
    );
  };

  const submitTeacherAbsenceRequest = async (
    startDate: string,
    endDate: string,
    reason: string,
  ) => {
    const res = await apiFetch('/api/db/teachers/absence-requests', {
      method: 'POST',
      body: JSON.stringify({ teacherId: currentUser.id, startDate, endDate, reason }),
      feedback: {
        success: 'Teacher leave request submitted successfully.',
        error: 'Could not submit leave request.',
      },
    });

    const resData = await res.json();
    if (!resData.absenceRequest?.id) throw new Error('Absence request response was incomplete.');
    setTeacherAbsenceRequests((prev) => [resData.absenceRequest, ...prev]);
  };

  const reviewTeacherAbsenceRequest = async (
    requestId: string,
    status: 'approved' | 'rejected',
  ) => {
    const response = await apiFetch(`/api/db/teachers/absence-requests/${requestId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      feedback: {
        success: `Teacher leave request ${status}.`,
        error: 'Could not update leave request status.',
      },
    });
    const data = await response.json();
    if (!data.absenceRequest?.id) throw new Error('Absence request response was incomplete.');
    setTeacherAbsenceRequests((prev) =>
      prev.map((request) => (request.id === requestId ? data.absenceRequest : request)),
    );
  };

  return {
    adminAuditLogs,
    setAdminAuditLogs,
    schoolAnnouncements,
    setSchoolAnnouncements,
    substituteRequests,
    setSubstituteRequests,
    teacherAbsenceRequests,
    setTeacherAbsenceRequests,
    teacherAssignmentAuditLogs,
    setTeacherAssignmentAuditLogs,
    addAuditLog,
    addStudentProfile,
    updateStudentProfile,
    deleteStudentProfile,
    promoteStudentProfile,
    restoreStudentProfile,
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
    assignSubjectToTeacher,
    deassignSubjectFromTeacher,
    reassignSubject,
    fetchEligibleSubstitutes,
    createSubstituteRequest,
    updateSubstituteStatus,
    submitTeacherAbsenceRequest,
    reviewTeacherAbsenceRequest,
  };
};
