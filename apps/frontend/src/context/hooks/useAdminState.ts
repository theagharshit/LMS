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
  MOCK_ADMIN_AUDIT_LOGS,
  MOCK_ANNOUNCEMENTS,
  MOCK_SUBSTITUTE_REQUESTS,
  MOCK_TEACHER_ABSENCE_REQUESTS,
  MOCK_TEACHER_ASSIGNMENT_AUDIT_LOGS,
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

  const [substituteRequests, setSubstituteRequests] =
    useState<SubstituteRequest[]>(MOCK_SUBSTITUTE_REQUESTS);
  const [teacherAbsenceRequests, setTeacherAbsenceRequests] = useState<TeacherAbsenceRequest[]>(
    MOCK_TEACHER_ABSENCE_REQUESTS,
  );
  const [teacherAssignmentAuditLogs, setTeacherAssignmentAuditLogs] = useState<
    TeacherAssignmentAuditLog[]
  >(MOCK_TEACHER_ASSIGNMENT_AUDIT_LOGS);

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
      const newAudit: TeacherAssignmentAuditLog = {
        id: `ta-log-${Date.now()}`,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        targetTeacherId: teacherId,
        targetTeacherName: teacher?.name || 'Teacher',
        action: 'ASSIGN_SUBJECT',
        subjectId,
        classroomId,
        classroomName: cls?.name,
        details: `Assigned subject ${subjectId}${cls ? ` for ${cls.name}` : ''} to ${teacher?.name}.`,
        reason,
        createdAt: new Date().toISOString(),
      };
      setTeacherAssignmentAuditLogs((prev) => [newAudit, ...prev]);
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
      const newAudit: TeacherAssignmentAuditLog = {
        id: `ta-log-${Date.now()}`,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        targetTeacherId: teacherId,
        targetTeacherName: teacher?.name || 'Teacher',
        action: 'DEASSIGN_SUBJECT',
        subjectId,
        classroomId,
        details: `De-assigned subject ${subjectId} from ${teacher?.name}.`,
        reason,
        createdAt: new Date().toISOString(),
      };
      setTeacherAssignmentAuditLogs((prev) => [newAudit, ...prev]);
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
      const newAudit: TeacherAssignmentAuditLog = {
        id: `ta-log-${Date.now()}`,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        targetTeacherId: toTeacherId,
        targetTeacherName: toTeacher.name,
        action: 'REASSIGN_SUBJECT',
        subjectId,
        classroomId,
        classroomName: cls?.name,
        details: `Reassigned ${cls?.name || 'Classroom'} from ${fromTeacher?.name} to ${toTeacher.name}.`,
        reason,
        createdAt: new Date().toISOString(),
      };
      setTeacherAssignmentAuditLogs((prev) => [newAudit, ...prev]);
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
      // Fallback evaluate local candidates
      return allUsers
        .filter((u) => u.role === 'teacher' && !u.isArchived)
        .map((t) => ({
          teacherId: t.id,
          teacherName: t.name,
          teacherAvatar: t.avatar,
          isQualified: (t.subjectsTaught || []).some((s) =>
            s.toLowerCase().includes(subjectId.toLowerCase()),
          ),
          isAvailable: true,
          currentWorkload: classrooms.filter((c) => c.teacherId === t.id).length,
        }));
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
    const cls = classrooms.find((c) => c.id === data.classroomId);
    const origTeacher = allUsers.find((u) => u.id === data.originalTeacherId);
    const sugSub = allUsers.find((u) => u.id === data.suggestedSubstituteId);

    const res = await apiFetch('/api/db/teachers/substitutes/request', {
      method: 'POST',
      body: JSON.stringify(data),
      feedback: {
        success: 'Substitute teacher request created successfully.',
        error: 'Could not create substitute request.',
      },
    });

    const newReq: SubstituteRequest = {
      id: `sub-req-${Date.now()}`,
      teacherAbsenceRequestId: data.teacherAbsenceRequestId,
      classroomId: data.classroomId,
      classroomName: cls?.name || 'Classroom',
      subjectId: data.subjectId,
      subjectName: cls?.subject || 'Subject',
      date: data.date,
      timeSlot: data.timeSlot,
      originalTeacherId: data.originalTeacherId,
      originalTeacherName: origTeacher?.name || 'Original Teacher',
      suggestedSubstituteId: data.suggestedSubstituteId,
      suggestedSubstituteName: sugSub?.name,
      assignedSubstituteId: data.suggestedSubstituteId,
      assignedSubstituteName: sugSub?.name,
      reason: data.reason,
      status: 'PENDING',
      createdByAdminId: currentUser.id,
      createdByAdminName: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    if (res.ok) {
      try {
        const resData = await res.json();
        if (resData.substituteRequest) {
          setSubstituteRequests((prev) => [resData.substituteRequest, ...prev]);
          return;
        }
      } catch (e) {
        // Fallthrough to local update
      }
    }

    setSubstituteRequests((prev) => [newReq, ...prev]);
  };

  const updateSubstituteStatus = async (
    requestId: string,
    status: SubstituteRequestStatus,
    responseNotes?: string,
    assignedSubstituteId?: string,
  ) => {
    const subTeacher = allUsers.find((u) => u.id === assignedSubstituteId);
    setSubstituteRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              status,
              responseNotes: responseNotes || req.responseNotes,
              assignedSubstituteId: assignedSubstituteId || req.assignedSubstituteId,
              assignedSubstituteName: subTeacher?.name || req.assignedSubstituteName,
            }
          : req,
      ),
    );

    apiFetch(`/api/db/teachers/substitutes/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, responseNotes, assignedSubstituteId }),
      feedback: {
        success: `Substitute request status updated to ${status}.`,
        error: 'Could not update substitute request status.',
      },
    }).catch((err) => console.error('Failed to update substitute status via API:', err));
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

    const newAbs: TeacherAbsenceRequest = {
      id: `tar-${Date.now()}`,
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      teacherAvatar: currentUser.avatar,
      startDate,
      endDate,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    if (res.ok) {
      try {
        const resData = await res.json();
        if (resData.absenceRequest) {
          setTeacherAbsenceRequests((prev) => [resData.absenceRequest, ...prev]);
          return;
        }
      } catch (e) {
        // Fallthrough to local update
      }
    }

    setTeacherAbsenceRequests((prev) => [newAbs, ...prev]);
  };

  const reviewTeacherAbsenceRequest = async (
    requestId: string,
    status: 'approved' | 'rejected',
  ) => {
    const req = teacherAbsenceRequests.find((r) => r.id === requestId);
    setTeacherAbsenceRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status,
              reviewedByAdminId: currentUser.id,
              reviewedByAdminName: currentUser.name,
            }
          : r,
      ),
    );

    apiFetch(`/api/db/teachers/absence-requests/${requestId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      feedback: {
        success: `Teacher leave request ${status}.`,
        error: 'Could not update leave request status.',
      },
    }).catch((err) => console.error('Failed to review teacher absence request via API:', err));

    // If approved, automatically prompt or suggest substitute requests for classrooms taught by this teacher
    if (status === 'approved' && req) {
      const teacherClassrooms = classrooms.filter((c) => c.teacherId === req.teacherId);
      for (const cls of teacherClassrooms) {
        createSubstituteRequest({
          classroomId: cls.id,
          subjectId: cls.subject,
          date: req.startDate,
          timeSlot: '10:00 AM - 10:45 AM',
          originalTeacherId: req.teacherId,
          reason: `Teacher on approved leave: ${req.reason}`,
          teacherAbsenceRequestId: req.id,
        });
      }
    }
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
