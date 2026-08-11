import { logger } from '@utils/logger';
import { prisma } from './prismaClient';
import { User, StudentProfile } from '@lms/shared';

export class UserService {
  public async getUsers(): Promise<User[]> {
    const users = await prisma.user.findMany();

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as any,
      avatar: u.avatar,
      schoolName: u.schoolName,
      gradeLevel: u.gradeLevel ?? undefined,
      section: u.section ?? undefined,
      rollNumber: u.rollNumber ?? undefined,
      childrenIds: u.childrenIds,
      subjectsTaught: u.subjectsTaught,
    }));
  }

  public async getStudentProfiles(): Promise<StudentProfile[]> {
    const profiles = await prisma.studentProfile.findMany({
      include: { user: true, badges: { include: { badgeDefinition: true } } },
    });
    return profiles.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      role: p.user.role as any,
      avatar: p.user.avatar,
      schoolName: p.user.schoolName,
      gradeLevel: p.gradeLevel,
      section: p.section,
      rollNumber: p.user.rollNumber ?? undefined,
      attendancePercentage: p.attendancePercentage,
      streakDays: p.streakDays,
      xpPoints: p.xpPoints,
      parentName: p.parentName,
      parentPhone: p.parentPhone,
      badges: p.badges.map((b) => ({
        id: b.id,
        earnedDate: b.earnedDate,
        badgeDefinitionId: b.badgeDefinitionId,
        badgeDefinition: b.badgeDefinition,
        studentProfileId: b.studentProfileId,
        assignedBy: b.assignedBy || undefined,
        remarks: b.remarks || undefined,
      })),
    }));
  }

  public async getSubjectPerformances() {
    return prisma.subjectPerformance.findMany();
  }

  public async getTermProgress() {
    return prisma.termProgress.findMany();
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
    const rollNum = data.rollNumber ? Number(data.rollNumber) : Math.floor(Math.random() * 50) + 1;

    return prisma.$transaction(async (tx) => {
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
          schoolName: data.schoolName || 'Everest International Academy',
          gradeLevel: data.gradeLevel || 8,
          section: data.section || 'A',
          rollNumber: rollNum,
        },
      });

      // 2. Create Student Profile record
      const profile = await tx.studentProfile.create({
        data: {
          user: { connect: { id: user.id } },
          attendancePercentage: data.attendancePercentage || 100,
          streakDays: data.streakDays || 1,
          xpPoints: data.xpPoints || 0,
          gradeLevel: data.gradeLevel || 8,
          section: data.section || 'A',
          parentName: data.parentName || 'Parent',
          parentPhone: data.parentPhone || '+977-9800000000',
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
          const currentChildren = existingParent.childrenIds || [];
          if (!currentChildren.includes(user.id)) {
            await tx.user.update({
              where: { id: existingParent.id },
              data: { childrenIds: [...currentChildren, user.id] },
            });
          }
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
              schoolName: data.schoolName || 'Everest International Academy',
              childrenIds: [user.id],
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
        }
      }

      return { ...user, ...profile };
    });
  }

  public async updateStudentProfile(id: string, data: any) {
    const userUpdate: any = {};
    if (data.name) userUpdate.name = data.name;
    if (data.email) userUpdate.email = data.email;
    if (data.gradeLevel) userUpdate.gradeLevel = data.gradeLevel;
    if (data.section) userUpdate.section = data.section;
    if (data.rollNumber !== undefined) userUpdate.rollNumber = data.rollNumber;
    if (data.avatar) userUpdate.avatar = data.avatar;

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.updateMany({ where: { id }, data: userUpdate });
    }

    const profileUpdate: any = {};
    if (data.gradeLevel) profileUpdate.gradeLevel = data.gradeLevel;
    if (data.section) profileUpdate.section = data.section;
    if (data.parentName) profileUpdate.parentName = data.parentName;
    if (data.parentPhone) profileUpdate.parentPhone = data.parentPhone;

    if (Object.keys(profileUpdate).length > 0) {
      await prisma.studentProfile.updateMany({ where: { id }, data: profileUpdate });
    }

    return { id, ...data };
  }

  public async deleteStudentProfile(id: string) {
    await prisma.studentProfile.deleteMany({ where: { id } });
    return prisma.user.deleteMany({ where: { id } });
  }

  public async addTeacherProfile(data: any) {
    return prisma.user.create({
      data: {
        id: data.id || `user-teach-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: 'teacher',
        avatar:
          data.avatar ||
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        schoolName: data.schoolName || 'Everest International Academy',
      },
    });
  }

  public async updateTeacherProfile(id: string, data: any) {
    const userUpdate: any = {};
    if (data.name) userUpdate.name = data.name;
    if (data.email) userUpdate.email = data.email;
    if (data.avatar) userUpdate.avatar = data.avatar;
    if (data.schoolName) userUpdate.schoolName = data.schoolName;

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.updateMany({ where: { id }, data: userUpdate });
    }
    return { id, ...data };
  }

  public async deleteTeacherProfile(id: string) {
    return prisma.user.deleteMany({ where: { id } });
  }

  public async addParentProfile(data: any) {
    return prisma.user.create({
      data: {
        id: data.id || `user-parent-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: 'parent',
        avatar:
          data.avatar ||
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        schoolName: data.schoolName || 'Everest International Academy',
      },
    });
  }

  public async deleteParentProfile(id: string) {
    return prisma.user.deleteMany({ where: { id } });
  }
}

export const userService = new UserService();
