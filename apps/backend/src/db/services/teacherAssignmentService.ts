import { prisma } from './prismaClient';
import {
  TeacherAbsenceRequest,
  SubstituteRequest,
  EligibleSubstituteTeacher,
  TeacherAssignmentAuditLog,
  AssignmentAuditLogAction,
  TeacherAbsenceStatus,
  SubstituteRequestStatus,
} from '@lms/shared';
import { cacheService } from './cacheService';
import { notificationService } from './notificationService';
import { logger } from '@utils/logger';

export class TeacherAssignmentService {
  private async requireAdmin(actorId: string) {
    const actor = await prisma.user.findFirst({
      where: { id: actorId, role: 'admin', isArchived: false },
    });
    if (!actor) throw new Error('An active administrator account is required.');
    return actor;
  }

  /**
   * Submit a teacher absence / leave request
   */
  public async submitTeacherAbsenceRequest(
    teacherId: string,
    startDate: string,
    endDate: string,
    reason: string,
    actorId = teacherId,
  ): Promise<TeacherAbsenceRequest> {
    const actor = await prisma.user.findFirst({
      where: { id: actorId, role: { in: ['teacher', 'admin'] }, isArchived: false },
      select: { id: true, role: true, schoolId: true },
    });
    if (!actor) throw new Error('An active teacher or administrator account is required.');
    if (actor.role === 'teacher' && actor.id !== teacherId)
      throw new Error('Teachers may only submit their own leave requests.');
    const teacher = await prisma.user.findFirst({
      where: {
        id: teacherId,
        role: 'teacher',
        schoolId: actor.schoolId,
        isArchived: false,
      },
    });
    if (!teacher) throw new Error('Teacher not found or inactive.');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid start or end date provided.');
    }
    if (start > end) {
      throw new Error('Start date cannot be after end date.');
    }

    const created = await prisma.teacherAbsenceRequest.create({
      data: {
        teacherId,
        startDate: start,
        endDate: end,
        reason: reason.trim(),
        status: 'pending',
      },
      include: {
        teacher: true,
        reviewedByAdmin: true,
      },
    });

    await this.logAudit({
      actorId: teacherId,
      actorName: teacher.name,
      actorRole: 'teacher',
      targetTeacherId: teacherId,
      targetTeacherName: teacher.name,
      action: 'TEACHER_ABSENCE_REQUEST',
      details: `Teacher ${teacher.name} requested leave from ${startDate} to ${endDate}.`,
      reason,
    });

    // Notify administrators
    const admins = await prisma.user.findMany({
      where: { role: 'admin', schoolId: teacher.schoolId, isArchived: false },
      select: { id: true },
    });
    for (const admin of admins) {
      await notificationService.dispatchNotification({
        recipientId: admin.id,
        senderId: teacherId,
        senderName: teacher.name,
        senderRole: 'teacher',
        title: `📋 Teacher Leave Request: ${teacher.name}`,
        body: `${teacher.name} has submitted a leave request from ${startDate} to ${endDate}. Reason: ${reason}`,
        category: 'ACADEMIC',
        severity: 'high',
        type: 'general',
      });
    }

