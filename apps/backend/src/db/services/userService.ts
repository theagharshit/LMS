import { logger } from '@utils/logger';
import { prisma, readPrisma } from './prismaClient';
import { User, StudentProfile } from '@lms/shared';
import { withDeadlockRetry } from '@utils/transaction';
import { cacheService } from './cacheService';
import { normalizeCohortSelection } from '@utils/cohortValidation';
import { randomUUID } from 'node:crypto';

const normalizeOptionalPhone = (value: unknown): string | null => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const phone = String(value).trim();
  if (!/^\+?[0-9][0-9 -]{6,19}$/.test(phone)) {
    throw new Error('Secondary phone must contain 7-20 digits, spaces, or hyphens.');
  }
  return phone;
};

export class UserService {
  public async getUsers(): Promise<User[]> {
    const cached = await cacheService.get<User[]>('lms:users');
    if (cached) return cached;
    const users = await readPrisma.user.findMany({
      where: { isArchived: false },
      include: {
        schoolRef: true,
        parentLinks: true,
        teacherSubjects: { include: { subject: true } },
        teacherProfile: true,
        parentProfile: true,
        studentProfile: true,
        studentAcademicEnrollments: {
          where: { status: 'active' },
          include: { cohort: true },
          orderBy: { enrolledAt: 'desc' },
          take: 1,
        },
      },
    });

    const result: User[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as any,
      avatar: u.avatar,
      schoolName: u.schoolRef.name,
      phone: u.phone || undefined,
      secondaryPhone: u.secondaryPhone || undefined,
      gradeLevel: u.studentAcademicEnrollments[0]?.cohort.gradeLevel,
      section: u.studentAcademicEnrollments[0]?.cohort.section,
      rollNumber: u.studentAcademicEnrollments[0]?.rollNumber,
      childrenIds: u.parentLinks.filter((link) => link.isActive).map((link) => link.studentId),
      subjectsTaught: u.teacherSubjects.map((assignment) => assignment.subject.name),
      isArchived: u.isArchived,
      employeeNumber: u.teacherProfile?.employeeNumber || undefined,
      joinedAt: u.teacherProfile?.joinedAt?.toISOString(),
      employmentStatus: u.teacherProfile?.employmentStatus,
      emergencyContactName: u.teacherProfile?.emergencyContactName || undefined,
      emergencyContactPhone: u.teacherProfile?.emergencyContactPhone || undefined,
      qualification: u.teacherProfile?.qualification || undefined,
      specialization: u.teacherProfile?.specialization || undefined,
      address: u.parentProfile?.address || u.teacherProfile?.address || undefined,
      occupation: u.parentProfile?.occupation || undefined,
      verificationStatus: u.parentProfile?.verificationStatus as User['verificationStatus'],
    }));
    await cacheService.set('lms:users', result, 60);
    return result;
  }

  public async getStudentProfiles(): Promise<StudentProfile[]> {
    const cached = await cacheService.get<StudentProfile[]>('lms:student-profiles');
    if (cached) return cached;
    const profiles = await readPrisma.studentProfile.findMany({
      where: {
        isArchived: false,
        user: {
          isArchived: false,
          studentAcademicEnrollments: { some: { status: 'active' } },
        },
      },
      include: {
        user: {
          include: {
            schoolRef: {
              include: { holidays: { where: { isArchived: false }, select: { date: true } } },
            },
            guardianLinks: {
              where: { isActive: true },
              include: { parent: { include: { parentProfile: true } } },
              orderBy: { isPrimary: 'desc' },
            },
            attendanceRecords: { select: { date: true, status: true } },
            studentAcademicEnrollments: {
              where: { status: 'active' },
              include: { cohort: true },
              orderBy: { enrolledAt: 'desc' },
              take: 1,
            },
          },
        },
        badges: { include: { badgeDefinition: true, assignedBy: true } },
      },
    });
    const result = profiles.map((p) => {
      const enrollment = p.user.studentAcademicEnrollments[0];
      if (!enrollment) throw new Error(`Student ${p.user.id} has no active academic enrollment.`);
      const holidayDates = new Set(
        p.user.schoolRef.holidays.map((holiday) => holiday.date.toISOString().slice(0, 10)),
      );
      const eligibleAttendance = p.user.attendanceRecords.filter(
        (record) => !holidayDates.has(record.date),
      );
      return {
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        role: p.user.role as any,
        avatar: p.user.avatar,
        schoolName: p.user.schoolRef.name,
        gradeLevel: enrollment.cohort.gradeLevel,
        section: enrollment.cohort.section,
        rollNumber: enrollment.rollNumber,
        attendancePercentage: eligibleAttendance.length
          ? (eligibleAttendance.filter((record) => ['present', 'late'].includes(record.status))
              .length /
              eligibleAttendance.length) *
            100
          : 0,
        streakDays: p.streakDays,
        xpPoints: p.xpPoints,
        idCardPhotoUrl: p.idCardPhotoUrl || undefined,
        parentName: p.user.guardianLinks[0]?.parent.name || '',
        parentPhone: p.user.guardianLinks[0]?.parent.phone || '',
        parentSecondaryPhone: p.user.guardianLinks[0]?.parent.secondaryPhone || undefined,
        parentEmail: p.user.guardianLinks[0]?.parent.email || undefined,
        parentAddress: p.user.guardianLinks[0]?.parent.parentProfile?.address || undefined,
        parentOccupation: p.user.guardianLinks[0]?.parent.parentProfile?.occupation || undefined,
        relationship: p.user.guardianLinks[0]?.relationship || undefined,
        admissionNumber: p.admissionNumber || undefined,
        admittedAt: p.admittedAt.toISOString().slice(0, 10),
        leftAt: p.leftAt?.toISOString().slice(0, 10),
        dob: p.dateOfBirth?.toISOString().slice(0, 10),
        gender: p.gender || undefined,
        bloodGroup: p.bloodGroup || undefined,
        medicalNotes: p.medicalNotes || undefined,
        badges: p.badges.map((b) => ({
          id: b.id,
          earnedDate: b.earnedDate,
          badgeDefinitionId: b.badgeDefinitionId,
          badgeDefinition: b.badgeDefinition,
          studentProfileId: b.studentProfileId,
          assignedBy: b.assignedBy?.name || 'System',
          remarks: b.remarks || undefined,
        })),
      };
    });
    await cacheService.set('lms:student-profiles', result, 60);
    return result;
  }

  public async getSubjectPerformances() {
    const performances = await prisma.subjectPerformance.findMany({
      include: { subjectRef: { select: { name: true } } },
    });
    return performances.map(({ subjectRef, ...performance }) => ({
      ...performance,
      subject: subjectRef.name,
    }));
  }

  public async getTermProgress() {
    const progress = await prisma.termProgress.findMany({
      include: { termRef: { select: { name: true, sequence: true } } },
      orderBy: [{ studentId: 'asc' }, { termRef: { sequence: 'asc' } }],
    });
    return progress.map(({ termRef, ...entry }) => ({
      ...entry,
      term: termRef.name,
    }));
  }

  public async getStudentActivities() {
    return prisma.studentActivity.findMany();
  }

  public async addStudentProfile(data: any) {
    logger.log('[UserService] Processing addStudentProfile payload:', data);
    const studentUserId = data.id || `user-stu-${randomUUID()}`;
    const studentName = String(data.name || data.studentName || '').trim();
    const studentEmail = String(data.email || '')
      .trim()
      .toLowerCase();
    if (!studentName || !studentEmail) throw new Error('Student name and email are required.');
    if (data.gradeLevel === undefined || data.section === undefined)
      throw new Error('Student grade and section are required.');
    const { gradeLevel, section } = normalizeCohortSelection(data.gradeLevel, data.section);
    const actorSchool = data.createdById
      ? await prisma.user.findUnique({
          where: { id: data.createdById },
          include: { schoolRef: { select: { name: true } } },
        })
      : null;
    const schoolName = actorSchool?.schoolRef.name || data.schoolName;
    if (!schoolName) throw new Error('schoolName is required.');

    const created = await withDeadlockRetry(() =>
      prisma.$transaction(async (tx) => {
        const school = await tx.school.upsert({
          where: { name: schoolName },
          update: {},
          create: { name: schoolName },
        });
        const cohort = await tx.academicCohort.upsert({
          where: { schoolId_gradeLevel_section: { schoolId: school.id, gradeLevel, section } },
          update: {},
          create: { schoolId: school.id, gradeLevel, section },
        });
        let academicYear = data.academicYearId
          ? await tx.academicYear.findFirst({
              where: { id: data.academicYearId, schoolId: school.id, isArchived: false },
            })
          : await tx.academicYear.findFirst({
              where: { schoolId: school.id, isActive: true, isArchived: false },
              orderBy: { startsAt: 'desc' },
            });
        if (data.academicYearId && !academicYear)
          throw new Error('Academic year not found for this school.');
        if (!academicYear) {
          const year = new Date().getUTCFullYear();
          academicYear = await tx.academicYear.create({
            data: {
              schoolId: school.id,
              name: String(year),
              startsAt: new Date(Date.UTC(year, 0, 1)),
              endsAt: new Date(Date.UTC(year, 11, 31)),
              isActive: true,
            },
          });
        }
        const rollAggregate = await tx.studentAcademicEnrollment.aggregate({
          where: { academicYearId: academicYear.id, cohortId: cohort.id },
          _max: { rollNumber: true },
        });
        const requestedRollNumber =
          data.rollNumber === undefined || data.rollNumber === null
            ? undefined
            : Number(data.rollNumber);
        if (
          requestedRollNumber !== undefined &&
          (!Number.isInteger(requestedRollNumber) || requestedRollNumber < 1)
        )
          throw new Error('Roll number must be a positive integer.');
        const rollNum = requestedRollNumber ?? (rollAggregate._max.rollNumber || 0) + 1;
        const rollNumberTaken = await tx.studentAcademicEnrollment.findFirst({
          where: {
            academicYearId: academicYear.id,
            cohortId: cohort.id,
            rollNumber: rollNum,
          },
          select: { id: true },
        });
        if (rollNumberTaken)
          throw new Error('A student with this roll number already exists in this cohort.');
        // 1. Create Student User record. Identity collisions must be resolved by
        // an administrator; silently changing the email creates an unreachable account.
        const existingStudentUser = await tx.user.findUnique({ where: { email: studentEmail } });
        if (existingStudentUser) throw new Error('Student email is already registered.');

        const user = await tx.user.create({
          data: {
            id: studentUserId,
            name: studentName,
            email: studentEmail,
            role: 'student',
            avatar: data.avatar || '',
            schoolId: school.id,
          },
        });

        // 2. Create Student Profile record
        const profile = await tx.studentProfile.create({
          data: {
            user: { connect: { id: user.id } },
            streakDays: data.streakDays ?? 0,
            xpPoints: data.xpPoints ?? 0,
            admissionNumber: data.admissionNumber || null,
            admittedAt: data.admittedAt ? new Date(data.admittedAt) : new Date(),
            dateOfBirth: data.dob ? new Date(data.dob) : null,
            gender: data.gender || null,
            bloodGroup: data.bloodGroup || null,
            medicalNotes: data.medicalNotes || null,
          },
        });

        // 3. Create default NotificationPreference for student atomically
        await tx.notificationPreference.create({
          data: {
            userId: user.id,
            enableAcademic: true,
            enableCommunication: true,
            enableReminders: true,
          },
        });
        await tx.parentControlSettings.create({
          data: {
            studentId: user.id,
            allowTeacherDirectChat: true,
            allowPeerDiscussion: false,
            missingHomeworkAlerts: true,
            lowAttendanceAlerts: true,
            weeklyDigestEmail: true,
            screenTimeLimitMinutes: 120,
            requireApprovalForOutboundMsgs: true,
            timezone: school.timezone,
          },
        });

        // 4. Create or link every guardian in the same transaction. Existing parent
        // accounts are reused, preserving one family identity across siblings.
        const guardians = Array.isArray(data.guardians)
          ? data.guardians
          : data.parentEmail
            ? [
                {
                  name: data.parentName,
                  email: data.parentEmail,
                  phone: data.parentPhone,
                  secondaryPhone: data.parentSecondaryPhone ?? data.secondaryContact,
                  relationship: data.relationship,
                  isPrimary: true,
                },
              ]
            : [];
        if (!guardians.length)
          throw new Error('At least one parent or guardian is required for enrollment.');
        for (let index = 0; index < guardians.length; index += 1) {
          const guardian = guardians[index];
          const guardianName = String(guardian.name || '').trim();
          const normalizedParentEmail = String(guardian.email || '')
            .trim()
            .toLowerCase();
          if (!guardianName) throw new Error('Every guardian must have a name.');
          if (!normalizedParentEmail) throw new Error('Every guardian must have an email address.');
          let parent = await tx.user.findUnique({ where: { email: normalizedParentEmail } });
          if (parent && (parent.role !== 'parent' || parent.schoolId !== school.id))
            throw new Error('Guardian email belongs to an incompatible account.');
          if (parent) {
            parent = await tx.user.update({
              where: { id: parent.id },
              data: {
                isArchived: false,
                name: guardianName,
                phone: guardian.phone?.trim() || parent.phone,
                secondaryPhone:
                  normalizeOptionalPhone(guardian.secondaryPhone) ?? parent.secondaryPhone,
              },
            });
          } else {
            parent = await tx.user.create({
              data: {
                id: `user-parent-${randomUUID()}`,
                name: guardianName,
                email: normalizedParentEmail,
                role: 'parent',
                avatar: guardian.avatar || '',
                schoolId: school.id,
                phone: guardian.phone?.trim() || null,
                secondaryPhone: normalizeOptionalPhone(guardian.secondaryPhone),
              },
            });
          }
          await tx.notificationPreference.upsert({
            where: { userId: parent.id },
            update: {},
            create: { userId: parent.id },
          });
          await tx.parentProfile.upsert({
            where: { userId: parent.id },
            create: {
              userId: parent.id,
              address: guardian.address || data.parentAddress || null,
              occupation: guardian.occupation || data.parentOccupation || null,
              verificationStatus:
                guardian.verificationStatus || data.verificationStatus || 'pending',
            },
            update: {
              ...(guardian.address || data.parentAddress
                ? { address: guardian.address || data.parentAddress }
                : {}),
              ...(guardian.occupation || data.parentOccupation
                ? { occupation: guardian.occupation || data.parentOccupation }
                : {}),
            },
          });
          await tx.parentStudent.upsert({
            where: { parentId_studentId: { parentId: parent.id, studentId: user.id } },
            update: {
              isActive: true,
              endedAt: null,
              relationship: guardian.relationship || 'guardian',
              isPrimary: guardian.isPrimary ?? index === 0,
            },
            create: {
              parentId: parent.id,
              studentId: user.id,
              relationship: guardian.relationship || 'guardian',
              isPrimary: guardian.isPrimary ?? index === 0,
            },
          });
        }

        // 5. Establish the student's dated academic lifecycle and automatically
        // enroll them in every active subject classroom belonging to the cohort.
        await tx.studentAcademicEnrollment.create({
          data: {
            studentId: user.id,
            cohortId: cohort.id,
            academicYearId: academicYear.id,
            rollNumber: rollNum,
          },
        });
        const cohortClassrooms = await tx.classroom.findMany({
          where: {
            cohortId: cohort.id,
            isArchived: false,
            OR: [{ academicYearId: academicYear.id }, { academicYearId: null }],
          },
          include: {
            _count: { select: { enrollments: { where: { isActive: true } } } },
          },
        });
        for (const classroom of cohortClassrooms) {
          if (classroom._count.enrollments >= classroom.maxCapacity)
            throw new Error(`Classroom ${classroom.name} has reached capacity.`);
          await tx.classroomEnrollment.create({
            data: { classroomId: classroom.id, studentId: user.id },
          });
        }
        await tx.studentLifecycleEvent.create({
          data: {
            studentId: user.id,
            type: 'enrolled',
            toCohortId: cohort.id,
            academicYearId: academicYear.id,
            createdById: data.createdById,
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          schoolName,
          gradeLevel,
          section,
          rollNumber: rollNum,
          attendancePercentage: 0,
          streakDays: profile.streakDays,
          xpPoints: profile.xpPoints,
          badges: [],
          admissionNumber: profile.admissionNumber || undefined,
          admittedAt: profile.admittedAt.toISOString(),
          dateOfBirth: profile.dateOfBirth?.toISOString(),
          gender: profile.gender || undefined,
          bloodGroup: profile.bloodGroup || undefined,
          medicalNotes: profile.medicalNotes || undefined,
          parentName: guardians[0]?.name,
          parentPhone: guardians[0]?.phone,
          parentSecondaryPhone: guardians[0]?.secondaryPhone,
          parentEmail: guardians[0]?.email,
          academicYearId: academicYear.id,
        };
      }),
    );
    await cacheService.invalidate('lms:users', 'lms:student-profiles');
    return created;
  }

  public async updateStudentProfile(id: string, data: any) {
    const current = await prisma.studentProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      include: {
        user: {
          include: {
            studentAcademicEnrollments: {
              where: { status: 'active' },
              include: { cohort: true },
              orderBy: { enrolledAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!current) throw new Error('Student profile not found.');
    const activeEnrollment = current.user.studentAcademicEnrollments[0];
    if (!activeEnrollment) throw new Error('Student has no active academic enrollment.');
    if (
      (data.gradeLevel !== undefined &&
        Number(data.gradeLevel) !== activeEnrollment.cohort.gradeLevel) ||
      (data.section !== undefined &&
        String(data.section).trim().toUpperCase() !== activeEnrollment.cohort.section)
    ) {
      throw new Error('Use the student promotion lifecycle endpoint to change grade or section.');
    }
    const userUpdate: any = {};
    if (data.name) userUpdate.name = data.name;
    if (data.email) userUpdate.email = String(data.email).trim().toLowerCase();
    if (data.avatar !== undefined) userUpdate.avatar = data.avatar || '';

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({ where: { id: current.userId }, data: userUpdate });
    }

    const profileUpdate: any = {};
    let newRollNumber: number | undefined;
    if (data.rollNumber !== undefined) {
      const rollNumber = Number(data.rollNumber);
      if (!Number.isInteger(rollNumber) || rollNumber <= 0)
        throw new Error('Roll number must be a positive integer.');
      newRollNumber = rollNumber;
    }
    if (data.idCardPhotoUrl !== undefined)
      profileUpdate.idCardPhotoUrl = data.idCardPhotoUrl || null;
    if (data.admissionNumber !== undefined)
      profileUpdate.admissionNumber = data.admissionNumber || null;
    if (data.admittedAt !== undefined) profileUpdate.admittedAt = new Date(data.admittedAt);
    if (data.dob !== undefined) profileUpdate.dateOfBirth = data.dob ? new Date(data.dob) : null;
    if (data.gender !== undefined) profileUpdate.gender = data.gender || null;
    if (data.bloodGroup !== undefined) profileUpdate.bloodGroup = data.bloodGroup || null;
    if (data.medicalNotes !== undefined) profileUpdate.medicalNotes = data.medicalNotes || null;

    if (Object.keys(profileUpdate).length > 0 || newRollNumber !== undefined) {
      try {
        await prisma.$transaction(async (tx) => {
          if (Object.keys(profileUpdate).length > 0)
            await tx.studentProfile.updateMany({
              where: { OR: [{ id }, { userId: id }] },
              data: profileUpdate,
            });
          if (newRollNumber !== undefined)
            await tx.studentAcademicEnrollment.update({
              where: { id: activeEnrollment.id },
              data: { rollNumber: newRollNumber },
            });
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          throw new Error('A student with this roll number already exists in this cohort.');
        }
        throw error;
      }
    }

    if (
      data.parentName !== undefined ||
      data.parentEmail !== undefined ||
      data.parentPhone !== undefined ||
      data.parentSecondaryPhone !== undefined ||
      data.parentAddress !== undefined ||
      data.parentOccupation !== undefined
    ) {
      const guardian = await prisma.parentStudent.findFirst({
        where: { studentId: current.userId, isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        select: { parentId: true },
      });
      if (!guardian) throw new Error('The student has no active primary guardian to update.');
      await prisma.user.update({
        where: { id: guardian.parentId },
        data: {
          ...(data.parentName !== undefined && { name: String(data.parentName).trim() }),
          ...(data.parentEmail !== undefined && {
            email: String(data.parentEmail).trim().toLowerCase(),
          }),
          ...(data.parentPhone !== undefined && {
            phone: String(data.parentPhone).trim() || null,
          }),
          ...(data.parentSecondaryPhone !== undefined && {
            secondaryPhone: normalizeOptionalPhone(data.parentSecondaryPhone),
          }),
        },
      });
      if (data.parentAddress !== undefined || data.parentOccupation !== undefined) {
        await prisma.parentProfile.upsert({
          where: { userId: guardian.parentId },
          create: {
            userId: guardian.parentId,
            address: String(data.parentAddress || '').trim() || null,
            occupation: String(data.parentOccupation || '').trim() || null,
          },
          update: {
            ...(data.parentAddress !== undefined && {
              address: String(data.parentAddress || '').trim() || null,
            }),
            ...(data.parentOccupation !== undefined && {
              occupation: String(data.parentOccupation || '').trim() || null,
            }),
          },
        });
      }
    }

    await cacheService.invalidate('lms:users', 'lms:student-profiles');

    const updated = (await this.getStudentProfiles()).find(
      (profile) => profile.id === current.userId,
    );
    if (!updated) throw new Error('Updated student profile could not be loaded.');
    return updated;
  }

  public async deleteStudentProfile(id: string) {
    const result = await prisma.$transaction([
      prisma.studentProfile.updateMany({
        where: { OR: [{ id }, { userId: id }] },
        data: { isArchived: true },
      }),
      prisma.user.updateMany({ where: { id }, data: { isArchived: true } }),
    ]);
    await cacheService.invalidate('lms:users', 'lms:student-profiles');
    return result;
  }

  public async addTeacherProfile(data: any) {
    if (
      !String(data.phone || '').trim() ||
      !String(data.employeeNumber || '').trim() ||
      !String(data.emergencyContactName || '').trim() ||
      !String(data.emergencyContactPhone || '').trim()
    )
      throw new Error(
        'Teacher phone, employee number, emergency contact name, and emergency contact phone are required.',
      );
    const actorSchool = data.createdById
      ? await prisma.user.findUnique({
          where: { id: data.createdById },
          include: { schoolRef: { select: { name: true } } },
        })
      : null;
    const schoolName = actorSchool?.schoolRef.name || data.schoolName;
    if (!schoolName) throw new Error('schoolName is required.');
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.upsert({
        where: { name: schoolName },
        update: {},
        create: { name: schoolName },
      });
      const existingEmployee = await tx.teacherProfile.findFirst({
        where: {
          employeeNumber: String(data.employeeNumber).trim(),
          user: { schoolId: school.id },
        },
      });
      if (existingEmployee) throw new Error('Employee number already exists in this school.');
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: String(data.email).trim().toLowerCase(),
          role: 'teacher',
          avatar: data.avatar || '',
          schoolId: school.id,
          phone: String(data.phone).trim(),
          secondaryPhone: normalizeOptionalPhone(data.secondaryPhone),
        },
      });
      const teacherProfile = await tx.teacherProfile.create({
        data: {
          userId: user.id,
          employeeNumber: String(data.employeeNumber).trim(),
          joinedAt: data.joinedAt ? new Date(data.joinedAt) : new Date(),
          address: data.address || null,
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: data.emergencyContactPhone || null,
          qualification: data.qualification || null,
          specialization: data.specialization || null,
        },
      });
      for (const subjectName of data.subjectsTaught || []) {
        const subject = await tx.subject.findFirst({
          where: { schoolId: school.id, name: subjectName, isArchived: false },
        });
        if (!subject) throw new Error(`Subject ${subjectName} does not exist in this school.`);
        await tx.teacherSubject.create({ data: { teacherId: user.id, subjectId: subject.id } });
      }
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        schoolName,
        phone: user.phone || undefined,
        secondaryPhone: user.secondaryPhone || undefined,
        subjectsTaught: data.subjectsTaught || [],
        employeeNumber: data.employeeNumber || undefined,
        joinedAt: teacherProfile.joinedAt.toISOString(),
        employmentStatus: teacherProfile.employmentStatus,
        address: data.address || undefined,
        emergencyContactName: data.emergencyContactName || undefined,
        emergencyContactPhone: data.emergencyContactPhone || undefined,
        qualification: data.qualification || undefined,
        specialization: data.specialization || undefined,
      };
    });
    await cacheService.invalidate('lms:users');
    return result;
  }

  public async updateTeacherProfile(id: string, data: any) {
    const current = await prisma.user.findFirst({
      where: { id, role: 'teacher', isArchived: false },
      select: { id: true, schoolId: true },
    });
    if (!current) throw new Error('Active teacher not found.');
    const userUpdate: any = {};
    if (data.name) userUpdate.name = data.name;
    if (data.email) userUpdate.email = data.email;
    if (data.avatar) userUpdate.avatar = data.avatar;
    if (data.phone !== undefined) userUpdate.phone = data.phone || null;
    if (data.secondaryPhone !== undefined)
      userUpdate.secondaryPhone = normalizeOptionalPhone(data.secondaryPhone);

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.updateMany({ where: { id }, data: userUpdate });
    }
    const profileData = {
      ...(data.employeeNumber !== undefined && { employeeNumber: data.employeeNumber || null }),
      ...(data.joinedAt !== undefined && { joinedAt: new Date(data.joinedAt) }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.emergencyContactName !== undefined && {
        emergencyContactName: data.emergencyContactName || null,
      }),
      ...(data.emergencyContactPhone !== undefined && {
        emergencyContactPhone: data.emergencyContactPhone || null,
      }),
      ...(data.qualification !== undefined && { qualification: data.qualification || null }),
      ...(data.specialization !== undefined && { specialization: data.specialization || null }),
    };
    if (Object.keys(profileData).length)
      await prisma.teacherProfile.upsert({
        where: { userId: id },
        create: { userId: id, ...profileData },
        update: profileData,
      });
    if (Array.isArray(data.subjectsTaught)) {
      const subjectNames = [
        ...new Set<string>(
          data.subjectsTaught.map((value: unknown) => String(value).trim()).filter(Boolean),
        ),
      ];
      const subjects = await prisma.subject.findMany({
        where: { schoolId: current.schoolId, name: { in: subjectNames }, isArchived: false },
      });
      if (subjects.length !== subjectNames.length)
        throw new Error('Every assigned subject must already exist in this school.');
      const subjectIds = subjects.map((subject) => subject.id);
      const activeAssignment = await prisma.teachingAssignment.findFirst({
        where: { teacherId: id, isActive: true, subjectId: { notIn: subjectIds } },
        include: { subject: { select: { name: true } } },
      });
      if (activeAssignment)
        throw new Error(
          `Reassign ${activeAssignment.subject.name} classes before removing that subject.`,
        );
      await prisma.$transaction([
        prisma.teacherSubject.deleteMany({
          where: { teacherId: id, subjectId: { notIn: subjectIds } },
        }),
        ...subjectIds.map((subjectId) =>
          prisma.teacherSubject.upsert({
            where: { teacherId_subjectId: { teacherId: id, subjectId } },
            create: { teacherId: id, subjectId },
            update: {},
          }),
        ),
      ]);
    }
    await cacheService.invalidate('lms:users');
    const updated = (await this.getUsers()).find((user) => user.id === id);
    if (!updated) throw new Error('Updated teacher profile could not be loaded.');
    return updated;
  }

  public async deleteTeacherProfile(id: string) {
    const result = await prisma.user.updateMany({ where: { id }, data: { isArchived: true } });
    await cacheService.invalidate('lms:users');
    return result;
  }

  public async addParentProfile(data: any) {
    if (!String(data.phone || '').trim()) throw new Error('Parent phone is required.');
    const actorSchool = data.createdById
      ? await prisma.user.findUnique({
          where: { id: data.createdById },
          include: { schoolRef: { select: { name: true } } },
        })
      : null;
    const schoolName = actorSchool?.schoolRef.name || data.schoolName;
    if (!schoolName) throw new Error('schoolName is required.');
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.upsert({
        where: { name: schoolName },
        update: {},
        create: { name: schoolName },
      });
      const childrenIds = [
        ...new Set<string>(Array.isArray(data.childrenIds) ? data.childrenIds : []),
      ];
      if (childrenIds.length) {
        const childCount = await tx.user.count({
          where: {
            id: { in: childrenIds },
            schoolId: school.id,
            role: 'student',
            isArchived: false,
          },
        });
        if (childCount !== childrenIds.length)
          throw new Error('Every linked child must be an active student in this school.');
      }
      const parent = await tx.user.create({
        data: {
          id: data.id || `user-parent-${randomUUID()}`,
          name: data.name,
          email: String(data.email).trim().toLowerCase(),
          role: 'parent',
          avatar: data.avatar || '',
          schoolId: school.id,
          phone: data.phone,
          secondaryPhone: normalizeOptionalPhone(data.secondaryPhone),
        },
      });
      await tx.notificationPreference.create({ data: { userId: parent.id } });
      await tx.parentProfile.create({
        data: {
          userId: parent.id,
          address: data.address || null,
          occupation: data.occupation || null,
          verificationStatus: data.verificationStatus || 'pending',
        },
      });
      if (childrenIds.length)
        await tx.parentStudent.createMany({
          data: childrenIds.map((studentId, index) => ({
            parentId: parent.id,
            studentId,
            relationship: data.relationship || 'guardian',
            isPrimary: index === 0,
          })),
        });
      return {
        id: parent.id,
        name: parent.name,
        email: parent.email,
        role: parent.role,
        avatar: parent.avatar,
        schoolName,
        phone: parent.phone || undefined,
        secondaryPhone: parent.secondaryPhone || undefined,
        childrenIds,
        address: data.address || undefined,
        occupation: data.occupation || undefined,
        verificationStatus: data.verificationStatus || 'pending_verification',
      };
    });
    await cacheService.invalidate('lms:users');
    return result;
  }

  public async deleteParentProfile(id: string) {
    const result = await prisma.$transaction(async (tx) => {
      const parent = await tx.user.findFirst({
        where: { id, role: 'parent' },
        include: { parentLinks: { where: { isActive: true } } },
      });
      if (!parent) throw new Error('Parent not found.');
      for (const link of parent.parentLinks) {
        const otherGuardians = await tx.parentStudent.count({
          where: {
            studentId: link.studentId,
            parentId: { not: id },
            isActive: true,
            parent: { isArchived: false },
          },
        });
        if (!otherGuardians)
          throw new Error('Assign another active guardian before archiving this parent.');
      }
      await tx.parentStudent.updateMany({
        where: { parentId: id, isActive: true },
        data: { isActive: false, endedAt: new Date() },
      });
      return tx.user.update({ where: { id }, data: { isArchived: true } });
    });
    await cacheService.invalidate('lms:users');
    return result;
  }
}

export const userService = new UserService();
