import { logger } from '@utils/logger';
import { prisma, readPrisma } from './prismaClient';
import { User, StudentProfile } from '@lms/shared';
import { withDeadlockRetry } from '@utils/transaction';
import { cacheService } from './cacheService';

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
        studentProfile: { include: { cohortRef: true } },
      },
    });

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as any,
      avatar: u.avatar,
      schoolName: u.schoolRef.name,
      gradeLevel: u.studentProfile?.cohortRef.gradeLevel,
      section: u.studentProfile?.cohortRef.section,
      rollNumber: u.studentProfile?.normalizedRollNumber,
      childrenIds: u.parentLinks.map((link) => link.studentId),
      subjectsTaught: u.teacherSubjects.map((assignment) => assignment.subject.name),
      isArchived: u.isArchived,
    }));
    await cacheService.set('lms:users', result, 60);
    return result;
  }

  public async getStudentProfiles(): Promise<StudentProfile[]> {
    const cached = await cacheService.get<StudentProfile[]>('lms:student-profiles');
    if (cached) return cached;
    const profiles = await readPrisma.studentProfile.findMany({
      where: { isArchived: false, user: { isArchived: false } },
      include: {
        cohortRef: true,
        user: {
          include: {
            schoolRef: true,
            guardianLinks: { include: { parent: true }, orderBy: { isPrimary: 'desc' } },
            attendanceRecords: { select: { status: true } },
          },
        },
        badges: { include: { badgeDefinition: true, assignedBy: true } },
      },
    });
    const result = profiles.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      role: p.user.role as any,
      avatar: p.user.avatar,
      schoolName: p.user.schoolRef.name,
      gradeLevel: p.cohortRef.gradeLevel,
      section: p.cohortRef.section,
      rollNumber: p.normalizedRollNumber,
      attendancePercentage: p.user.attendanceRecords.length
        ? (p.user.attendanceRecords.filter((record) => ['present', 'late'].includes(record.status))
            .length /
            p.user.attendanceRecords.length) *
          100
        : 0,
      streakDays: p.streakDays,
      xpPoints: p.xpPoints,
      parentName: p.user.guardianLinks[0]?.parent.name || 'Parent',
      parentPhone: p.user.guardianLinks[0]?.parent.phone || '',
      badges: p.badges.map((b) => ({
        id: b.id,
        earnedDate: b.earnedDate,
        badgeDefinitionId: b.badgeDefinitionId,
        badgeDefinition: b.badgeDefinition,
        studentProfileId: b.studentProfileId,
        assignedBy: b.assignedBy?.name || 'System',
        remarks: b.remarks || undefined,
      })),
    }));
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
    console.log(JSON.stringify(data, null, 2));
    const studentUserId = data.id || `user-stu-${Date.now()}`;
    const studentName = (data.name || data.studentName || 'New Student').trim();
    const studentEmail = (data.email || `${studentUserId}@lms.com`).trim().toLowerCase();
    const gradeLevel = Number(data.gradeLevel || 8);
    const section = String(data.section || 'A');
    const schoolName = data.schoolName || 'Everest International Academy';

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
        const rollAggregate = await tx.studentProfile.aggregate({
          where: { cohortId: cohort.id, isArchived: false },
          _max: { normalizedRollNumber: true },
        });
        const rollNum = data.rollNumber
          ? Number(data.rollNumber)
          : (rollAggregate._max.normalizedRollNumber || 0) + 1;
        // 1. Create Student User record
        // Resolve unique student email if collision occurs
        let finalStudentEmail = studentEmail;
        const existingStudentUser = await tx.user.findUnique({ where: { email: studentEmail } });
        if (existingStudentUser) {
          const parts = studentEmail.split('@');
          finalStudentEmail = `${parts[0]}_${Date.now()}@${parts[1] || 'lms.com'}`;
          logger.warn(
            `[UserService] Email ${studentEmail} already registered. Generated unique email: ${finalStudentEmail}`,
          );
        }

        const user = await tx.user.create({
          data: {
            id: studentUserId,
            name: studentName,
            email: finalStudentEmail,
            role: 'student',
            avatar:
              data.avatar ||
              'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
            schoolId: school.id,
          },
        });

        // 2. Create Student Profile record
        const profile = await tx.studentProfile.create({
          data: {
            user: { connect: { id: user.id } },
            streakDays: data.streakDays || 1,
            xpPoints: data.xpPoints || 0,
            cohortRef: { connect: { id: cohort.id } },
            normalizedRollNumber: rollNum,
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

        // 4. Create or Link Parent User Account if parent email provided
        if (data.parentEmail && data.parentEmail.trim()) {
          const normalizedParentEmail = data.parentEmail.trim().toLowerCase();
          const existingParent = await tx.user.findUnique({
            where: { email: normalizedParentEmail },
          });

          if (existingParent) {
            await tx.parentStudent.upsert({
              where: { parentId_studentId: { parentId: existingParent.id, studentId: user.id } },
              update: { isPrimary: true },
              create: { parentId: existingParent.id, studentId: user.id, isPrimary: true },
            });
          } else {
            const parentUserId = `user-parent-${Date.now()}`;
            const newParent = await tx.user.create({
              data: {
                id: parentUserId,
                name: data.parentName || 'Parent',
                email: normalizedParentEmail,
                role: 'parent',
                avatar:
                  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
                schoolId: school.id,
                phone: data.parentPhone || '+977-9800000000',
              },
            });

            await tx.notificationPreference.create({
              data: {
                userId: newParent.id,
                enableAcademic: true,
                enableCommunication: true,
                enableReminders: true,
              },
            });
            await tx.parentStudent.create({
              data: { parentId: newParent.id, studentId: user.id, isPrimary: true },
            });
          }
        }

        return {
          ...user,
          ...profile,
          schoolName,
          gradeLevel,
          section,
          rollNumber: rollNum,
        };
      }),
    );
    await cacheService.invalidate('lms:users', 'lms:student-profiles');
    return created;
  }

  public async updateStudentProfile(id: string, data: any) {
    const current = await prisma.studentProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      include: { user: true, cohortRef: true },
    });
    if (!current) throw new Error('Student profile not found.');
    const userUpdate: any = {};
    if (data.name) userUpdate.name = data.name;
    if (data.email) userUpdate.email = data.email;
    if (data.avatar) userUpdate.avatar = data.avatar;

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.updateMany({ where: { id }, data: userUpdate });
    }

    const profileUpdate: any = {};
    if (data.rollNumber !== undefined) profileUpdate.normalizedRollNumber = data.rollNumber;

    if (data.gradeLevel || data.section) {
      const gradeLevel = Number(data.gradeLevel || current.cohortRef.gradeLevel);
      const section = String(data.section || current.cohortRef.section);
      const schoolId = current.user.schoolId;
      if (schoolId) {
        const cohort = await prisma.academicCohort.upsert({
          where: { schoolId_gradeLevel_section: { schoolId, gradeLevel, section } },
          update: {},
          create: { schoolId, gradeLevel, section },
        });
        profileUpdate.cohortId = cohort.id;
      }
    }

    if (Object.keys(profileUpdate).length > 0) {
      await prisma.studentProfile.updateMany({
        where: { OR: [{ id }, { userId: id }] },
        data: profileUpdate,
      });
    }

    await cacheService.invalidate('lms:users', 'lms:student-profiles');

    return { id, ...data };
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
    const schoolName = data.schoolName || 'Everest International Academy';
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.upsert({
        where: { name: schoolName },
        update: {},
        create: { name: schoolName },
      });
      const user = await tx.user.create({
        data: {
          id: data.id || `user-teach-${Date.now()}`,
          name: data.name,
          email: data.email,
          role: 'teacher',
          avatar:
            data.avatar ||
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          schoolId: school.id,
        },
      });
      for (const subjectName of data.subjectsTaught || []) {
        const subject = await tx.subject.upsert({
          where: { schoolId_name: { schoolId: school.id, name: subjectName } },
          update: {},
          create: { schoolId: school.id, name: subjectName },
        });
        await tx.teacherSubject.create({ data: { teacherId: user.id, subjectId: subject.id } });
      }
      return user;
    });
    await cacheService.invalidate('lms:users');
    return result;
  }

  public async updateTeacherProfile(id: string, data: any) {
    const userUpdate: any = {};
    if (data.name) userUpdate.name = data.name;
    if (data.email) userUpdate.email = data.email;
    if (data.avatar) userUpdate.avatar = data.avatar;
    if (data.schoolName) {
      const school = await prisma.school.upsert({
        where: { name: data.schoolName },
        update: {},
        create: { name: data.schoolName },
      });
      userUpdate.schoolId = school.id;
    }

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.updateMany({ where: { id }, data: userUpdate });
    }
    return { id, ...data };
  }

  public async deleteTeacherProfile(id: string) {
    const result = await prisma.user.updateMany({ where: { id }, data: { isArchived: true } });
    await cacheService.invalidate('lms:users');
    return result;
  }

  public async addParentProfile(data: any) {
    const schoolName = data.schoolName || 'Everest International Academy';
    const school = await prisma.school.upsert({
      where: { name: schoolName },
      update: {},
      create: { name: schoolName },
    });
    const result = await prisma.user.create({
      data: {
        id: data.id || `user-parent-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: 'parent',
        avatar:
          data.avatar ||
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        schoolId: school.id,
        phone: data.phone,
      },
    });
    await cacheService.invalidate('lms:users');
    return result;
  }

  public async deleteParentProfile(id: string) {
    const result = await prisma.user.updateMany({ where: { id }, data: { isArchived: true } });
    await cacheService.invalidate('lms:users');
    return result;
  }
}

export const userService = new UserService();