    return {
      id: created.id,
      teacherId: created.teacherId,
      teacherName: created.teacher.name,
      teacherAvatar: created.teacher.avatar,
      startDate: created.startDate.toISOString().split('T')[0],
      endDate: created.endDate.toISOString().split('T')[0],
      reason: created.reason,
      status: created.status as TeacherAbsenceStatus,
      reviewedByAdminId: created.reviewedByAdminId || undefined,
      reviewedByAdminName: created.reviewedByAdmin?.name || undefined,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Admin review of a teacher absence request (Approve / Reject)
   */
  public async reviewTeacherAbsenceRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    actorId: string,
  ): Promise<TeacherAbsenceRequest> {
    const admin = await this.requireAdmin(actorId);

    const req = await prisma.teacherAbsenceRequest.findUnique({
      where: { id: requestId },
      include: { teacher: true },
    });
    if (!req) throw new Error('Teacher absence request not found.');
    if (req.teacher.schoolId !== admin.schoolId)
      throw new Error("You cannot review another school's absence request.");

    const updated = await prisma.teacherAbsenceRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedByAdminId: actorId,
      },
      include: { teacher: true, reviewedByAdmin: true },
    });

    const action = status === 'approved' ? 'APPROVE_TEACHER_ABSENCE' : 'REJECT_TEACHER_ABSENCE';
    await this.logAudit({
      actorId,
      actorName: admin.name,
      actorRole: admin.role,
      targetTeacherId: req.teacherId,
      targetTeacherName: req.teacher.name,
      action,
      details: `Admin ${admin.name} ${status} leave request for ${req.teacher.name}.`,
    });

    // Notify teacher
    await notificationService.dispatchNotification({
      recipientId: req.teacherId,
      senderId: actorId,
      senderName: admin.name,
      senderRole: admin.role,
      title: `Leave Request ${status.toUpperCase()}`,
      body: `Your leave request for ${req.startDate.toISOString().split('T')[0]} has been ${status} by Admin ${admin.name}.`,
      category: 'ACADEMIC',
      severity: status === 'approved' ? 'normal' : 'high',
      type: 'general',
    });

    // If approved, automatically create substitute teacher requests for all classrooms assigned to this teacher
    if (status === 'approved') {
      const timetableSlots = await prisma.timetableSlot.findMany({
        where: { teacherId: req.teacherId, isArchived: false },
      });
      for (
        let absenceDate = new Date(req.startDate);
        absenceDate <= req.endDate;
        absenceDate = new Date(absenceDate.getTime() + 86_400_000)
      ) {
        const daySlots = timetableSlots.filter(
          (slot) => slot.dayOfWeek === absenceDate.getUTCDay(),
        );
        for (const slot of daySlots) {
          try {
            await this.createSubstituteRequest({
              classroomId: slot.classroomId,
              subjectId: slot.subjectId,
              date: absenceDate.toISOString().split('T')[0],
              timeSlot: `${slot.startTime} - ${slot.endTime}`,
              originalTeacherId: req.teacherId,
              reason: `Teacher on approved leave: ${req.reason}`,
              teacherAbsenceRequestId: req.id,
              createdByAdminId: actorId,
            });
          } catch (e: any) {
            logger.warn(
              `Could not auto-create substitute request for timetable slot ${slot.id}:`,
              e?.message || e,
            );
          }
        }
      }
    }

    return {
      id: updated.id,
      teacherId: updated.teacherId,
      teacherName: updated.teacher.name,
      teacherAvatar: updated.teacher.avatar,
      startDate: updated.startDate.toISOString().split('T')[0],
      endDate: updated.endDate.toISOString().split('T')[0],
      reason: updated.reason,
      status: updated.status as TeacherAbsenceStatus,
      reviewedByAdminId: updated.reviewedByAdminId || undefined,
      reviewedByAdminName: updated.reviewedByAdmin?.name || undefined,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Assign a subject to a teacher (and optionally link a specific classroom)
   */
  public async assignSubjectToTeacher(
    teacherId: string,
    subjectId: string,
    classroomId: string | undefined,
    actorId: string,
    reason?: string,
  ) {
    const actor = await this.requireAdmin(actorId);
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: 'teacher', schoolId: actor.schoolId, isArchived: false },
    });
    if (!teacher) throw new Error('Teacher not found or is inactive.');

    let subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId: actor.schoolId, isArchived: false },
    });
    if (!subject) {
      // Allow subject lookup by name if subjectId passed is a name
      subject = await prisma.subject.findFirst({
        where: {
          schoolId: actor.schoolId,
          isArchived: false,
          name: { equals: subjectId, mode: 'insensitive' },
        },
      });
    }
    if (!subject) throw new Error(`Subject record for '${subjectId}' not found.`);

    // Check if TeacherSubject mapping exists
    const existingSubjectLink = await prisma.teacherSubject.findUnique({
      where: { teacherId_subjectId: { teacherId, subjectId: subject.id } },
    });
    if (!existingSubjectLink) {
      await prisma.teacherSubject.create({
        data: { teacherId, subjectId: subject.id },
      });
    }

    let classroomName: string | undefined;
    if (classroomId) {
      const cls = await prisma.classroom.findFirst({
        where: { id: classroomId, schoolId: actor.schoolId, isArchived: false },
      });
      if (!cls) throw new Error('Classroom not found.');
      if (cls.teacherId === teacherId) {
        throw new Error(`Teacher ${teacher.name} is already assigned to classroom ${cls.name}.`);
      }
      classroomName = cls.name;
      await prisma.$transaction(async (tx) => {
        const academicYear = cls.academicYearId
          ? await tx.academicYear.findUnique({ where: { id: cls.academicYearId } })
          : await tx.academicYear.findFirst({
              where: { schoolId: cls.schoolId, isActive: true, isArchived: false },
            });
        if (!academicYear) throw new Error('An active academic year is required.');
        const slots = await tx.timetableSlot.findMany({
          where: { classroomId, isArchived: false },
        });
        for (const slot of slots) {
          const conflict = await tx.timetableSlot.findFirst({
            where: {
              id: { not: slot.id },
              teacherId,
              academicYearId: slot.academicYearId,
              dayOfWeek: slot.dayOfWeek,
              periodNumber: slot.periodNumber,
              isArchived: false,
            },
          });
          if (conflict) throw new Error('Teacher has a timetable clash for this classroom.');
        }
        await tx.teachingAssignment.updateMany({
          where: { classroomId, isActive: true },
          data: { isActive: false, endsAt: new Date() },
        });
        await tx.teachingAssignment.upsert({
          where: {
            teacherId_classroomId_academicYearId: {
              teacherId,
              classroomId,
              academicYearId: academicYear.id,
            },
          },
          create: {
            teacherId,
            classroomId,
            subjectId: subject.id,
            academicYearId: academicYear.id,
          },
          update: { subjectId: subject.id, isActive: true, startsAt: new Date(), endsAt: null },
        });
        await tx.classroom.update({
          where: { id: classroomId },
          data: { teacherId, subjectId: subject.id, academicYearId: academicYear.id },
        });
        await tx.timetableSlot.updateMany({
          where: { classroomId, isArchived: false },
          data: { teacherId, subjectId: subject.id },
        });
      });
    }

    await this.logAudit({
      actorId,
      actorName: actor.name,
      actorRole: actor.role,
      targetTeacherId: teacherId,
      targetTeacherName: teacher.name,
      action: 'ASSIGN_SUBJECT',
      subjectId: subject.id,
      subjectName: subject.name,
      classroomId,
      classroomName,
      details: `Assigned subject ${subject.name}${classroomName ? ` for classroom ${classroomName}` : ''} to ${teacher.name}.`,
      reason,
    });

    await cacheService.invalidate('lms:users', 'lms:classrooms');
    return { status: 'success', teacherId, subjectId: subject.id, classroomId };
  }

  /**
   * Remove / de-assign a subject from a teacher
   */
  public async deassignSubjectFromTeacher(
    teacherId: string,
    subjectId: string,
    classroomId: string | undefined,
    actorId: string,
    reason?: string,
  ) {
    const actor = await this.requireAdmin(actorId);
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: 'teacher', schoolId: actor.schoolId },
    });
    if (!teacher) throw new Error('Teacher not found.');

    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId: actor.schoolId },
    });
    const subjectName = subject?.name || subjectId;

    if (classroomId) {
      const cls = await prisma.classroom.findFirst({
        where: { id: classroomId, schoolId: actor.schoolId, isArchived: false },
      });
      if (cls)
        throw new Error('Use classroom reassignment and select a qualified replacement teacher.');
    }

    await prisma.teacherSubject.deleteMany({
      where: { teacherId, subjectId },
    });

    let classroomName: string | undefined;

    await this.logAudit({
      actorId,
      actorName: actor.name,
      actorRole: actor.role,
      targetTeacherId: teacherId,
      targetTeacherName: teacher.name,
      action: 'DEASSIGN_SUBJECT',
      subjectId,
      subjectName,
      classroomId,
      classroomName,
      details: `De-assigned subject ${subjectName}${classroomName ? ` from classroom ${classroomName}` : ''} from ${teacher.name}.`,
      reason,
    });

    await cacheService.invalidate('lms:users', 'lms:classrooms');
    return { status: 'success', teacherId, subjectId };
  }

  /**
   * Reassign a subject / classroom from Teacher A to Teacher B
   */
  public async reassignSubject(
    subjectId: string,
    classroomId: string,
    fromTeacherId: string,
    toTeacherId: string,
    actorId: string,
    reason?: string,
  ) {
    if (fromTeacherId === toTeacherId) {
      throw new Error('Source teacher and target teacher cannot be the same person.');
    }

    const actor = await this.requireAdmin(actorId);
    const fromTeacher = await prisma.user.findFirst({
      where: { id: fromTeacherId, role: 'teacher', schoolId: actor.schoolId },
    });
    const toTeacher = await prisma.user.findFirst({
      where: { id: toTeacherId, role: 'teacher', schoolId: actor.schoolId, isArchived: false },
    });
    if (!fromTeacher || !toTeacher) {
      throw new Error('One or both specified teachers could not be found.');
    }

    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, schoolId: actor.schoolId, isArchived: false },
      include: { subjectRef: true },
    });
    if (!classroom) throw new Error('Target classroom not found.');

    const targetSubjectId = subjectId || classroom.subjectId;
    const subject = await prisma.subject.findUnique({ where: { id: targetSubjectId } });
    const subjectName = subject?.name || classroom.subjectRef.name;

    // Ensure target teacher has TeacherSubject qualification mapping
    await prisma.teacherSubject.upsert({
      where: { teacherId_subjectId: { teacherId: toTeacherId, subjectId: targetSubjectId } },
      create: { teacherId: toTeacherId, subjectId: targetSubjectId },
      update: {},
    });

    await prisma.$transaction(async (tx) => {
      const academicYear = classroom.academicYearId
        ? await tx.academicYear.findUnique({ where: { id: classroom.academicYearId } })
        : await tx.academicYear.findFirst({
            where: { schoolId: classroom.schoolId, isActive: true, isArchived: false },
          });
      if (!academicYear) throw new Error('An active academic year is required.');
      const slots = await tx.timetableSlot.findMany({ where: { classroomId, isArchived: false } });
      for (const slot of slots) {
        const conflict = await tx.timetableSlot.findFirst({
          where: {
            id: { not: slot.id },
            teacherId: toTeacherId,
            academicYearId: slot.academicYearId,
            dayOfWeek: slot.dayOfWeek,
            periodNumber: slot.periodNumber,
            isArchived: false,
          },
        });
        if (conflict) throw new Error('Target teacher has a timetable clash.');
      }
      await tx.teachingAssignment.updateMany({
        where: { classroomId, isActive: true },
        data: { isActive: false, endsAt: new Date() },
      });
      await tx.teachingAssignment.upsert({
        where: {
          teacherId_classroomId_academicYearId: {
            teacherId: toTeacherId,
            classroomId,
            academicYearId: academicYear.id,
          },
        },
        create: {
          teacherId: toTeacherId,
          classroomId,
          subjectId: targetSubjectId,
          academicYearId: academicYear.id,
        },
        update: { subjectId: targetSubjectId, isActive: true, startsAt: new Date(), endsAt: null },
      });
      await tx.classroom.update({
        where: { id: classroomId },
        data: {
          teacherId: toTeacherId,
          subjectId: targetSubjectId,
          academicYearId: academicYear.id,
        },
      });
      await tx.timetableSlot.updateMany({
        where: { classroomId, isArchived: false },
        data: { teacherId: toTeacherId, subjectId: targetSubjectId },
      });
    });

    await this.logAudit({
      actorId,
      actorName: actor.name,
      actorRole: actor.role,
      targetTeacherId: toTeacherId,
      targetTeacherName: toTeacher.name,
      action: 'REASSIGN_SUBJECT',
      subjectId: targetSubjectId,
      subjectName,
      classroomId,
      classroomName: classroom.name,
      details: `Reassigned ${subjectName} (${classroom.name}) from ${fromTeacher.name} to ${toTeacher.name}.`,
      reason: reason || 'Administrative workload rebalancing',
    });

    // Notify both teachers
    await notificationService.dispatchNotification({
      recipientId: fromTeacherId,
      senderId: actorId,
      senderName: actor.name,
      senderRole: 'admin',
      title: 'Subject Reassigned',
      body: `Your assignment for ${subjectName} in ${classroom.name} has been reassigned to ${toTeacher.name}.`,
      category: 'ACADEMIC',
      severity: 'normal',
      type: 'general',
    });

    await notificationService.dispatchNotification({
      recipientId: toTeacherId,
      senderId: actorId,
      senderName: actor.name,
      senderRole: 'admin',
      title: 'New Subject Classroom Assigned',
      body: `You have been assigned as the lead teacher for ${subjectName} in ${classroom.name} (previously taught by ${fromTeacher.name}).`,
      category: 'ACADEMIC',
      severity: 'high',
      type: 'general',
    });

    await cacheService.invalidate('lms:users', 'lms:classrooms');
    return { status: 'success', classroomId, fromTeacherId, toTeacherId };
  }

  /**
   * Filter and evaluate eligible substitute teachers based on:
   * 1. Subject qualification (has TeacherSubject for target subject)
   * 2. Availability (no conflicting timetable/substitute duty on that date & timeSlot)
   * 3. Workload (number of active duties/classrooms on that date)
   */
  public async getEligibleSubstitutes(
    actorId: string,
    classroomId: string,
    subjectId: string,
    date: string,
    timeSlot: string,
  ): Promise<EligibleSubstituteTeacher[]> {
    const actor = await this.requireAdmin(actorId);
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, schoolId: actor.schoolId, isArchived: false },
      include: { subjectRef: true },
    });
    if (!classroom) throw new Error('Classroom not found in your school.');
    const dutyDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(dutyDate.getTime())) throw new Error('A valid duty date is required.');
    const [startTime, endTime] = timeSlot.split(' - ').map((value) => value.trim());
    if (!startTime || !endTime) throw new Error('Time slot must match a scheduled period.');
    const scheduledPeriod = await prisma.timetableSlot.findFirst({
      where: {
        classroomId,
        schoolId: actor.schoolId,
        dayOfWeek: dutyDate.getDay(),
        startTime,
        endTime,
        isArchived: false,
      },
    });
    if (!scheduledPeriod)
      throw new Error('The selected period is not in this classroom timetable.');
    const targetSubjectId = subjectId || classroom?.subjectId;
    const subject = targetSubjectId
      ? await prisma.subject.findUnique({ where: { id: targetSubjectId } })
      : null;
    const subjectName = subject?.name || classroom?.subjectRef.name || '';

    // Fetch all active teachers
    const teachers = await prisma.user.findMany({
      where: { role: 'teacher', schoolId: actor.schoolId, isArchived: false },
      include: {
        teacherSubjects: { include: { subject: true } },
        taughtClassrooms: true,
        assignedSubstitutes: {
          where: { date, status: { in: ['APPROVED', 'PENDING'] } },
        },
        teacherAbsencesSubmitted: {
          where: { status: { in: ['approved', 'pending'] } },
        },
        timetableSlots: {
          where: {
            academicYearId: scheduledPeriod.academicYearId,
            dayOfWeek: scheduledPeriod.dayOfWeek,
            periodNumber: scheduledPeriod.periodNumber,
            isArchived: false,
          },
          select: { id: true },
        },
      },
    });

    const candidates: EligibleSubstituteTeacher[] = teachers.map((teacher) => {
      // 1. Qualification Check
      const isQualified = teacher.teacherSubjects.some(
        (ts) =>
          ts.subjectId === targetSubjectId ||
          ts.subject.name.toLowerCase() === subjectName.toLowerCase(),
      );

      // 2. Availability Check
      let isAvailable = true;
      let rejectionReason: string | undefined;

      // Check if teacher has approved or pending leave covering date
      const isOnLeave = teacher.teacherAbsencesSubmitted.some((abs) => {
        const startStr = abs.startDate.toISOString().split('T')[0];
        const endStr = abs.endDate.toISOString().split('T')[0];
        return date >= startStr && date <= endStr;
      });
      if (isOnLeave) {
        isAvailable = false;
        rejectionReason = 'Teacher is on approved/pending leave';
      }

      // Check if teacher already has substitute duty at exact timeSlot
      const hasConflictDuty = teacher.assignedSubstitutes.some((sub) => sub.timeSlot === timeSlot);
      if (isAvailable && hasConflictDuty) {
        isAvailable = false;
        rejectionReason = `Schedule conflict on ${date} at ${timeSlot}`;
      }
      if (isAvailable && teacher.timetableSlots.length > 0) {
        isAvailable = false;
        rejectionReason = `Teacher already has a scheduled class during period ${scheduledPeriod.periodNumber}`;
      }

      // 3. Workload Score
      const currentWorkload = teacher.taughtClassrooms.length + teacher.assignedSubstitutes.length;

      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        teacherAvatar: teacher.avatar,
        isQualified,
        isAvailable,
        currentWorkload,
        rejectionReason,
      };
    });

    // Sort candidates: Qualified & Available first, then by lower workload
    return candidates.sort((a, b) => {
      if (a.isQualified && a.isAvailable && (!b.isQualified || !b.isAvailable)) return -1;
      if (b.isQualified && b.isAvailable && (!a.isQualified || !a.isAvailable)) return 1;
      return a.currentWorkload - b.currentWorkload;
    });
  }

  /**
   * Submit a substitute teacher request
   */
  public async createSubstituteRequest(data: {
    classroomId: string;
    subjectId: string;
    date: string;
    timeSlot: string;
    originalTeacherId: string;
    suggestedSubstituteId?: string;
    reason: string;
    teacherAbsenceRequestId?: string;
    createdByAdminId: string;
  }): Promise<SubstituteRequest> {
    const adminId = data.createdByAdminId;
    const admin = await this.requireAdmin(adminId);
    const classroom = await prisma.classroom.findFirst({
      where: { id: data.classroomId, schoolId: admin.schoolId, isArchived: false },
      include: { subjectRef: true },
    });
    if (!classroom) throw new Error('Classroom not found.');

    const subject = await prisma.subject.findFirst({
      where: {
        id: data.subjectId || classroom.subjectId,
        schoolId: admin.schoolId,
        isArchived: false,
      },
    });
    const originalTeacher = await prisma.user.findFirst({
      where: {
        id: data.originalTeacherId || classroom.teacherId,
        role: 'teacher',
        schoolId: admin.schoolId,
      },
    });
    if (!originalTeacher) throw new Error('Original teacher not found.');

    let suggestedSubstitute: { id: string; name: string } | null = null;
    if (data.suggestedSubstituteId) {
      suggestedSubstitute = await prisma.user.findFirst({
        where: {
          id: data.suggestedSubstituteId,
          role: 'teacher',
          schoolId: admin.schoolId,
          isArchived: false,
        },
        select: { id: true, name: true },
      });
    }

    // Check if active substitute request already exists for this classroom, date, timeSlot & original teacher
    const existing = await prisma.substituteRequest.findFirst({
      where: {
        classroomId: data.classroomId,
        date: data.date,
        timeSlot: data.timeSlot,
        originalTeacherId: originalTeacher.id,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      include: {
        classroom: true,
        subject: true,
        originalTeacher: true,
        suggestedSubstitute: true,
        assignedSubstitute: true,
        createdByAdmin: true,
      },
    });

    if (existing) {
      const updatedExisting = await prisma.substituteRequest.update({
        where: { id: existing.id },
        data: {
          teacherAbsenceRequestId: data.teacherAbsenceRequestId || existing.teacherAbsenceRequestId,
          suggestedSubstituteId: suggestedSubstitute?.id || existing.suggestedSubstituteId,
          assignedSubstituteId: suggestedSubstitute?.id || existing.assignedSubstituteId,
          reason: data.reason || existing.reason,
        },
        include: {
          classroom: true,
          subject: true,
          originalTeacher: true,
          suggestedSubstitute: true,
          assignedSubstitute: true,
          createdByAdmin: true,
        },
      });
      return this.mapSubstituteRequest(updatedExisting);
    }

    const created = await prisma.substituteRequest.create({
      data: {
        teacherAbsenceRequestId: data.teacherAbsenceRequestId || null,
        classroomId: data.classroomId,
        subjectId: subject?.id || classroom.subjectId,
        date: data.date,
        timeSlot: data.timeSlot,
        originalTeacherId: originalTeacher.id,
        suggestedSubstituteId: suggestedSubstitute?.id || null,
        assignedSubstituteId: suggestedSubstitute?.id || null,
        reason: data.reason.trim(),
        status: 'PENDING',
        createdByAdminId: adminId,
      },
      include: {
        classroom: true,
        subject: true,
        originalTeacher: true,
        suggestedSubstitute: true,
        assignedSubstitute: true,
        createdByAdmin: true,
      },
    });

    await this.logAudit({
      actorId: adminId,
      actorName: admin.name,
      actorRole: admin?.role || 'admin',
      targetTeacherId: originalTeacher.id,
      targetTeacherName: originalTeacher.name,
      action: 'REQUEST_SUBSTITUTE',
      subjectId: created.subjectId,
      subjectName: created.subject.name,
      classroomId: created.classroomId,
      classroomName: created.classroom.name,
      details: `Requested substitute teacher for ${created.classroom.name} on ${data.date} (${data.timeSlot}).`,
      reason: data.reason,
    });

    // Send notifications
    if (suggestedSubstitute) {
      await notificationService.dispatchNotification({
        recipientId: suggestedSubstitute.id,
        senderId: adminId,
        senderName: admin.name,
        senderRole: 'admin',
        title: '📍 Substitute Duty Requested',
        body: `You are requested as substitute teacher for ${created.classroom.name} (${created.subject.name}) on ${data.date} at ${data.timeSlot}.`,
        category: 'ACADEMIC',
        severity: 'high',
        type: 'general',
      });
    }

    return this.mapSubstituteRequest(created);
  }

  /**
   * Admin Approve / Reject substitute request assignment
   */
  public async updateSubstituteRequestStatus(
    requestId: string,
    status: SubstituteRequestStatus,
    actorId: string,
    responseNotes?: string,
    assignedSubstituteId?: string,
  ): Promise<SubstituteRequest> {
    const actor = await prisma.user.findUnique({ where: { id: actorId } });
    const currentReq = await prisma.substituteRequest.findUnique({
      where: { id: requestId },
      include: { classroom: true, subject: true, originalTeacher: true },
    });
    if (!currentReq) throw new Error('Substitute request not found.');
    if (!actor || actor.isArchived || !['admin', 'teacher'].includes(actor.role))
      throw new Error('An active administrator or teacher account is required.');
    if (currentReq.classroom.schoolId !== actor.schoolId)
      throw new Error("You cannot update another school's substitute request.");

    const targetSubId =
      assignedSubstituteId || currentReq.suggestedSubstituteId || currentReq.assignedSubstituteId;
    if (actor.role === 'teacher') {
      if (targetSubId !== actor.id)
        throw new Error('Teachers may only respond to substitute requests assigned to them.');
      if (!['APPROVED', 'REJECTED'].includes(status))
        throw new Error('Teachers may only accept or reject a substitute request.');
    }

    const updated = await prisma.substituteRequest.update({
      where: { id: requestId },
      data: {
        status,
        responseNotes,
        ...(targetSubId && { assignedSubstituteId: targetSubId }),
      },
      include: {
        classroom: true,
        subject: true,
        originalTeacher: true,
        suggestedSubstitute: true,
        assignedSubstitute: true,
        createdByAdmin: true,
      },
    });

    const action = status === 'APPROVED' ? 'APPROVE_SUBSTITUTE' : 'REJECT_SUBSTITUTE';
    const assignedSubName = updated.assignedSubstitute?.name || 'Unassigned';

    await this.logAudit({
      actorId,
      actorName: actor.name,
      actorRole: actor.role,
      targetTeacherId: updated.originalTeacherId,
      targetTeacherName: updated.originalTeacher.name,
      action,
      subjectId: updated.subjectId,
      subjectName: updated.subject.name,
      classroomId: updated.classroomId,
      classroomName: updated.classroom.name,
      details: `${status} substitute assignment (${assignedSubName}) for ${updated.classroom.name} on ${updated.date}.`,
      reason: responseNotes,
    });

    // Dispatch dual notifications to both teachers
    await notificationService.dispatchNotification({
      recipientId: updated.originalTeacherId,
      senderId: actorId,
      senderName: actor.name,
      senderRole: actor.role,
      title: `Substitute Request ${status}`,
      body: `Your substitute request for ${updated.classroom.name} on ${updated.date} is now ${status}. Substitute Teacher: ${assignedSubName}.`,
      category: 'ACADEMIC',
      severity: status === 'APPROVED' ? 'normal' : 'high',
      type: 'general',
    });

    if (updated.assignedSubstituteId) {
      await notificationService.dispatchNotification({
        recipientId: updated.assignedSubstituteId,
        senderId: actorId,
        senderName: actor.name,
        senderRole: actor.role,
        title: `Substitute Duty ${status}`,
        body: `You are confirmed as substitute teacher for ${updated.classroom.name} (${updated.subject.name}) on ${updated.date} at ${updated.timeSlot}.`,
        category: 'ACADEMIC',
        severity: 'urgent',
        type: 'general',
      });
    }

    return this.mapSubstituteRequest(updated);
  }

  /**
   * Fetch list of substitute requests
   */
  public async getSubstituteRequests(
    actorId: string,
    teacherId?: string,
  ): Promise<SubstituteRequest[]> {
    const actor = await prisma.user.findFirst({
      where: { id: actorId, role: { in: ['teacher', 'admin'] }, isArchived: false },
      select: { id: true, role: true, schoolId: true },
    });
    if (!actor) throw new Error('An active teacher or administrator account is required.');
    const scopedTeacherId = actor.role === 'teacher' ? actor.id : teacherId;
    if (teacherId && actor.role === 'teacher' && teacherId !== actor.id)
      throw new Error("Teachers cannot view another teacher's substitute requests.");
    const where: any = { classroom: { schoolId: actor.schoolId } };
    if (scopedTeacherId) {
      where.OR = [
        { originalTeacherId: scopedTeacherId },
        { assignedSubstituteId: scopedTeacherId },
        { suggestedSubstituteId: scopedTeacherId },
      ];
    }

    const list = await prisma.substituteRequest.findMany({
      where,
      include: {
        classroom: true,
        subject: true,
        originalTeacher: true,
        suggestedSubstitute: true,
        assignedSubstitute: true,
        createdByAdmin: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((item) => this.mapSubstituteRequest(item));
  }

  /**
   * Fetch list of teacher absence requests
   */
  public async getTeacherAbsenceRequests(
    actorId: string,
    teacherId?: string,
  ): Promise<TeacherAbsenceRequest[]> {
    const actor = await prisma.user.findFirst({
      where: { id: actorId, role: { in: ['teacher', 'admin'] }, isArchived: false },
      select: { id: true, role: true, schoolId: true },
    });
    if (!actor) throw new Error('An active teacher or administrator account is required.');
    if (teacherId && actor.role === 'teacher' && teacherId !== actor.id)
      throw new Error("Teachers cannot view another teacher's leave requests.");
    const where: any = {
      teacher: { schoolId: actor.schoolId },
      ...(actor.role === 'teacher' || teacherId
        ? { teacherId: actor.role === 'teacher' ? actor.id : teacherId }
        : {}),
    };

    const list = await prisma.teacherAbsenceRequest.findMany({
      where,
      include: { teacher: true, reviewedByAdmin: true },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((item) => ({
      id: item.id,
      teacherId: item.teacherId,
      teacherName: item.teacher.name,
      teacherAvatar: item.teacher.avatar,
      startDate: item.startDate.toISOString().split('T')[0],
      endDate: item.endDate.toISOString().split('T')[0],
      reason: item.reason,
      status: item.status as TeacherAbsenceStatus,
      reviewedByAdminId: item.reviewedByAdminId || undefined,
      reviewedByAdminName: item.reviewedByAdmin?.name || undefined,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  /**
   * Fetch assignment audit history logs
   */
  public async getAssignmentAuditLogs(
    actorId: string,
    targetTeacherId?: string,
  ): Promise<TeacherAssignmentAuditLog[]> {
    const actor = await this.requireAdmin(actorId);
    if (targetTeacherId) {
      const target = await prisma.user.findFirst({
        where: { id: targetTeacherId, role: 'teacher', schoolId: actor.schoolId },
        select: { id: true },
      });
      if (!target) throw new Error('Teacher was not found in your school.');
    }
    const where: any = {
      actor: { schoolId: actor.schoolId },
      ...(targetTeacherId ? { targetTeacherId } : {}),
    };

    const list = await prisma.teacherAssignmentAuditLog.findMany({
      where,
      include: { actor: true, targetTeacher: true, subject: true, classroom: true },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((log) => ({
      id: log.id,
      actorId: log.actorId,
      actorName: log.actor.name,
      actorRole: log.actor.role,
      targetTeacherId: log.targetTeacherId,
      targetTeacherName: log.targetTeacher.name,
      action: log.action as AssignmentAuditLogAction,
      subjectId: log.subjectId || undefined,
      subjectName: log.subject?.name || undefined,
      classroomId: log.classroomId || undefined,
      classroomName: log.classroom?.name || undefined,
      details: log.details,
      reason: log.reason || undefined,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  private async logAudit(data: {
    actorId: string;
    actorName: string;
    actorRole: string;
    targetTeacherId: string;
    targetTeacherName: string;
    action: AssignmentAuditLogAction;
    subjectId?: string;
    subjectName?: string;
    classroomId?: string;
    classroomName?: string;
    details: string;
    reason?: string;
  }) {
    try {
      await prisma.teacherAssignmentAuditLog.create({
        data: {
          actorId: data.actorId,
          targetTeacherId: data.targetTeacherId,
          action: data.action,
          subjectId: data.subjectId || null,
          classroomId: data.classroomId || null,
          details: data.details,
          reason: data.reason || null,
        },
      });
    } catch (err) {
      logger.error('Failed to record teacher assignment audit log:', err);
    }
  }

  private mapSubstituteRequest(item: any): SubstituteRequest {
    return {
      id: item.id,
      teacherAbsenceRequestId: item.teacherAbsenceRequestId || undefined,
      classroomId: item.classroomId,
      classroomName: item.classroom.name,
      subjectId: item.subjectId,
      subjectName: item.subject.name,
      date: item.date,
      timeSlot: item.timeSlot,
      originalTeacherId: item.originalTeacherId,
      originalTeacherName: item.originalTeacher.name,
      suggestedSubstituteId: item.suggestedSubstituteId || undefined,
      suggestedSubstituteName: item.suggestedSubstitute?.name || undefined,
      assignedSubstituteId: item.assignedSubstituteId || undefined,
      assignedSubstituteName: item.assignedSubstitute?.name || undefined,
      reason: item.reason,
      status: item.status as SubstituteRequestStatus,
      responseNotes: item.responseNotes || undefined,
      createdByAdminId: item.createdByAdminId,
      createdByAdminName: item.createdByAdmin.name,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt?.toISOString(),
    };
  }
}

export const teacherAssignmentService = new TeacherAssignmentService();
